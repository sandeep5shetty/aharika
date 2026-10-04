/**
 * Seeds ~2 weeks of Indian meal logs for sandy@gmail.com (demo dashboard data).
 *
 * Usage: npm run db:seed-sandy-meals
 */
import { config } from "dotenv";
import { subDays } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import path from "node:path";
import postgres from "postgres";

import { meal, user } from "@/lib/db/schema";
import type { ConfidenceLevel, MealItemBreakdown } from "@/lib/types";

config({ path: path.join(process.cwd(), ".env.local") });

const TARGET_EMAIL = "sandy@gmail.com";
const DAYS = 14;

type MealSeed = {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  rawText: string;
  hourIst: number;
  minuteIst?: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: ConfidenceLevel;
};

/** Seven rotating Indian day plans (breakfast, lunch, dinner; some days add snack). */
const WEEK_PLANS: MealSeed[][] = [
  [
    { mealType: "breakfast", rawText: "2 idlis with sambar and coconut chutney", hourIst: 8, minuteIst: 15, calories: 320, proteinG: 11, carbsG: 52, fatG: 8, fiberG: 6, confidence: "High" },
    { mealType: "lunch", rawText: "Dal tadka, jeera rice, cucumber raita", hourIst: 13, minuteIst: 30, calories: 580, proteinG: 18, carbsG: 78, fatG: 16, fiberG: 9, confidence: "High" },
    { mealType: "dinner", rawText: "2 rotis with aloo gobi and salad", hourIst: 20, minuteIst: 0, calories: 490, proteinG: 14, carbsG: 62, fatG: 18, fiberG: 11, confidence: "Medium" },
  ],
  [
    { mealType: "breakfast", rawText: "Masala poha with peanuts and lemon", hourIst: 8, minuteIst: 30, calories: 380, proteinG: 9, carbsG: 58, fatG: 12, fiberG: 5, confidence: "High" },
    { mealType: "lunch", rawText: "Rajma chawal with onion salad", hourIst: 13, minuteIst: 45, calories: 620, proteinG: 22, carbsG: 85, fatG: 14, fiberG: 14, confidence: "High" },
    { mealType: "snack", rawText: "Masala chai and 2 Marie biscuits", hourIst: 17, minuteIst: 0, calories: 140, proteinG: 3, carbsG: 22, fatG: 5, fiberG: 1, confidence: "Medium" },
    { mealType: "dinner", rawText: "Vegetable khichdi with curd", hourIst: 19, minuteIst: 45, calories: 450, proteinG: 15, carbsG: 68, fatG: 10, fiberG: 8, confidence: "High" },
  ],
  [
    { mealType: "breakfast", rawText: "Plain dosa with potato masala and sambar", hourIst: 9, minuteIst: 0, calories: 420, proteinG: 10, carbsG: 64, fatG: 11, fiberG: 6, confidence: "High" },
    { mealType: "lunch", rawText: "South Indian veg thali — rice, sambar, poriyal, curd", hourIst: 13, minuteIst: 15, calories: 650, proteinG: 16, carbsG: 92, fatG: 18, fiberG: 12, confidence: "Medium" },
    { mealType: "dinner", rawText: "Palak paneer with 2 tandoori rotis", hourIst: 20, minuteIst: 15, calories: 540, proteinG: 24, carbsG: 48, fatG: 26, fiberG: 9, confidence: "High" },
  ],
  [
    { mealType: "breakfast", rawText: "Aloo paratha with curd and pickle", hourIst: 8, minuteIst: 0, calories: 480, proteinG: 12, carbsG: 56, fatG: 22, fiberG: 7, confidence: "Medium" },
    { mealType: "lunch", rawText: "Chole with 2 bhature", hourIst: 14, minuteIst: 0, calories: 720, proteinG: 20, carbsG: 88, fatG: 28, fiberG: 13, confidence: "Medium" },
    { mealType: "dinner", rawText: "Lemon rice with papad and kosambari", hourIst: 19, minuteIst: 30, calories: 410, proteinG: 8, carbsG: 72, fatG: 9, fiberG: 5, confidence: "High" },
  ],
  [
    { mealType: "breakfast", rawText: "Vegetable upma and filter coffee", hourIst: 7, minuteIst: 45, calories: 340, proteinG: 8, carbsG: 48, fatG: 11, fiberG: 4, confidence: "High" },
    { mealType: "lunch", rawText: "Paneer butter masala, naan, onion salad", hourIst: 13, minuteIst: 30, calories: 780, proteinG: 28, carbsG: 72, fatG: 38, fiberG: 6, confidence: "Medium" },
    { mealType: "snack", rawText: "Banana and handful of roasted chana", hourIst: 16, minuteIst: 30, calories: 210, proteinG: 7, carbsG: 32, fatG: 6, fiberG: 5, confidence: "High" },
    { mealType: "dinner", rawText: "Methi thepla with yogurt", hourIst: 20, minuteIst: 0, calories: 430, proteinG: 14, carbsG: 52, fatG: 16, fiberG: 8, confidence: "High" },
  ],
  [
    { mealType: "breakfast", rawText: "Besan chilla with green chutney", hourIst: 8, minuteIst: 20, calories: 310, proteinG: 14, carbsG: 28, fatG: 14, fiberG: 5, confidence: "High" },
    { mealType: "lunch", rawText: "Fish curry with steamed rice and beans poriyal", hourIst: 13, minuteIst: 0, calories: 590, proteinG: 32, carbsG: 68, fatG: 18, fiberG: 7, confidence: "Medium" },
    { mealType: "dinner", rawText: "Mixed veg pulao with raita", hourIst: 19, minuteIst: 50, calories: 520, proteinG: 13, carbsG: 76, fatG: 15, fiberG: 9, confidence: "High" },
  ],
  [
    { mealType: "breakfast", rawText: "Millet pongal with sambar", hourIst: 8, minuteIst: 45, calories: 360, proteinG: 10, carbsG: 54, fatG: 9, fiberG: 7, confidence: "High" },
    { mealType: "lunch", rawText: "Hyderabadi veg biryani with raita", hourIst: 14, minuteIst: 15, calories: 680, proteinG: 16, carbsG: 94, fatG: 22, fiberG: 8, confidence: "Medium" },
    { mealType: "dinner", rawText: "Chicken curry with 2 rotis", hourIst: 20, minuteIst: 30, calories: 560, proteinG: 34, carbsG: 46, fatG: 24, fiberG: 5, confidence: "Medium" },
  ],
];

function istLoggedAt(daysAgo: number, hourIst: number, minuteIst = 0): Date {
  const anchor = subDays(new Date(), daysAgo);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(anchor);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const hh = String(hourIst).padStart(2, "0");
  const mm = String(minuteIst).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+05:30`);
}

function toItem(seed: MealSeed): MealItemBreakdown {
  return {
    name: seed.rawText.split(",")[0]?.slice(0, 80) ?? seed.rawText,
    quantity: 1,
    unit: "serving",
    grams: 250,
    calories: seed.calories,
    proteinG: seed.proteinG,
    carbsG: seed.carbsG,
    fatG: seed.fatG,
    fiberG: seed.fiberG,
    confidence: seed.confidence,
    matchSource: "estimated",
  };
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not set in .env.local");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, ssl: "require", max: 1 });
  const db = drizzle(sql);

  const [account] = await db.select().from(user).where(eq(user.email, TARGET_EMAIL)).limit(1);
  if (!account) {
    console.error(`No user found with email ${TARGET_EMAIL}. Sign up that account first.`);
    process.exit(1);
  }

  const windowStart = istLoggedAt(DAYS - 1, 0, 0);
  const removed = await db
    .delete(meal)
    .where(and(eq(meal.userId, account.id), gte(meal.loggedAt, windowStart)))
    .returning({ id: meal.id });

  let inserted = 0;
  for (let daysAgo = 0; daysAgo < DAYS; daysAgo += 1) {
    // Offset the older 7 days so week-over-week deltas are not always 0% (same plan repeated).
    const planIndex =
      daysAgo >= 7
        ? (daysAgo % WEEK_PLANS.length + 3) % WEEK_PLANS.length
        : daysAgo % WEEK_PLANS.length;
    const plan = WEEK_PLANS[planIndex];
    for (const entry of plan) {
      const items = [toItem(entry)];
      await db.insert(meal).values({
        userId: account.id,
        mealType: entry.mealType,
        rawText: entry.rawText,
        items,
        calories: entry.calories,
        proteinG: entry.proteinG,
        carbsG: entry.carbsG,
        fatG: entry.fatG,
        fiberG: entry.fiberG,
        confidence: entry.confidence,
        loggedAt: istLoggedAt(daysAgo, entry.hourIst, entry.minuteIst ?? 0),
        chatId: null,
      });
      inserted += 1;
    }
  }

  console.log(
    `Seeded ${inserted} Indian meals for ${TARGET_EMAIL} (${account.name ?? "user"}) over the last ${DAYS} days.`,
  );
  if (removed.length > 0) {
    console.log(`Replaced ${removed.length} existing meal(s) in that window.`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
