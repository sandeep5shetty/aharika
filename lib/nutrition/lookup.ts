import {
  getFoodItemById,
  searchFoodItems,
} from "@/lib/db/nutrition-queries";
import { normalizeFoodQuery } from "./aliases";

export async function lookupFoodCandidates(query: string, limit = 8) {
  const normalized = normalizeFoodQuery(query);
  const results = await searchFoodItems(normalized, limit);
  if (results.length > 0) {
    return results;
  }
  return searchFoodItems(query, limit);
}

export function formatFoodForTool(
  food: Awaited<ReturnType<typeof searchFoodItems>>[number]
) {
  const servingGrams = food.servingGrams ?? 100;
  const factor = servingGrams / 100;
  return {
    id: food.id,
    name: food.name,
    aliases: food.aliases,
    source: food.source,
    score: food.score,
    per100g: {
      calories: food.kcalPer100g,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      fiberG: food.fiberG,
    },
    perServing: {
      servingUnit: food.servingUnit ?? "serving",
      grams: servingGrams,
      calories: food.kcalPer100g * factor,
      proteinG: food.proteinG * factor,
      carbsG: food.carbsG * factor,
      fatG: food.fatG * factor,
      fiberG: food.fiberG * factor,
    },
  };
}

export async function lookupFoodById(foodId: string) {
  return getFoodItemById(foodId);
}
