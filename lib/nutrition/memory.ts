import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { getRecentUserMessagesForUser } from "@/lib/db/queries";
import {
  getMemorySummaryRecord,
  getRecentMealsForSummary,
  upsertMemorySummary,
} from "@/lib/db/nutrition-queries";
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

type SummaryPayload = z.infer<typeof summarySchema>;

function toStoredSummary(object: SummaryPayload, priorNotes: string[]) {
  const {
    mealTimeBreakfast,
    mealTimeLunch,
    mealTimeDinner,
    notes: newNotes,
    ...rest
  } = object;

  return {
    ...rest,
    usualMealTimes: {
      breakfast: mealTimeBreakfast,
      lunch: mealTimeLunch,
      dinner: mealTimeDinner,
    },
    notes: [...priorNotes, ...newNotes],
  };
}

const SUMMARY_MEAL_THRESHOLD = 5;
const SUMMARY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function maybeSummarize(userId: string) {
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

  const priorNotes =
    (existing?.summary as { notes?: string[] } | undefined)?.notes ?? [];

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
Keep notes concise. Preserve user-stated habits in notes.
Prior notes: ${priorNotes.join("; ") || "none"}

Meals:
${mealDigest || "(none)"}

Recent user chat messages (newest last):
${chatDigest || "(none)"}`,
  });

  await upsertMemorySummary(userId, {
    ...object,
    notes: [...priorNotes, ...(object.notes ?? [])],
  });
}
