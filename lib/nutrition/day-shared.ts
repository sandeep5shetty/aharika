/** Client-safe nutrition date/math helpers (no database imports). */

export type NutrientTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export type DailyNutritionPoint = {
  date: string;
  totals: NutrientTotals;
  mealCount: number;
};

/** Offset (ms) from UTC such that `date.getTime() + offset` equals wall-clock parts in `timeZone`. */
function timeZoneOffsetMs(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

/** Instant of 00:00:00.000 on the calendar day of `date` in `timeZone`. */
export function startOfDayInTimeZone(date: Date, timeZone: string) {
  const key = localDateKey(date, timeZone);
  const [year, month, day] = key.split("-").map((part) => Number.parseInt(part, 10));
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const offset = timeZoneOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

/** Last millisecond of the calendar day of `date` in `timeZone`. */
export function endOfDayInTimeZone(date: Date, timeZone: string) {
  const dayKey = localDateKey(date, timeZone);
  let probe = startOfDayInTimeZone(date, timeZone).getTime() + 60 * 60 * 1000;
  const limit = probe + 48 * 60 * 60 * 1000;
  while (probe < limit && localDateKey(new Date(probe), timeZone) === dayKey) {
    probe += 60 * 60 * 1000;
  }
  const nextStart = startOfDayInTimeZone(new Date(probe), timeZone);
  return new Date(nextStart.getTime() - 1);
}

export function localDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function emptyTotals(): NutrientTotals {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
}

/** Short weekday label for chart axes (e.g. "Mon"). */
export function shortWeekdayLabel(dateKey: string, timeZone: string) {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
}

export function sumTotals(points: DailyNutritionPoint[]): NutrientTotals {
  return points.reduce(
    (acc, point) => ({
      calories: acc.calories + point.totals.calories,
      proteinG: acc.proteinG + point.totals.proteinG,
      carbsG: acc.carbsG + point.totals.carbsG,
      fatG: acc.fatG + point.totals.fatG,
      fiberG: acc.fiberG + point.totals.fiberG,
    }),
    emptyTotals(),
  );
}

export function sumMealCount(points: DailyNutritionPoint[]) {
  return points.reduce((sum, point) => sum + point.mealCount, 0);
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Positive delta means over the daily target. */
export function compareToGoals(totals: NutrientTotals, goals: NutrientTotals): NutrientTotals {
  return {
    calories: totals.calories - goals.calories,
    proteinG: totals.proteinG - goals.proteinG,
    carbsG: totals.carbsG - goals.carbsG,
    fatG: totals.fatG - goals.fatG,
    fiberG: totals.fiberG - goals.fiberG,
  };
}

export function nutrientProgressPercent(value: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, (value / goal) * 100);
}

export type GoalRemainderChipColor = "lime" | "rose" | "neutral";

export function goalRemainderLabel(
  delta: number,
  unit: string,
  noun: string,
): { text: string; chipColor: GoalRemainderChipColor } {
  const rounded = Math.round(Math.abs(delta));
  if (delta > 0) {
    return {
      text: `${rounded} ${unit} over ${noun}`,
      chipColor: "rose",
    };
  }
  if (delta === 0) {
    return { text: `${noun} target met`, chipColor: "lime" };
  }
  return {
    text: `${rounded} ${unit} left`,
    chipColor: "neutral",
  };
}
