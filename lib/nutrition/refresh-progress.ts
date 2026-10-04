import { notifyNutritionDataUpdated } from "@/lib/nutrition/events";

/** Tell all nutrition progress UIs to refetch today’s summary (immediate + short delay for DB commit). */
export function refreshNutritionProgress() {
  notifyNutritionDataUpdated();
  window.setTimeout(() => notifyNutritionDataUpdated(), 400);
}
