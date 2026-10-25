import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPreferenceRow, upsertUserPreferenceFields } from "@/lib/db/nutrition-queries";
import { guestRegex } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import { parseWhatsappPhone, reminderName } from "@/lib/nutrition/whatsapp";
import { sandboxConfig, sendSandboxWhatsapp } from "@/lib/nutrition/whatsapp-send";
import { activeMealSlot, zonedClock } from "@/lib/nutrition/whatsapp-schedule";

function isGuest(session: { user?: { type?: string; email?: string | null } }) {
  return session.user?.type === "guest" || guestRegex.test(session.user?.email ?? "");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const config = sandboxConfig(request);
  const row = isGuest(session) ? null : await getUserPreferenceRow(session.user.id);
  return Response.json({
    configured: config.configured,
    joinCode: config.joinCode || null,
    phone: parseWhatsappPhone(row?.whatsappPhone),
    sandboxFrom: config.from || null,
  });
}

const postSchema = z.object({
  phone: z.string().min(8).max(20),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || isGuest(session)) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = postSchema.safeParse(json);
  const phone = parseWhatsappPhone(parsed.success ? parsed.data.phone : null);
  if (!phone) {
    return Response.json(
      { message: "Enter a phone number with a country code, such as +919876543210." },
      { status: 400 },
    );
  }

  await upsertUserPreferenceFields(session.user.id, { whatsappPhone: phone });

  const row = await getUserPreferenceRow(session.user.id);
  const timeZone = row?.timezone || "Asia/Kolkata";
  const meal =
    activeMealSlot(zonedClock(new Date(), timeZone), {
      breakfast: row?.whatsappBreakfastTime,
      lunch: row?.whatsappLunchTime,
      dinner: row?.whatsappDinnerTime,
    }) ?? "breakfast";

  const sent = await sendSandboxWhatsapp(request, phone, {
    name: reminderName(session.user.name),
    meal,
  });
  if (!sent.ok) {
    return Response.json({ message: sent.message, phone }, { status: sent.status });
  }

  return Response.json({ ok: true, phone });
}
