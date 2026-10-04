import type { MealItemBreakdown } from "@/lib/types";
import {
  getFoodItemById,
  searchFoodItems,
} from "@/lib/db/nutrition-queries";
import { normalizeFoodQuery } from "./aliases";
import {
  estimateFromFoodMatch,
  estimateFromManualMacros,
  lowestConfidence,
  resolveMatchSource,
  sumMealItems,
} from "./estimate";

export type MealItemInput = {
  name: string;
  quantity: number;
  unit: string;
  foodId?: string;
  grams?: number;
  estimatedMacros?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
};

export async function resolveMealItem(
  input: MealItemInput
): Promise<MealItemBreakdown> {
  if (input.estimatedMacros || (!input.foodId && input.grams)) {
    return estimateFromManualMacros(input);
  }

  if (input.foodId) {
    const food = await getFoodItemById(input.foodId);
    if (food) {
      return estimateFromFoodMatch(
        { ...food, score: 1 },
        input.quantity,
        input.unit,
        food.source
      );
    }
  }

  const query = normalizeFoodQuery(input.name);
  const matches = await searchFoodItems(query, 5);
  const best = matches.at(0);

  if (!best || best.score < 0.35) {
    return estimateFromManualMacros(input);
  }

  return estimateFromFoodMatch(
    best,
    input.quantity,
    input.unit,
    resolveMatchSource(best, input.name)
  );
}

export async function resolveMealItems(items: MealItemInput[]) {
  const resolved = await Promise.all(items.map((item) => resolveMealItem(item)));
  const totals = sumMealItems(resolved);
  const confidence = lowestConfidence(resolved);
  return { items: resolved, totals, confidence };
}
