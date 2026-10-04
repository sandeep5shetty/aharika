"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/base/badges/badge";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import type { ConfidenceLevel, MealItemBreakdown } from "@/lib/types";
import { withBasePath } from "@/lib/constants";
import { refreshNutritionProgress } from "@/lib/nutrition/refresh-progress";
import { sumMealItems } from "@/lib/nutrition/meal-patch";
import { cx } from "@/utils/cx";

import { NutrientProgressBar } from "./nutrient-progress-bar";

type MealLogOutput = {
  meal?: { id: string; mealType: string; rawText: string };
  items?: MealItemBreakdown[];
  confidence?: ConfidenceLevel;
  dayTotals?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

async function patchMeal(body: {
  id: string;
  mealType?: (typeof MEAL_TYPES)[number];
  portionScale?: number;
}) {
  const response = await fetch(withBasePath("/api/nutrition/meals"), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Update failed");
  }
  return (await response.json()) as {
    items: MealItemBreakdown[];
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
}

async function deleteMeal(id: string) {
  const response = await fetch(withBasePath(`/api/nutrition/meals?id=${id}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Delete failed");
  }
}


function confidenceBadgeColor(confidence: ConfidenceLevel): "primary" | "neutral" {
  return confidence === "High" ? "primary" : "neutral";
}

export function MealLogCard({ output }: { output: MealLogOutput }) {
  const initialItems = output.items ?? [];
  const [items, setItems] = useState(initialItems);
  const [mealTotals, setMealTotals] = useState(() => sumMealItems(initialItems));
  const confidence = output.confidence ?? "Medium";
  const mealId = output.meal?.id;
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>(
    (output.meal?.mealType as (typeof MEAL_TYPES)[number]) ?? "lunch",
  );
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setItems(output.items ?? []);
    setMealTotals(sumMealItems(output.items ?? []));
  }, [output.items]);

  useEffect(() => {
    if (mealId) {
      refreshNutritionProgress();
    }
  }, [mealId]);

  const handleScale = useCallback(
    async (portionScale: number) => {
      if (!mealId) {
        return;
      }
      setBusy(true);
      setFeedback(null);
      try {
        const updated = await patchMeal({ id: mealId, portionScale });
        setItems(updated.items);
        setMealTotals({
          calories: updated.calories,
          proteinG: updated.proteinG,
          carbsG: updated.carbsG,
          fatG: updated.fatG,
          fiberG: updated.fiberG,
        });
        refreshNutritionProgress();
        setFeedback(
          portionScale < 1 ? "Portion reduced by 25%" : "Portion increased by 25%",
        );
      } catch {
        setFeedback("Could not update portion");
      } finally {
        setBusy(false);
      }
    },
    [mealId],
  );

  const handleMealTypeChange = useCallback(
    async (next: (typeof MEAL_TYPES)[number]) => {
      if (!mealId) {
        return;
      }
      setMealType(next);
      setBusy(true);
      setFeedback(null);
      try {
        await patchMeal({ id: mealId, mealType: next });
        refreshNutritionProgress();
        setFeedback("Meal type updated");
      } catch {
        setFeedback("Could not update meal type");
      } finally {
        setBusy(false);
      }
    },
    [mealId],
  );

  const handleDelete = useCallback(async () => {
    if (!mealId) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await deleteMeal(mealId);
      setHidden(true);
      refreshNutritionProgress();
    } catch {
      setFeedback("Could not delete meal");
    } finally {
      setBusy(false);
    }
  }, [mealId]);

  if (hidden) {
    return <p className="text-body-regular text-text-secondary">This meal was removed.</p>;
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-medium text-text-primary">Meal logged</span>
        <Badge color={confidenceBadgeColor(confidence)}>{confidence}</Badge>
      </div>
      {output.meal?.rawText ? (
        <p className="text-body-regular text-text-secondary">{output.meal.rawText}</p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-separator-border pb-2 text-body-2-regular last:border-0"
            key={`${item.name}-${item.grams}`}
          >
            <span className="text-text-primary">
              {item.name} — {Math.round(item.grams)}g ({item.quantity} {item.unit})
            </span>
            <span className="text-text-secondary">{Math.round(item.calories)} kcal</span>
          </li>
        ))}
      </ul>
      {output.dayTotals ? (
        <p className="text-caption-1-semibold text-text-secondary">
          This meal: {Math.round(mealTotals.calories)} kcal · P {Math.round(mealTotals.proteinG)}g · C{" "}
          {Math.round(mealTotals.carbsG)}g · F {Math.round(mealTotals.fatG)}g
        </p>
      ) : null}
      {feedback ? (
        <p className="text-caption-1-semibold text-text-tertiary" role="status">{feedback}</p>
      ) : null}
      {mealId ? (
        <div className="flex flex-col gap-2 border-t border-separator-border pt-3">
          <p className="text-caption-1-semibold text-text-secondary">
            Adjust portion if you ate more or less than estimated (each tap changes size by 25%).
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                disabled={busy}
                onClick={() => handleMealTypeChange(type)}
                className={cx(
                  "cursor-pointer rounded-full px-3 py-1 text-caption-1-semibold capitalize transition-colors",
                  mealType === type
                    ? "bg-accent-100 text-accent-800"
                    : "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover",
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              variant="secondary"
              size="small"
              onClick={() => handleScale(0.75)}
            >
              Smaller (−25%)
            </Button>
            <Button
              disabled={busy}
              variant="secondary"
              size="small"
              onClick={() => handleScale(1.25)}
            >
              Larger (+25%)
            </Button>
            <Button disabled={busy} variant="secondary" size="small" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ProgressOutput = {
  goals?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  totals?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  delta?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  range?: string;
};

function NutrientBar({
  label,
  value,
  goal,
  delta,
}: {
  label: string;
  value: number;
  goal: number;
  delta: number;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = delta > 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-caption-1-semibold">
        <span className="text-text-primary">{label}</span>
        <span className={cx(over ? "text-text-error-primary" : "text-text-secondary")}>
          {Math.round(value)}/{goal}
          {over ? " over" : delta < 0 ? " left" : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background-secondary-default">
        <div
          className={cx(
            "h-full rounded-full transition-all",
            over ? "bg-status-rose-background" : "bg-accent-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressCard({ output }: { output: ProgressOutput }) {
  const goals = output.goals;
  const totals = output.totals;
  const delta = output.delta;

  if (!goals || !totals || !delta) {
    return null;
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
      <p className="text-body-medium text-text-primary">
        Progress ({output.range === "7d" ? "7 days" : "today"})
      </p>
      <NutrientBar delta={delta.calories} goal={goals.calories} label="Calories" value={totals.calories} />
      <NutrientBar delta={delta.proteinG} goal={goals.proteinG} label="Protein (g)" value={totals.proteinG} />
      <NutrientBar delta={delta.carbsG} goal={goals.carbsG} label="Carbs (g)" value={totals.carbsG} />
      <NutrientBar delta={delta.fatG} goal={goals.fatG} label="Fat (g)" value={totals.fatG} />
      <NutrientBar delta={delta.fiberG} goal={goals.fiberG} label="Fiber (g)" value={totals.fiberG} />
    </div>
  );
}
