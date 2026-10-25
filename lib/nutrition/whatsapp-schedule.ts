import { NUDGE_GRACE_MINUTES, type MealSlot } from "./nudge-timing";
import { parseWhatsappTime } from "./whatsapp";

export type WhatsappReminderKind = "scheduled" | "smart";

export const DEFAULT_WHATSAPP_TIMES: Record<MealSlot, string> = {
  breakfast: "09:00",
  lunch: "13:30",
  dinner: "20:30",
};

const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner"];

function clockMinutes(value: string | null | undefined, fallback: string) {
  const [hour, minute] = (parseWhatsappTime(value ?? "") ?? fallback).split(":");
  return Number(hour) * 60 + Number(minute);
}

export function zonedClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") * 60 + read("minute");
}

function mealBases(times: Partial<Record<MealSlot, string | null>>) {
  return {
    breakfast: clockMinutes(times.breakfast, DEFAULT_WHATSAPP_TIMES.breakfast),
    lunch: clockMinutes(times.lunch, DEFAULT_WHATSAPP_TIMES.lunch),
    dinner: clockMinutes(times.dinner, DEFAULT_WHATSAPP_TIMES.dinner),
  };
}

/** The meal whose local window contains the clock. Null before breakfast. */
export function activeMealSlot(
  nowMinutes: number,
  times: Partial<Record<MealSlot, string | null>>,
): MealSlot | null {
  const bases = mealBases(times);
  const ends = [bases.lunch, bases.dinner, 24 * 60];
  const index = SLOT_ORDER.findIndex(
    (slot, slotIndex) => nowMinutes >= bases[slot] && nowMinutes < ends[slotIndex],
  );
  return index < 0 ? null : SLOT_ORDER[index];
}

/**
 * The meal whose window contains the local clock, if a reminder should go out.
 * Breakfast ends at lunch, lunch ends at dinner, and dinner ends at midnight.
 */
export function dueWhatsappReminder(input: {
  nowMinutes: number;
  scheduledEnabled: boolean;
  smartEnabled: boolean;
  times: Partial<Record<MealSlot, string | null>>;
  loggedMeals: string[];
  sent: Array<{ mealType: string; kind: string }>;
}): { mealType: MealSlot; kind: WhatsappReminderKind } | null {
  const mealType = activeMealSlot(input.nowMinutes, input.times);
  if (!mealType) return null;
  const bases = mealBases(input.times);
  const sentScheduled = input.sent.some(
    (row) => row.mealType === mealType && row.kind === "scheduled",
  );
  if (input.scheduledEnabled && !sentScheduled) {
    return { mealType, kind: "scheduled" };
  }

  const sentSmart = input.sent.some(
    (row) => row.mealType === mealType && row.kind === "smart",
  );
  const logged = input.loggedMeals.includes(mealType);
  if (
    input.smartEnabled &&
    !logged &&
    !sentScheduled &&
    !sentSmart &&
    input.nowMinutes >= bases[mealType] + NUDGE_GRACE_MINUTES
  ) {
    return { mealType, kind: "smart" };
  }

  return null;
}
