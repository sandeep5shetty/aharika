export const DEFAULT_MEAL_TIMES: Record<
  "breakfast" | "lunch" | "dinner",
  { hour: number; minute: number }
> = {
  breakfast: { hour: 9, minute: 0 },
  lunch: { hour: 13, minute: 30 },
  dinner: { hour: 20, minute: 30 },
};

export const NUDGE_GRACE_MINUTES = 90;

export type MealSlot = "breakfast" | "lunch" | "dinner";

export function minutesSinceMidnight(hour: number, minute: number) {
  return hour * 60 + minute;
}

export function expectedMealMinutes(
  slot: MealSlot,
  summary: Record<string, unknown> | undefined,
) {
  const usual = summary?.usualMealTimes as Record<string, unknown> | undefined;
  const fromMemory = usual?.[slot];
  if (typeof fromMemory === "string") {
    const [hour, minute] = fromMemory.split(":").map(Number);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return minutesSinceMidnight(hour, minute);
    }
  }
  const defaults = DEFAULT_MEAL_TIMES[slot];
  return minutesSinceMidnight(defaults.hour, defaults.minute);
}

export function isSlotDue(nowMinutes: number, expectedMinutes: number) {
  return nowMinutes >= expectedMinutes + NUDGE_GRACE_MINUTES;
}

export function readUsualMealTimes(summary: unknown) {
  const usual = (summary as { usualMealTimes?: unknown } | null)?.usualMealTimes;
  const times: Partial<Record<MealSlot, string>> = {};
  if (!usual || typeof usual !== "object") return times;
  for (const slot of ["breakfast", "lunch", "dinner"] as const) {
    const value = (usual as Record<string, unknown>)[slot];
    if (typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)) {
      times[slot] = value;
    }
  }
  return times;
}

export function isDismissedNudge(dismissedAt: Date | string | null | undefined) {
  return dismissedAt != null;
}

export function shouldSkipRecordedNudge(
  nudge: { dismissedAt?: Date | string | null } | undefined,
) {
  return isDismissedNudge(nudge?.dismissedAt);
}

const NUDGE_NOTIFICATION_ID = /^nudge-(\d{4}-\d{2}-\d{2})-(breakfast|lunch|dinner)$/;

export function parseNudgeNotificationId(id: string) {
  const match = NUDGE_NOTIFICATION_ID.exec(id);
  if (!match) return null;
  return {
    date: match[1],
    mealType: match[2] as MealSlot,
  };
}
