import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getChatById,
  getMessagesByChatId,
  updateChatTitleById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { isSessionUserInDatabase } from "@/lib/session-user";
import { convertToUIMessages } from "@/lib/utils";

const patchBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
});

async function assertChatAccess(chatId: string, userId: string) {
  const chat = await getChatById({ id: chatId });
  if (!chat) {
    return new ChatbotError("not_found:chat").toResponse();
  }
  if (chat.userId !== userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!(await isSessionUserInDatabase(session.user.id))) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const denied = await assertChatAccess(id, session.user.id);
  if (denied) return denied;

  const dbMessages = await getMessagesByChatId({ id });
  const messages = convertToUIMessages(dbMessages);
  const messageAt: Record<string, number> = {};
  for (const row of dbMessages) {
    messageAt[row.id] = row.createdAt.getTime();
  }

  return Response.json({ messages, messageAt });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!(await isSessionUserInDatabase(session.user.id))) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const denied = await assertChatAccess(id, session.user.id);
  if (denied) return denied;

  let body: z.infer<typeof patchBodySchema>;
  try {
    const json = await request.json();
    const parsed = patchBodySchema.safeParse(json);
    if (!parsed.success) {
      return new ChatbotError("bad_request:api").toResponse();
    }
    body = parsed.data;
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await updateChatTitleById({ chatId: id, title: body.title });

  return Response.json({ id, title: body.title });
}
