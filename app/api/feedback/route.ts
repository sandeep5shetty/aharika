import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { insertUserFeedback, listUserFeedback } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const feedbackSchema = z.object({
  category: z.enum(["general", "bug", "idea"]),
  message: z.string().trim().min(10).max(2000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const rows = await listUserFeedback();
  return Response.json({
    feedback: rows.map((row) => ({
      category: row.category,
      contactEmail: row.contactEmail,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      message: row.message,
    })),
  });
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
