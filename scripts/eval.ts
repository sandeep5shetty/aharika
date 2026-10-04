import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  estimateFromFoodMatch,
  estimateFromManualMacros,
  lowestConfidence,
} from "@/lib/nutrition/estimate";
import { resolveMealItems } from "@/lib/nutrition/resolve-items";

type EvalMeal = {
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    estimatedMacros?: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
    };
  }>;
  caloriesMin: number;
  caloriesMax: number;
  confidence: "High" | "Medium" | "Low";
};

function runSchedulerUnitChecks() {
  const grace = 90;
  const breakfastExpected = 9 * 60;
  assert.equal(breakfastExpected + grace <= 12 * 60, true);
  assert.equal(breakfastExpected + grace > 10 * 60 + 30, true);
}

function runConfidenceUnitChecks() {
  const high = estimateFromFoodMatch(
    {
      aliases: [],
      carbsG: 25,
      fatG: 1,
      fiberG: 1,
      id: "x",
      kcalPer100g: 130,
      name: "rice",
      proteinG: 3,
      score: 0.9,
      servingGrams: 100,
      servingUnit: "serving",
      source: "indb",
      sourceCode: "1",
    },
    200,
    "g",
    "indb"
  );
  assert.equal(high.confidence, "High");

  const medium = estimateFromFoodMatch(
    {
      aliases: [],
      carbsG: 25,
      fatG: 1,
      fiberG: 1,
      id: "x",
      kcalPer100g: 130,
      name: "rice",
      proteinG: 3,
      score: 0.4,
      servingGrams: 100,
      servingUnit: "serving",
      source: "indb",
      sourceCode: "1",
    },
    1,
    "bowl",
    "fuzzy"
  );
  assert.equal(medium.confidence, "Medium");

  const low = estimateFromManualMacros({
    name: "unknown food",
    quantity: 1,
    unit: "serving",
  });
  assert.equal(low.confidence, "Low");
  assert.equal(
    lowestConfidence([
      { ...high, confidence: "High" },
      { ...low, confidence: "Low" },
    ]),
    "Low"
  );
}

async function runMealEvalSet() {
  const filePath = path.join(process.cwd(), "tests", "eval", "meals.json");
  const meals = JSON.parse(readFileSync(filePath, "utf8")) as EvalMeal[];

  let passed = 0;
  for (const meal of meals) {
    const resolved = await resolveMealItems(meal.items);
    const calories = resolved.totals.calories;
    const okCalories =
      calories >= meal.caloriesMin && calories <= meal.caloriesMax;
    const okConfidence = resolved.confidence === meal.confidence;

    if (okCalories && okConfidence) {
      passed += 1;
      process.stdout.write(`PASS ${meal.name}\n`);
    } else {
      process.stdout.write(
        `FAIL ${meal.name} calories=${Math.round(calories)} expected ${meal.caloriesMin}-${meal.caloriesMax}, confidence=${resolved.confidence} expected ${meal.confidence}\n`
      );
    }
  }

  return { passed, total: meals.length };
}

async function main() {
  runSchedulerUnitChecks();
  runConfidenceUnitChecks();
  if (!process.env.POSTGRES_URL) {
    process.stdout.write(
      "Skipping meal eval set (POSTGRES_URL not set). Confidence checks passed.\n"
    );
    return;
  }

  const { passed, total } = await runMealEvalSet();
  if (passed !== total) {
    process.exitCode = 1;
  }
  process.stdout.write(`Meal eval: ${passed}/${total} passed.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
