import {
  and,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { MealItemBreakdown, ConfidenceLevel } from "@/lib/types";
import {
  foodItem,
  goal,
  meal,
  nudge,
  user,
  userMemorySummary,
  userPreference,
  notificationRead,
  whatsappReminder,
  type FoodItem,
  type Meal,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "", {
  prepare: false,
  ssl: "require",
});
const db = drizzle(client);

export type FoodSearchResult = FoodItem & { score: number };

export async function deleteFoodItemsBySource(source: "indb" | "ifct") {
  await db.delete(foodItem).where(eq(foodItem.source, source));
}

export async function insertFoodItems(
  rows: Array<{
    name: string;
    aliases: string[];
    source: "indb" | "ifct";
    sourceCode: string | null;
    kcalPer100g: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    servingUnit: string | null;
    servingGrams: number | null;
  }>
) {
  for (const row of rows) {
    try {
      await db.insert(foodItem).values({
        ...row,
        aliases: [...row.aliases],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : JSON.stringify(error, null, 2);
      throw new Error(`Food insert failed for ${row.name}: ${message}`, {
        cause: error,
      });
    }
  }
}

export async function searchFoodItems(
  query: string,
  limit = 8
): Promise<FoodSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const result = await db.execute(sql`
    SELECT *,
      GREATEST(
        similarity(lower("name"), lower(${trimmed})),
        COALESCE(
          (SELECT MAX(similarity(lower(a), lower(${trimmed})))
           FROM unnest("aliases") AS a),
          0
        )
      ) AS score
    FROM "FoodItem"
    WHERE similarity(lower("name"), lower(${trimmed})) > 0.15
       OR lower("name") = lower(${trimmed})
       OR ${trimmed} = ANY("aliases")
       OR EXISTS (
         SELECT 1 FROM unnest("aliases") AS a
         WHERE lower(a) = lower(${trimmed})
       )
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  return [...result] as FoodSearchResult[];
}

export async function getFoodItemById(id: string) {
  const [row] = await db.select().from(foodItem).where(eq(foodItem.id, id));
  return row;
}

export async function getGoalForUser(userId: string) {
  const [row] = await db.select().from(goal).where(eq(goal.userId, userId));
  return row;
}

export async function upsertGoalForUser(
  userId: string,
  values: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    isDefault: boolean;
  }
) {
  const existing = await getGoalForUser(userId);
  if (existing) {
    const [updated] = await db
      .update(goal)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(goal.userId, userId))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(goal)
    .values({ userId, ...values })
    .returning();
  return created;
}

export async function saveMealRecord(input: {
  userId: string;
  chatId?: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  rawText: string;
  items: MealItemBreakdown[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: ConfidenceLevel;
}) {
  const [created] = await db
    .insert(meal)
    .values({
      calories: input.calories,
      carbsG: input.carbsG,
      chatId: input.chatId ?? null,
      confidence: input.confidence,
      fatG: input.fatG,
      fiberG: input.fiberG,
      items: input.items,
      mealType: input.mealType,
      proteinG: input.proteinG,
      rawText: input.rawText,
      userId: input.userId,
    })
    .returning();

  await incrementMealsSinceSummary(input.userId).catch(() => {
    /* memory counter is best-effort */
  });
  return created;
}

export async function updateMealRecord(
  mealId: string,
  userId: string,
  patch: {
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    items: MealItemBreakdown[];
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    confidence?: ConfidenceLevel;
    rawText?: string;
  }
) {
  const [updated] = await db
    .update(meal)
    .set({
      calories: patch.calories,
      carbsG: patch.carbsG,
      fatG: patch.fatG,
      fiberG: patch.fiberG,
      items: patch.items,
      proteinG: patch.proteinG,
      ...(patch.mealType ? { mealType: patch.mealType } : {}),
      ...(patch.confidence ? { confidence: patch.confidence } : {}),
      ...(patch.rawText ? { rawText: patch.rawText } : {}),
    })
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();
  return updated;
}

export async function deleteMealRecord(mealId: string, userId: string) {
  const [deleted] = await db
    .delete(meal)
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();
  return deleted;
}

export async function getMealById(mealId: string, userId: string) {
  const [row] = await db
    .select()
    .from(meal)
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)));
  return row;
}

export async function getMealsBetween(
  userId: string,
  start: Date,
  end: Date
): Promise<Meal[]> {
  return db
    .select()
    .from(meal)
    .where(
      and(
        eq(meal.userId, userId),
        gte(meal.loggedAt, start),
        lte(meal.loggedAt, end)
      )
    )
    .orderBy(desc(meal.loggedAt));
}

export async function getUserPreferenceRow(userId: string) {
  const [row] = await db
    .select()
    .from(userPreference)
    .where(eq(userPreference.userId, userId));
  return row;
}

export async function getUserTimezone(userId: string) {
  const row = await getUserPreferenceRow(userId);
  return row?.timezone ?? "Asia/Kolkata";
}

export async function upsertUserTimezone(userId: string, timezone: string) {
  await upsertUserPreferenceFields(userId, { timezone });
}

export async function isCoachMemoryEnabled(userId: string) {
  const row = await getUserPreferenceRow(userId);
  return row?.coachMemoryEnabled !== false;
}

export async function areMealNudgesEnabled(userId: string) {
  const row = await getUserPreferenceRow(userId);
  return row?.mealNudgesEnabled !== false;
}

export async function upsertUserPreferenceFields(
  userId: string,
  patch: {
    timezone?: string;
    sex?: string | null;
    age?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
    activity?: string | null;
    allergies?: string[];
    allergyNote?: string | null;
    coachMemoryEnabled?: boolean;
    dietPattern?: string | null;
    mealNudgesEnabled?: boolean;
    whatsappPhone?: string | null;
    whatsappRemindersEnabled?: boolean;
    whatsappScheduledEnabled?: boolean;
    whatsappSmartEnabled?: boolean;
    whatsappBreakfastTime?: string | null;
    whatsappLunchTime?: string | null;
    whatsappDinnerTime?: string | null;
  }
) {
  const existing = await getUserPreferenceRow(userId);
  if (existing) {
    await db
      .update(userPreference)
      .set(patch)
      .where(eq(userPreference.userId, userId));
    return;
  }
  await db.insert(userPreference).values({
    userId,
    timezone: patch.timezone ?? "Asia/Kolkata",
    ...patch,
  });
}

export async function listNotificationReads(userId: string) {
  const rows = await db
    .select({ notificationId: notificationRead.notificationId })
    .from(notificationRead)
    .where(eq(notificationRead.userId, userId));
  return rows.map((row) => row.notificationId);
}

export async function markNotificationReads(userId: string, notificationIds: string[]) {
  const unique = [...new Set(notificationIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  await db
    .insert(notificationRead)
    .values(unique.map((notificationId) => ({ notificationId, userId })))
    .onConflictDoNothing();
}

/** Members with WhatsApp reminders turned on and a saved phone number. */
export async function listWhatsappReminderSubscribers() {
  return db
    .select({
      email: user.email,
      name: user.name,
      timezone: userPreference.timezone,
      userId: userPreference.userId,
      whatsappBreakfastTime: userPreference.whatsappBreakfastTime,
      whatsappDinnerTime: userPreference.whatsappDinnerTime,
      whatsappLunchTime: userPreference.whatsappLunchTime,
      whatsappPhone: userPreference.whatsappPhone,
      whatsappRemindersEnabled: userPreference.whatsappRemindersEnabled,
      whatsappScheduledEnabled: userPreference.whatsappScheduledEnabled,
      whatsappSmartEnabled: userPreference.whatsappSmartEnabled,
    })
    .from(userPreference)
    .innerJoin(user, eq(user.id, userPreference.userId))
    .where(
      and(
        eq(userPreference.whatsappRemindersEnabled, true),
        isNotNull(userPreference.whatsappPhone),
      ),
    );
}

export async function listWhatsappReminders(userId: string, date: string) {
  return db
    .select()
    .from(whatsappReminder)
    .where(and(eq(whatsappReminder.userId, userId), eq(whatsappReminder.date, date)));
}

export async function claimWhatsappReminder(input: {
  userId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  kind: "scheduled" | "smart";
}) {
  try {
    await db.insert(whatsappReminder).values(input);
    return true;
  } catch (error) {
    const code =
      (error as { code?: string; cause?: { code?: string } }).code ??
      (error as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return false;
    throw error;
  }
}

export async function releaseWhatsappReminder(input: {
  userId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  kind: "scheduled" | "smart";
}) {
  await db
    .delete(whatsappReminder)
    .where(
      and(
        eq(whatsappReminder.userId, input.userId),
        eq(whatsappReminder.date, input.date),
        eq(whatsappReminder.mealType, input.mealType),
        eq(whatsappReminder.kind, input.kind),
      ),
    );
}

export async function getMemorySummaryRecord(userId: string) {
  const [row] = await db
    .select()
    .from(userMemorySummary)
    .where(eq(userMemorySummary.userId, userId));
  return row;
}

export async function upsertMemorySummary(
  userId: string,
  summary: Record<string, unknown>
) {
  const existing = await getMemorySummaryRecord(userId);
  if (existing) {
    await db
      .update(userMemorySummary)
      .set({
        generatedAt: new Date(),
        mealsSinceSummary: 0,
        summary,
      })
      .where(eq(userMemorySummary.userId, userId));
    return;
  }
  await db.insert(userMemorySummary).values({
    mealsSinceSummary: 0,
    summary,
    userId,
  });
}

async function incrementMealsSinceSummary(userId: string) {
  const existing = await getMemorySummaryRecord(userId);
  if (existing) {
    await db
      .update(userMemorySummary)
      .set({
        mealsSinceSummary: existing.mealsSinceSummary + 1,
      })
      .where(eq(userMemorySummary.userId, userId));
    return;
  }
  await db.insert(userMemorySummary).values({
    mealsSinceSummary: 1,
    summary: { notes: [] },
    userId,
  });
}

export async function appendMemoryNote(userId: string, note: string) {
  const existing = await getMemorySummaryRecord(userId);
  if (existing) {
    const summary = existing.summary as { notes?: string[] };
    const notes = [...(summary.notes ?? []), note];
    await db
      .update(userMemorySummary)
      .set({ summary: { ...summary, notes } })
      .where(eq(userMemorySummary.userId, userId));
    return;
  }
  await db.insert(userMemorySummary).values({
    mealsSinceSummary: 0,
    summary: { notes: [note] },
    userId,
  });
}

export async function recordNudge(
  userId: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  date: string
) {
  try {
    await db.insert(nudge).values({
      date,
      mealType,
      userId,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getNudgeForSlot(
  userId: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  date: string,
) {
  const [row] = await db
    .select()
    .from(nudge)
    .where(
      and(
        eq(nudge.userId, userId),
        eq(nudge.mealType, mealType),
        eq(nudge.date, date),
      ),
    );
  return row;
}

export async function dismissNudge(
  userId: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  date: string,
) {
  const dismissedAt = new Date();
  const existing = await getNudgeForSlot(userId, mealType, date);
  if (existing) {
    await db
      .update(nudge)
      .set({ dismissedAt })
      .where(eq(nudge.id, existing.id));
    return;
  }
  try {
    await db.insert(nudge).values({
      date,
      dismissedAt,
      mealType,
      userId,
    });
  } catch {
    await db
      .update(nudge)
      .set({ dismissedAt })
      .where(
        and(
          eq(nudge.userId, userId),
          eq(nudge.mealType, mealType),
          eq(nudge.date, date),
        ),
      );
  }
}

export async function hasNudgeForSlot(
  userId: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  date: string
) {
  const [row] = await db
    .select()
    .from(nudge)
    .where(
      and(
        eq(nudge.userId, userId),
        eq(nudge.mealType, mealType),
        eq(nudge.date, date)
      )
    );
  return Boolean(row);
}

export async function getRecentMealsForSummary(userId: string, days = 14) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  return getMealsBetween(userId, start, new Date());
}
