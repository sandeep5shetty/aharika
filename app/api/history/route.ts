import { auth } from "@/lib/auth";
import { getChatSummariesByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { isSessionUserInDatabase } from "@/lib/session-user";

const MAX_CHATS = 30;

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!(await isSessionUserInDatabase(session.user.id))) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chats = await getChatSummariesByUserId({
    userId: session.user.id,
    limit: MAX_CHATS,
  });

  return Response.json({ chats });
}
