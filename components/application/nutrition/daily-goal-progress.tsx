"use client";

import { Chip } from "@/components/base/badges/chip";
import type { NutrientTotals } from "@/lib/nutrition/day-shared";
import { cx } from "@/utils/cx";

import { buildNutrientDelta, NutrientProgressBar } from "./nutrient-progress-bar";

export type DailyGoalProgressGoals = NutrientTotals & { isDefault?: boolean };

export function DailyGoalProgress({
  totals,
  goals,
  title = "Today",
  variant = "compact",
  className,
  onEditTargets,
}: {
  totals: NutrientTotals;
  goals: DailyGoalProgressGoals;
  title?: string;
  /** compact: calories + protein. full: all macros. sidebar: rail widget. */
  variant?: "compact" | "full" | "sidebar";
  className?: string;
  onEditTargets?: () => void;
}) {
  const delta = buildNutrientDelta(totals, goals);
  const sidebar = variant === "sidebar";
  const barDensity = sidebar ? "sidebar" : "default";

  return (
    <section
      className={cx(
        sidebar
          ? "rounded-2xl bg-background-inner-default px-2.5 py-3"
          : "rounded-2xl border border-border-button-default bg-background-primary-default px-3 py-3 shadow-xs",
        variant === "full" && "px-4 py-4",
        className,
      )}
      aria-label="Daily nutrition progress"
    >
      <div
        className={cx(
          "flex items-start justify-between gap-2",
          sidebar ? "mb-2.5" : "mb-3 flex-wrap",
        )}
      >
        <h3 className="text-caption-1-semibold text-text-secondary">{title}</h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {goals.isDefault && !sidebar ? (
            <Chip variant="caption" color="yellow">
              Default targets
            </Chip>
          ) : null}
          {onEditTargets ? (
            <button
              type="button"
              onClick={onEditTargets}
              className="cursor-pointer text-caption-1-semibold text-accent-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              Edit targets
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cx(
          "flex flex-col",
          variant === "full" ? "gap-4" : sidebar ? "gap-2.5" : "gap-3",
        )}
      >
        <NutrientProgressBar
          label="Calories"
          value={totals.calories}
          goal={goals.calories}
          delta={delta.calories}
          unit="kcal"
          noun="calories"
          emphasize={variant === "full"}
          density={barDensity}
        />
        <NutrientProgressBar
          label="Protein"
          value={totals.proteinG}
          goal={goals.proteinG}
          delta={delta.proteinG}
          unit="g"
          noun="protein"
          emphasize={false}
          density={barDensity}
        />
        {variant === "full" ? (
          <>
            <NutrientProgressBar
              label="Carbs"
              value={totals.carbsG}
              goal={goals.carbsG}
              delta={delta.carbsG}
              unit="g"
              noun="carbs"
            />
            <NutrientProgressBar
              label="Fat"
              value={totals.fatG}
              goal={goals.fatG}
              delta={delta.fatG}
              unit="g"
              noun="fat"
            />
            <NutrientProgressBar
              label="Fiber"
              value={totals.fiberG}
              goal={goals.fiberG}
              delta={delta.fiberG}
              unit="g"
              noun="fiber"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
