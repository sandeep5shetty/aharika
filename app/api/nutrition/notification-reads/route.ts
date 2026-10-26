import { z } from "zod";
import { auth } from "@/lib/auth";
import { listNotificationReads, markNotificationReads } from "@/lib/db/nutrition-queries";
import { ChatbotError } from "@/lib/errors";

const markSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(80)).min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const ids = await listNotificationReads(session.user.id);
  return Response.json({ ids });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = markSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await markNotificationReads(session.user.id, parsed.data.ids);
  return Response.json({ ok: true });
}
