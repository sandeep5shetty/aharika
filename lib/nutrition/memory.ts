import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { getRecentUserMessagesForUser } from "@/lib/db/queries";
import {
  getMemorySummaryRecord,
  getRecentMealsForSummary,
  isCoachMemoryEnabled,
  upsertMemorySummary,
} from "@/lib/db/nutrition-queries";
import { toStoredSummary } from "@/lib/nutrition/memory-summary";
import { isClinicalMemoryNote } from "@/lib/nutrition/safety";
import { getUserMessageText } from "@/lib/nutrition/scope";
import { getLanguageModel } from "@/lib/ai/providers";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

/** Flat shape for OpenAI structured output (nested optional objects are rejected). */
const summarySchema = z.object({
  typicalBreakfast: z.string().nullable(),
  typicalLunch: z.string().nullable(),
  typicalDinner: z.string().nullable(),
  typicalSnacks: z.string().nullable(),
  mealTimeBreakfast: z
    .string()
    .nullable()
    .describe("Usual breakfast time as HH:MM, or null if unknown"),
  mealTimeLunch: z.string().nullable(),
  mealTimeDinner: z.string().nullable(),
  avgDailyCalories7d: z.number().nullable(),
  frequentFoods: z.array(z.string()),
  notes: z.array(z.string()),
});

const SUMMARY_MEAL_THRESHOLD = 5;
const SUMMARY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function maybeSummarize(userId: string) {
  if (!(await isCoachMemoryEnabled(userId))) {
    return;
  }

  const existing = await getMemorySummaryRecord(userId);
  const mealsSince = existing?.mealsSinceSummary ?? 0;
  const generatedAt = existing?.generatedAt?.getTime() ?? 0;
  const stale = Date.now() - generatedAt > SUMMARY_MAX_AGE_MS;

  if (mealsSince < SUMMARY_MEAL_THRESHOLD && !stale) {
    return;
  }

  const meals = await getRecentMealsForSummary(userId, 14);
  const chatMessages = await getRecentUserMessagesForUser({
    userId,
    limit: 40,
  });

  if (meals.length === 0 && chatMessages.length === 0) {
    return;
  }

  const priorNotes = (
    (existing?.summary as { notes?: string[] } | undefined)?.notes ?? []
  ).filter((note) => !isClinicalMemoryNote(note));

  const mealDigest = meals
    .slice(0, 40)
    .map(
      (meal) =>
        `${meal.loggedAt.toISOString()} ${meal.mealType}: ${meal.rawText} (${Math.round(meal.calories)} kcal)`
    )
    .join("\n");

  const chatDigest = chatMessages
    .slice()
    .reverse()
    .map((row) => {
      const text = getUserMessageText(
        row.parts as Array<{ type: string; text?: string }>
      );
      if (!text) return null;
      return `${row.createdAt.toISOString()}: ${text}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const { object } = await generateObject({
    model: getLanguageModel(DEFAULT_CHAT_MODEL),
    schema: summarySchema,
    prompt: `Summarize eating patterns for a nutrition coach memory store.
Use logged meals as primary evidence; use recent user chat messages for stated habits, preferences, and meal times they mentioned but may not have logged yet.
Keep notes concise. Preserve user-stated food habits in notes.
Do not record diagnoses, medications, allergies, or other medical conditions.
Prior notes: ${priorNotes.join("; ") || "none"}

Meals:
${mealDigest || "(none)"}

Recent user chat messages (newest last):
${chatDigest || "(none)"}`,
  });

  const safeNotes = (object.notes ?? []).filter((note) => !isClinicalMemoryNote(note));
  await upsertMemorySummary(
    userId,
    toStoredSummary({ ...object, notes: safeNotes }, priorNotes),
  );
}
