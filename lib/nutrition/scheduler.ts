import {
  areMealNudgesEnabled,
  getMealsBetween,
  getMemorySummaryRecord,
  getNudgeForSlot,
  recordNudge,
} from "@/lib/db/nutrition-queries";
import { endOfDayInTimeZone, localDateKey, startOfDayInTimeZone } from "./day";
import {
  expectedMealMinutes,
  isSlotDue,
  shouldSkipRecordedNudge,
  type MealSlot,
} from "./nudge-timing";

function localDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function minutesSinceMidnight(hour: number, minute: number) {
  return hour * 60 + minute;
}

export type PendingNudge = {
  date: string;
  mealType: MealSlot;
  message: string;
};

/** Records at most one nudge per missed slot per day, then returns today's still-missing slots. */
export async function getPendingNudges(
  userId: string,
  now: Date,
  timeZone: string,
): Promise<PendingNudge[]> {
  if (!(await areMealNudgesEnabled(userId))) {
    return [];
  }

  const dateKey = localDateKey(now, timeZone);
  const memory = await getMemorySummaryRecord(userId);
  const summary = memory?.summary as Record<string, unknown> | undefined;
  const local = localDateParts(now, timeZone);
  const nowMinutes = minutesSinceMidnight(local.hour, local.minute);

  const mealsToday = await getMealsBetween(
    userId,
    startOfDayInTimeZone(now, timeZone),
    endOfDayInTimeZone(now, timeZone),
  );
  const loggedTypes = new Set(mealsToday.map((meal) => meal.mealType));
  const slots: MealSlot[] = ["breakfast", "lunch", "dinner"];
  const pending: PendingNudge[] = [];

  for (const slot of slots) {
    if (loggedTypes.has(slot)) continue;
    const expected = expectedMealMinutes(slot, summary);
    if (!isSlotDue(nowMinutes, expected)) continue;

    const existing = await getNudgeForSlot(userId, slot, dateKey);
    if (shouldSkipRecordedNudge(existing)) continue;
    if (!existing) {
      await recordNudge(userId, slot, dateKey);
    }

    pending.push({
      date: dateKey,
      mealType: slot,
      message: `Looks like you haven't logged ${slot} yet — what did you have?`,
    });
  }

  return pending;
}
