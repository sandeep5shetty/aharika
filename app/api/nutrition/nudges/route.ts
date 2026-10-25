import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  dismissNudge,
  getMemorySummaryRecord,
  getUserTimezone,
} from "@/lib/db/nutrition-queries";
import { ChatbotError } from "@/lib/errors";
import { readUsualMealTimes } from "@/lib/nutrition/nudge-timing";
import { getPendingNudges } from "@/lib/nutrition/scheduler";

const dismissSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (session.user.type === "guest") {
    return Response.json({ nudges: [], usualMealTimes: {} });
  }

  const timeZone = await getUserTimezone(session.user.id);
  const [nudges, memory] = await Promise.all([
    getPendingNudges(session.user.id, new Date(), timeZone),
    getMemorySummaryRecord(session.user.id),
  ]);
  return Response.json({
    nudges,
    usualMealTimes: readUsualMealTimes(memory?.summary),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.type === "guest") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = dismissSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await dismissNudge(session.user.id, parsed.data.mealType, parsed.data.date);
  return Response.json({ ok: true });
}
