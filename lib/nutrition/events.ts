export const NUTRITION_DATA_UPDATED = "nutrition-data-updated";

export function notifyNutritionDataUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NUTRITION_DATA_UPDATED));
  }
}
