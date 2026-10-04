import type { ConfidenceLevel, MealItemBreakdown } from "@/lib/types";
import type { FoodSearchResult } from "@/lib/db/nutrition-queries";
import { normalizeFoodQuery } from "./aliases";
import { parseQuantityPhrase } from "./portions";

export function macrosForGrams(
  food: Pick<
    FoodSearchResult,
    "kcalPer100g" | "proteinG" | "carbsG" | "fatG" | "fiberG"
  >,
  grams: number
) {
  const factor = grams / 100;
  return {
    calories: food.kcalPer100g * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
    fiberG: food.fiberG * factor,
  };
}

export function lowestConfidence(
  items: MealItemBreakdown[]
): ConfidenceLevel {
  if (items.some((item) => item.confidence === "Low")) {
    return "Low";
  }
  if (items.some((item) => item.confidence === "Medium")) {
    return "Medium";
  }
  return "High";
}

export function estimateFromFoodMatch(
  food: FoodSearchResult,
  quantity: number,
  unit: string,
  matchSource: MealItemBreakdown["matchSource"]
): MealItemBreakdown {
  const { grams, assumed } = parseQuantityPhrase(quantity, unit);
  const macros = macrosForGrams(food, grams);

  let confidence: ConfidenceLevel = "High";
  if (matchSource === "fuzzy" || food.score < 0.45) {
    confidence = "Medium";
  }
  if (assumed) {
    confidence = confidence === "High" ? "Medium" : confidence;
  }

  return {
    name: food.name,
    foodId: food.id,
    quantity,
    unit,
    grams,
    ...macros,
    confidence,
    matchSource,
  };
}

export function estimateFromManualMacros(input: {
  name: string;
  quantity: number;
  unit: string;
  grams?: number;
  estimatedMacros?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
}): MealItemBreakdown {
  const { grams, assumed } =
    input.grams !== undefined
      ? { grams: input.grams, assumed: false }
      : parseQuantityPhrase(input.quantity, input.unit);

  const macros = input.estimatedMacros ?? {
    calories: grams * 1.5,
    proteinG: grams * 0.05,
    carbsG: grams * 0.2,
    fatG: grams * 0.05,
    fiberG: grams * 0.02,
  };

  return {
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    grams,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    confidence: "Low",
    matchSource: "estimated",
  };
}

export function resolveMatchSource(
  food: FoodSearchResult,
  query: string
): MealItemBreakdown["matchSource"] {
  const normalized = normalizeFoodQuery(query);
  if (food.name.toLowerCase() === normalized) {
    return food.source;
  }
  if (food.aliases?.some((alias) => alias.toLowerCase() === normalized)) {
    return "alias";
  }
  if (food.score >= 0.45) {
    return food.source;
  }
  return "fuzzy";
}

export function sumMealItems(items: MealItemBreakdown[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
      fiberG: acc.fiberG + item.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  );
}
