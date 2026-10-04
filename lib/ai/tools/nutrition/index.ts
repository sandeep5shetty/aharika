import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  appendMemoryNote,
  deleteMealRecord,
  getGoalForUser,
  getMealById,
  saveMealRecord,
  updateMealRecord,
  upsertGoalForUser,
  upsertUserPreferenceFields,
  upsertUserTimezone,
} from "@/lib/db/nutrition-queries";
import { compareToGoals, getProgressSnapshot } from "@/lib/nutrition/day";
import { computeGoalsFromProfile, goalsFromRow } from "@/lib/nutrition/goals";
import {
  formatFoodForTool,
  lookupFoodCandidates,
} from "@/lib/nutrition/lookup";
import { resolveMealItems } from "@/lib/nutrition/resolve-items";
import { buildMealToolPayload } from "@/lib/nutrition/tool-output";

const mealItemSchema = z.object({
  estimatedMacros: z
    .object({
      calories: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      fiberG: z.number(),
      proteinG: z.number(),
    })
    .optional(),
  foodId: z.string().min(1).optional(),
  grams: z.coerce.number().positive().optional(),
  name: z.string(),
  quantity: z.coerce.number().positive(),
  unit: z.string(),
});

export function createNutritionTools(options: {
  session: Session;
  chatId: string;
  timezone: string;
}) {
  const userId = options.session.user?.id;
  if (!userId) {
    throw new Error("Authenticated user required for nutrition tools");
  }

  const ensureTimezone = async () => {
    await upsertUserTimezone(userId, options.timezone);
  };

  return {
    deleteMeal: tool({
      description:
        "Delete a logged meal by id when the user wants to remove it.",
      execute: async ({ mealId }) => {
        const deleted = await deleteMealRecord(mealId, userId);
        if (!deleted) {
          return { message: "Meal not found", success: false };
        }
        return { mealId, success: true };
      },
      inputSchema: z.object({ mealId: z.string().uuid() }),
    }),
    getGoals: tool({
      description: "Get the user's current daily nutrition goals.",
      execute: async () => {
        const row = await getGoalForUser(userId);
        return goalsFromRow(row);
      },
      inputSchema: z.object({}),
    }),
    getProgress: tool({
      description:
        "Get calorie and macro totals compared to goals for today or the last 7 days.",
      execute: async ({ range }) => {
        await ensureTimezone();
        const snapshot = await getProgressSnapshot(
          userId,
          range,
          options.timezone
        );
        const delta = compareToGoals(snapshot.totals, snapshot.goals);
        return { ...snapshot, delta };
      },
      inputSchema: z.object({
        range: z.enum(["today", "7d"]),
      }),
    }),
    logMeal: tool({
      description:
        "Log a meal after resolving each food item. The user must confirm before it is saved to the diary.",
      execute: async ({ mealType, rawText, items }) => {
        await ensureTimezone();
        const resolved = await resolveMealItems(items);
        const saved = await saveMealRecord({
          calories: resolved.totals.calories,
          carbsG: resolved.totals.carbsG,
          chatId: options.chatId,
          confidence: resolved.confidence,
          fatG: resolved.totals.fatG,
          fiberG: resolved.totals.fiberG,
          items: resolved.items,
          mealType,
          proteinG: resolved.totals.proteinG,
          rawText,
          userId,
        });

        const progress = await getProgressSnapshot(
          userId,
          "today",
          options.timezone
        );

        return buildMealToolPayload({
          confidence: resolved.confidence,
          goals: progress.goals,
          items: resolved.items,
          meal: saved,
          totals: progress.totals,
        });
      },
      inputSchema: z.object({
        items: z.array(mealItemSchema).min(1),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        rawText: z.string(),
      }),
      needsApproval: true,
    }),
    lookupFood: tool({
      description:
        "Search the food database for a single ingredient or dish component.",
      execute: async ({ query }) => {
        const foods = await lookupFoodCandidates(query);
        return foods.map(formatFoodForTool);
      },
      inputSchema: z.object({
        query: z.string().min(1),
      }),
    }),
    rememberPreference: tool({
      description:
        "Store a user-stated habit or preference in long-term memory notes.",
      execute: async ({ note }) => {
        await appendMemoryNote(userId, note);
        return { saved: true };
      },
      inputSchema: z.object({
        note: z.string().min(1).max(500),
      }),
    }),
    setGoals: tool({
      description:
        "Update daily calorie and macro goals, or compute them from a profile.",
      execute: async (input) => {
        const current = goalsFromRow(await getGoalForUser(userId));
        const next =
          input.profile === undefined
            ? {
                calories: input.calories ?? current.calories,
                carbsG: input.carbsG ?? current.carbsG,
                fatG: input.fatG ?? current.fatG,
                fiberG: input.fiberG ?? current.fiberG,
                isDefault: false,
                proteinG: input.proteinG ?? current.proteinG,
              }
            : computeGoalsFromProfile(input.profile);

        if (input.profile) {
          await upsertUserPreferenceFields(userId, {
            activity: input.profile.activity,
            age: input.profile.age,
            heightCm: input.profile.heightCm,
            sex: input.profile.sex,
            weightKg: input.profile.weightKg,
          });
        }

        const saved = await upsertGoalForUser(userId, next);
        return goalsFromRow(saved);
      },
      inputSchema: z.object({
        calories: z.number().int().positive().optional(),
        carbsG: z.number().int().positive().optional(),
        fatG: z.number().int().positive().optional(),
        fiberG: z.number().int().positive().optional(),
        profile: z
          .object({
            activity: z.enum(["sedentary", "light", "moderate", "active"]),
            age: z.number().int().positive(),
            heightCm: z.number().positive(),
            sex: z.enum(["male", "female"]),
            weightKg: z.number().positive(),
          })
          .optional(),
        proteinG: z.number().int().positive().optional(),
      }),
    }),
    updateMeal: tool({
      description:
        "Correct a previously logged meal with updated items. The user must confirm before changes are saved.",
      execute: async ({ mealId, items }) => {
        const existing = await getMealById(mealId, userId);
        if (!existing) {
          return { message: "Meal not found", success: false };
        }

        const resolved = await resolveMealItems(items);
        const updated = await updateMealRecord(mealId, userId, {
          calories: resolved.totals.calories,
          carbsG: resolved.totals.carbsG,
          confidence: resolved.confidence,
          fatG: resolved.totals.fatG,
          fiberG: resolved.totals.fiberG,
          items: resolved.items,
          proteinG: resolved.totals.proteinG,
        });

        const progress = await getProgressSnapshot(
          userId,
          "today",
          options.timezone
        );

        return {
          success: true,
          ...buildMealToolPayload({
            confidence: resolved.confidence,
            goals: progress.goals,
            items: resolved.items,
            meal: updated,
            totals: progress.totals,
          }),
        };
      },
      inputSchema: z.object({
        items: z.array(mealItemSchema).min(1),
        mealId: z.string().uuid(),
      }),
      needsApproval: true,
    }),
  };
}

export type NutritionTools = ReturnType<typeof createNutritionTools>;

export const nutritionToolNames = [
  "lookupFood",
  "logMeal",
  "updateMeal",
  "deleteMeal",
  "getProgress",
  "getGoals",
  "setGoals",
  "rememberPreference",
] as const;

export const guestNutritionToolNames = [
  "lookupFood",
  "getProgress",
  "getGoals",
] as const;

export function pickGuestNutritionTools(tools: NutritionTools) {
  return {
    getGoals: tools.getGoals,
    getProgress: tools.getProgress,
    lookupFood: tools.lookupFood,
  };
}
