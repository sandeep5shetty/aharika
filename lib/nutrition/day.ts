import {
  getGoalForUser,
  getMealsBetween,
  searchFoodItems,
} from "@/lib/db/nutrition-queries";
import { goalsFromRow } from "./goals";
import {
  compareToGoals,
  DailyNutritionPoint,
  emptyTotals,
  endOfDayInTimeZone,
  localDateKey,
  NutrientTotals,
  startOfDayInTimeZone,
} from "./day-shared";

export { searchFoodItems };
export type { DailyNutritionPoint, NutrientTotals };
export {
  compareToGoals,
  endOfDayInTimeZone,
  goalRemainderLabel,
  localDateKey,
  nutrientProgressPercent,
  parseDateKey,
  percentChange,
  shortWeekdayLabel,
  startOfDayInTimeZone,
  sumMealCount,
  sumTotals,
} from "./day-shared";

export async function getDayTotals(
  userId: string,
  date: Date,
  timeZone: string,
) {
  const meals = await getMealsBetween(
    userId,
    startOfDayInTimeZone(date, timeZone),
    endOfDayInTimeZone(date, timeZone),
  );

  return meals.reduce<NutrientTotals>(
    (acc, row) => ({
      calories: acc.calories + row.calories,
      proteinG: acc.proteinG + row.proteinG,
      carbsG: acc.carbsG + row.carbsG,
      fatG: acc.fatG + row.fatG,
      fiberG: acc.fiberG + row.fiberG,
    }),
    emptyTotals(),
  );
}

export async function getRangeDailyNutrition(
  userId: string,
  days: number,
  timeZone: string,
  endDate: Date = new Date(),
): Promise<DailyNutritionPoint[]> {
  const end = endDate;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const meals = await getMealsBetween(
    userId,
    startOfDayInTimeZone(start, timeZone),
    endOfDayInTimeZone(end, timeZone),
  );

  const byDay = new Map<string, DailyNutritionPoint>();

  for (const row of meals) {
    const key = localDateKey(row.loggedAt, timeZone);
    const current = byDay.get(key) ?? { date: key, totals: emptyTotals(), mealCount: 0 };
    byDay.set(key, {
      date: key,
      mealCount: current.mealCount + 1,
      totals: {
        calories: current.totals.calories + row.calories,
        proteinG: current.totals.proteinG + row.proteinG,
        carbsG: current.totals.carbsG + row.carbsG,
        fatG: current.totals.fatG + row.fatG,
        fiberG: current.totals.fiberG + row.fiberG,
      },
    });
  }

  const series: DailyNutritionPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDateKey(d, timeZone);
    series.push(byDay.get(key) ?? { date: key, totals: emptyTotals(), mealCount: 0 });
  }

  return series;
}

export async function getRangeDailyTotals(
  userId: string,
  days: number,
  timeZone: string,
) {
  const series = await getRangeDailyNutrition(userId, days, timeZone);
  return series.map(({ date, totals }) => ({ date, totals }));
}

export async function getProgressSnapshot(
  userId: string,
  range: "today" | "7d",
  timeZone: string,
) {
  const goalRow = await getGoalForUser(userId);
  const goals = goalsFromRow(goalRow);
  const now = new Date();

  if (range === "today") {
    const totals = await getDayTotals(userId, now, timeZone);
    return { goals, totals, range };
  }

  const series = await getRangeDailyTotals(userId, 7, timeZone);
  const totals = series.reduce<NutrientTotals>(
    (acc, day) => ({
      calories: acc.calories + day.totals.calories,
      proteinG: acc.proteinG + day.totals.proteinG,
      carbsG: acc.carbsG + day.totals.carbsG,
      fatG: acc.fatG + day.totals.fatG,
      fiberG: acc.fiberG + day.totals.fiberG,
    }),
    emptyTotals(),
  );

  return { goals, totals, range, series };
}

export async function getProgressForDate(
  userId: string,
  date: Date,
  timeZone: string,
) {
  const goalRow = await getGoalForUser(userId);
  const goals = goalsFromRow(goalRow);
  const totals = await getDayTotals(userId, date, timeZone);
  return { goals, totals, dateKey: localDateKey(date, timeZone) };
}

