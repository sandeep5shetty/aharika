import type { Meal } from "@/lib/db/schema";
import { compareToGoals, type NutrientTotals } from "@/lib/nutrition/day";
import type { goalsFromRow } from "@/lib/nutrition/goals";
import type { MealItemBreakdown } from "@/lib/types";

export function serializeMealForTool(meal: Meal) {
  return {
    calories: meal.calories,
    carbsG: meal.carbsG,
    confidence: meal.confidence,
    fatG: meal.fatG,
    fiberG: meal.fiberG,
    id: meal.id,
    loggedAt: meal.loggedAt.toISOString(),
    mealType: meal.mealType,
    proteinG: meal.proteinG,
    rawText: meal.rawText,
  };
}

export function buildMealToolPayload(input: {
  meal: Meal;
  items: MealItemBreakdown[];
  confidence: Meal["confidence"];
  totals: NutrientTotals;
  goals: ReturnType<typeof goalsFromRow>;
}) {
  return {
    confidence: input.confidence,
    dayTotals: input.totals,
    delta: compareToGoals(input.totals, input.goals),
    goals: input.goals,
    items: input.items,
    meal: serializeMealForTool(input.meal),
  };
}
