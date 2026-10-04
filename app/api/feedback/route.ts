import { z } from "zod";
import { auth } from "@/lib/auth";
import { insertUserFeedback } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const feedbackSchema = z.object({
  category: z.enum(["general", "bug", "idea"]),
  message: z.string().trim().min(10).max(2000),
});

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

  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await insertUserFeedback({
    userId: session.user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    contactEmail: session.user.email ?? null,
  });

  return Response.json({ ok: true });
}
