import type { MealItemBreakdown } from "@/lib/types";

export function scaleMealItems(
  items: MealItemBreakdown[],
  scale: number
): MealItemBreakdown[] {
  return items.map((item) => ({
    ...item,
    quantity: item.quantity * scale,
    grams: item.grams * scale,
    calories: item.calories * scale,
    proteinG: item.proteinG * scale,
    carbsG: item.carbsG * scale,
    fatG: item.fatG * scale,
    fiberG: item.fiberG * scale,
  }));
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
