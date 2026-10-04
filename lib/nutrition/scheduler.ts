import {
  getMealsBetween,
  getMemorySummaryRecord,
  hasNudgeForSlot,
  recordNudge,
} from "@/lib/db/nutrition-queries";
import { endOfDayInTimeZone, localDateKey, startOfDayInTimeZone } from "./day";

const DEFAULT_MEAL_TIMES: Record<
  "breakfast" | "lunch" | "dinner",
  { hour: number; minute: number }
> = {
  breakfast: { hour: 9, minute: 0 },
  dinner: { hour: 20, minute: 30 },
  lunch: { hour: 13, minute: 30 },
};

const GRACE_MINUTES = 90;

type MealSlot = "breakfast" | "lunch" | "dinner";

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

function expectedMinutes(
  slot: MealSlot,
  summary: Record<string, unknown> | undefined
) {
  const usual = summary?.usualMealTimes as
    | Record<string, string>
    | undefined;
  const fromMemory = usual?.[slot];
  if (fromMemory) {
    const [hour, minute] = fromMemory.split(":").map(Number);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return minutesSinceMidnight(hour, minute);
    }
  }
  const defaults = DEFAULT_MEAL_TIMES[slot];
  return minutesSinceMidnight(defaults.hour, defaults.minute);
}

export async function getPendingNudge(
  userId: string,
  now: Date,
  timeZone: string
) {
  const dateKey = localDateKey(now, timeZone);
  const memory = await getMemorySummaryRecord(userId);
  const summary = memory?.summary as Record<string, unknown> | undefined;
  const local = localDateParts(now, timeZone);
  const nowMinutes = minutesSinceMidnight(local.hour, local.minute);

  const mealsToday = await getMealsBetween(
    userId,
    startOfDayInTimeZone(now, timeZone),
    endOfDayInTimeZone(now, timeZone)
  );
  const loggedTypes = new Set(mealsToday.map((meal) => meal.mealType));

  const slots: MealSlot[] = ["breakfast", "lunch", "dinner"];

  for (const slot of slots) {
    const expected = expectedMinutes(slot, summary);
    if (nowMinutes < expected + GRACE_MINUTES) {
      continue;
    }
    if (loggedTypes.has(slot)) {
      continue;
    }
    if (await hasNudgeForSlot(userId, slot, dateKey)) {
      continue;
    }

    const inserted = await recordNudge(userId, slot, dateKey);
    if (!inserted) {
      continue;
    }

    return {
      date: dateKey,
      mealType: slot,
      message: `Looks like you haven't logged ${slot} yet — what did you have?`,
    };
  }

  return null;
}
