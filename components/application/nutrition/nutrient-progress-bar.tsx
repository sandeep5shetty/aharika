"use client";

import { Chip } from "@/components/base/badges/chip";
import {
  goalRemainderLabel,
  nutrientProgressPercent,
  type NutrientTotals,
} from "@/lib/nutrition/day-shared";
import { cx } from "@/utils/cx";

export function NutrientProgressBar({
  label,
  value,
  goal,
  delta,
  unit,
  noun,
  emphasize = false,
  density = "default",
}: {
  label: string;
  value: number;
  goal: number;
  delta: number;
  unit: string;
  /** Short noun for remainder chip, e.g. "calories" or "protein". */
  noun: string;
  emphasize?: boolean;
  /** Tighter stacked layout for the sidebar rail. */
  density?: "default" | "sidebar";
}) {
  const pct = nutrientProgressPercent(value, goal);
  const over = delta > 0;
  const remainder = goalRemainderLabel(delta, unit, noun);
  const sidebar = density === "sidebar";

  return (
    <div className={cx("flex w-full min-w-0 flex-col gap-1.5", emphasize && "gap-2", sidebar && "gap-1")}>
      {sidebar ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption-1-semibold text-text-primary">{label}</span>
          <span
            className={cx(
              "text-caption-1-semibold tabular-nums",
              over ? "text-text-error-primary" : "text-text-secondary",
            )}
          >
            {Math.round(value).toLocaleString("en-US")}
            <span className="text-text-tertiary"> / </span>
            {goal.toLocaleString("en-US")}
            {unit === "kcal" ? " kcal" : ` ${unit}`}
          </span>
          <span
            className={cx(
              "text-caption-1-medium tabular-nums",
              remainder.chipColor === "rose"
                ? "text-text-error-primary"
                : remainder.chipColor === "lime"
                  ? "text-status-lime-text"
                  : "text-text-tertiary",
            )}
          >
            {remainder.text}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cx(
              emphasize ? "text-body-medium" : "text-caption-1-semibold",
              "text-text-primary",
            )}
          >
            {label}
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cx(
                "tabular-nums",
                emphasize ? "text-body-medium" : "text-caption-1-semibold",
                over ? "text-text-error-primary" : "text-text-secondary",
              )}
            >
              {Math.round(value).toLocaleString("en-US")}
              <span className="text-text-tertiary"> / </span>
              {goal.toLocaleString("en-US")}
              {unit === "kcal" ? " kcal" : unit}
            </span>
            <Chip variant="caption" color={remainder.chipColor}>
              {remainder.text}
            </Chip>
          </div>
        </div>
      )}
      <div
        className={cx(
          "w-full overflow-hidden rounded-full bg-background-secondary-default",
          sidebar ? "h-1.5" : emphasize ? "h-2.5" : "h-2",
        )}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={`${label}: ${Math.round(value)} of ${goal} ${unit}`}
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            over ? "bg-status-rose-background" : "bg-accent-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function buildNutrientDelta(totals: NutrientTotals, goals: NutrientTotals): NutrientTotals {
  return {
    calories: totals.calories - goals.calories,
    proteinG: totals.proteinG - goals.proteinG,
    carbsG: totals.carbsG - goals.carbsG,
    fatG: totals.fatG - goals.fatG,
    fiberG: totals.fiberG - goals.fiberG,
  };
}
