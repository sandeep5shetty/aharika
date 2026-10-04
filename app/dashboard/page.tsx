import { redirect } from "next/navigation";

import type { NutritionMealRow } from "@/components/application/nutrition/nutrition-meals-table";
import { NutritionDashboard } from "@/components/application/nutrition/nutrition-dashboard";
import { auth } from "@/lib/auth";
import {
  getGoalForUser,
  getMealsBetween,
  getUserTimezone,
} from "@/lib/db/nutrition-queries";
import {
  endOfDayInTimeZone,
  getDayTotals,
  getRangeDailyNutrition,
  startOfDayInTimeZone,
} from "@/lib/nutrition/day";
import { goalsFromRow } from "@/lib/nutrition/goals";

function formatLoggedLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.type === "guest") {
    redirect("/chat");
  }

  const userId = session.user.id;
  const timeZone = await getUserTimezone(userId);
  const now = new Date();

  const dailySeries = await getRangeDailyNutrition(userId, 14, timeZone);
  const goalRow = await getGoalForUser(userId);
  const goals = goalsFromRow(goalRow);
  const todayTotals = await getDayTotals(userId, now, timeZone);

  const tableStart = new Date(now);
  tableStart.setDate(tableStart.getDate() - 29);
  const tableMealsRaw = await getMealsBetween(
    userId,
    startOfDayInTimeZone(tableStart, timeZone),
    endOfDayInTimeZone(now, timeZone),
  );

  const tableMeals: NutritionMealRow[] = tableMealsRaw.map((meal) => ({
    id: meal.id,
    description: meal.rawText,
    mealType: meal.mealType,
    confidence: meal.confidence,
    calories: meal.calories,
    loggedLabel: formatLoggedLabel(meal.loggedAt, timeZone),
    loggedTs: meal.loggedAt.getTime(),
  }));

  return (
    <NutritionDashboard
      timeZone={timeZone}
      dailySeries={dailySeries}
      tableMeals={tableMeals}
      goals={goals}
      todayTotals={todayTotals}
    />
  );
}
