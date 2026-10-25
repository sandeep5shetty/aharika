import {
  getGoalForUser,
  getMealsBetween,
  getMemorySummaryRecord,
  getUserPreferenceRow,
  getUserTimezone,
  isCoachMemoryEnabled,
} from "@/lib/db/nutrition-queries";
import {
  dietConstraintLines,
  parseAllergies,
  parseAllergyNote,
  parseDietPattern,
} from "./diet-preferences";
import {
  compareToGoals,
  endOfDayInTimeZone,
  getDayTotals,
  startOfDayInTimeZone,
} from "./day";
import { goalsFromRow } from "./goals";

export async function buildNutritionContextBlock(userId: string) {
  const timeZone = await getUserTimezone(userId);
  const now = new Date();
  const goalRow = await getGoalForUser(userId);
  const goals = goalsFromRow(goalRow);
  const todayTotals = await getDayTotals(userId, now, timeZone);
  const delta = compareToGoals(todayTotals, goals);
  const meals = await getMealsBetween(
    userId,
    startOfDayInTimeZone(now, timeZone),
    endOfDayInTimeZone(now, timeZone)
  );
  const preference = await getUserPreferenceRow(userId);
  const memoryEnabled = await isCoachMemoryEnabled(userId);
  const memory = memoryEnabled ? await getMemorySummaryRecord(userId) : null;
  const summary = memory?.summary as Record<string, unknown> | undefined;

  const mealLines = meals.map(
    (row) =>
      `- ${row.mealType}: ${row.rawText} (${Math.round(row.calories)} kcal, ${row.confidence} confidence)`
  );

  const lines = [
    `Current local time (${timeZone}): ${now.toISOString()}`,
    "Today's logged meals:",
    mealLines.length > 0 ? mealLines.join("\n") : "- none yet",
    `Today's totals vs goals: ${Math.round(todayTotals.calories)}/${goals.calories} kcal, protein ${Math.round(todayTotals.proteinG)}/${goals.proteinG}g, carbs ${Math.round(todayTotals.carbsG)}/${goals.carbsG}g, fat ${Math.round(todayTotals.fatG)}/${goals.fatG}g, fiber ${Math.round(todayTotals.fiberG)}/${goals.fiberG}g.`,
    `Delta (actual minus goal): calories ${Math.round(delta.calories)}, protein ${Math.round(delta.proteinG)}g, carbs ${Math.round(delta.carbsG)}g, fat ${Math.round(delta.fatG)}g, fiber ${Math.round(delta.fiberG)}g.`,
  ];

  lines.push(
    ...dietConstraintLines({
      dietPattern: parseDietPattern(preference?.dietPattern),
      allergies: parseAllergies(preference?.allergies),
      allergyNote: parseAllergyNote(preference?.allergyNote),
    }),
  );

  if (goals.isDefault) {
    lines.push(
      "User still has default goals — invite them to personalize calories/macros or share age, sex, weight, height, and activity."
    );
  }

  if (memoryEnabled && summary) {
    lines.push(`Long-term memory summary (JSON): ${JSON.stringify(summary)}`);
  }

  return lines.join("\n");
}
