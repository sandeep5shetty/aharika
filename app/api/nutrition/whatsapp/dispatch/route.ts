import { auth } from "@/lib/auth";
import { getUserPreferenceRow } from "@/lib/db/nutrition-queries";
import { guestRegex } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import { dispatchDueWhatsappReminder } from "@/lib/nutrition/whatsapp-job";

function isGuest(session: { user?: { type?: string; email?: string | null } }) {
  return session.user?.type === "guest" || guestRegex.test(session.user?.email ?? "");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || isGuest(session)) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const row = await getUserPreferenceRow(session.user.id);
  if (!row) return Response.json({ sent: false });

  const result = await dispatchDueWhatsappReminder(request, {
    name: session.user.name,
    preference: row,
    userId: session.user.id,
  });
  return Response.json(result);
}
