import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  createNutritionTools,
  guestNutritionToolNames,
  nutritionToolNames,
  pickGuestNutritionTools,
} from "@/lib/ai/tools/nutrition";
import { GUEST_MAX_CHATS, GUEST_MAX_USER_MESSAGES, guestLimitResponse } from "@/lib/guest-limits";
import { isProductionEnvironment } from "@/lib/constants";
import {
  getUserTimezone,
  upsertUserTimezone,
} from "@/lib/db/nutrition-queries";
import {
  countChatsByUserId,
  countUserMessagesByUserId,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { buildNutritionContextBlock } from "@/lib/nutrition/context";
import { maybeSummarize } from "@/lib/nutrition/memory";
import {
  getUserMessageText,
  isOffTopicUserMessage,
  OFF_TOPIC_REFUSAL,
} from "@/lib/nutrition/scope";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/lib/chat-actions";
import { isSessionUserInDatabase } from "@/lib/session-user";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function isModelStreamActivity(chunk: { type: string }) {
  return !["start", "start-step", "finish-step", "finish", "raw"].includes(
    chunk.type,
  );
}

function resolveOpenAiKey() {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_API_KEY?.trim() ||
    ""
  );
}

export async function GET() {
  const key = resolveOpenAiKey();
  const model = process.env.CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  if (!key) {
    return Response.json({
      configured: false,
      provider: null,
      providerLabel: null,
      model: null,
    });
  }
  return Response.json({
    configured: true,
    provider: "openai",
    providerLabel: "OpenAI",
    model,
  });
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    const parsed = postRequestBodySchema.safeParse(json);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.error("Chat request validation failed:", parsed.error.flatten());
      }
      return new ChatbotError("bad_request:api").toResponse();
    }
    requestBody = parsed.data;
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  if (!resolveOpenAiKey()) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedVisibilityType,
      timezone,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    if (!(await isSessionUserInDatabase(session.user.id))) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    const isGuest = session.user.type === "guest";
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      if (isGuest) {
        const existingChats = await countChatsByUserId(session.user.id);
        if (existingChats >= GUEST_MAX_CHATS) {
          return guestLimitResponse("new_chat");
        }
      }
      await saveChat({
        id,
        title: "New chat",
        userId: session.user.id,
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    if (isGuest && !isToolApprovalFlow && message?.role === "user") {
      const userMessages = await countUserMessagesByUserId(session.user.id);
      if (userMessages >= GUEST_MAX_USER_MESSAGES) {
        return guestLimitResponse("message_limit");
      }
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      // The client may be ahead of Postgres until each turn finishes.
      // The client sends the full UI transcript (including tool approval states);
      // rebuilding from DB alone drops the assistant tool call and triggers
      // AI_MissingToolResultsError on the continuation request.
      uiMessages = messages as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const requestHints: RequestHints = {};

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            attachments: [],
            chatId: id,
            createdAt: new Date(),
            id: message.id,
            parts: message.parts,
            role: "user",
          },
        ],
      });
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const userTimezone = timezone ?? (await getUserTimezone(session.user.id));
    if (timezone) {
      await upsertUserTimezone(session.user.id, timezone);
    }

    const contextBlock = await buildNutritionContextBlock(session.user.id);
    const fullNutritionTools = createNutritionTools({
      chatId: id,
      session,
      timezone: userTimezone,
    });
    const nutritionTools = isGuest
      ? pickGuestNutritionTools(fullNutritionTools)
      : fullNutritionTools;
    const activeNutritionToolNames = isGuest
      ? [...guestNutritionToolNames]
      : [...nutritionToolNames];

    const latestUserMessage = uiMessages
      .filter((entry) => entry.role === "user")
      .at(-1);
    const offTopicRequest =
      !isToolApprovalFlow &&
      latestUserMessage !== undefined &&
      isOffTopicUserMessage(getUserMessageText(latestUserMessage.parts));

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const coachInstructions = systemPrompt({
          contextBlock,
          requestHints,
          supportsTools,
        });

        const instructions = offTopicRequest
          ? `${coachInstructions}\n\nOff-topic request detected. Reply ONLY with the following text. Do not include code blocks or answer the user's off-topic question:\n\n${OFF_TOPIC_REFUSAL}`
          : coachInstructions;

        const result = streamText({
          model: getLanguageModel(chatModel),
          messages: modelMessages,
          instructions,
          activeTools:
            supportsTools && !offTopicRequest
              ? (activeNutritionToolNames as (keyof typeof nutritionTools)[])
              : [],
          stopWhen: isStepCount(8),
          telemetry: {
            functionId: "stream-text",
            isEnabled: isProductionEnvironment,
          },
          ...(offTopicRequest ? {} : { tools: nutritionTools }),
        });

        dataStream.merge(
          toUIMessageStream({
            sendReasoning: isReasoningModel,
            stream: result.stream,
          }),
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: "data-chat-title" });
            updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onEnd: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          await Promise.all(
            finishedMessages.map(async (finishedMsg) => {
              const existingMsg = uiMessages.find(
                (m) => m.id === finishedMsg.id,
              );
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  parts: finishedMsg.parts,
                });
                return;
              }

              await saveMessages({
                messages: [
                  {
                    attachments: [],
                    chatId: id,
                    createdAt: new Date(),
                    id: finishedMsg.id,
                    parts: finishedMsg.parts,
                    role: finishedMsg.role,
                  },
                ],
              });
            }),
          );
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: currentMessage.id,
              parts: currentMessage.parts,
              role: currentMessage.role,
            })),
          });
          after(async () => {
            await maybeSummarize(session.user.id);
          });
        }
      },
      onError: () => "Oops, an error occurred!",
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  if (session.user.type === "guest") {
    return guestLimitResponse("delete_chat");
  }

  return Response.json(deletedChat, { status: 200 });
}
