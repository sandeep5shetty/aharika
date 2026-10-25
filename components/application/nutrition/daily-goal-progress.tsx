"use client";

import { useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

import { Chip } from "@/components/base/badges/chip";
import type { NutrientTotals } from "@/lib/nutrition/day-shared";
import { cx } from "@/utils/cx";

import { buildNutrientDelta, NutrientProgressBar } from "./nutrient-progress-bar";

export type DailyGoalProgressGoals = NutrientTotals & { isDefault?: boolean };

const COLLAPSE_STORAGE_KEY = "aharika:today-progress-expanded";

export function DailyGoalProgress({
  totals,
  goals,
  title = "Today",
  variant = "compact",
  className,
  onEditTargets,
  collapsible = false,
}: {
  totals: NutrientTotals;
  goals: DailyGoalProgressGoals;
  title?: string;
  /** compact: calories + protein. full: all macros. sidebar: rail widget. */
  variant?: "compact" | "full" | "sidebar";
  className?: string;
  onEditTargets?: () => void;
  /** When true, header shows a chevron to collapse macro bars (chat strip). */
  collapsible?: boolean;
}) {
  const delta = buildNutrientDelta(totals, goals);
  const sidebar = variant === "sidebar";
  const barDensity = sidebar ? "sidebar" : "default";
  const canCollapse = collapsible && !sidebar;

  const [expanded, setExpanded] = useState(() => {
    if (!collapsible || variant === "sidebar") return true;
    try {
      return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });

  const toggleExpanded = () => {
    setExpanded((open) => {
      const next = !open;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

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
          "flex gap-2",
          sidebar ? "mb-2.5 items-start justify-between" : "mb-3 flex-wrap items-start justify-between",
          canCollapse && "mb-2",
        )}
      >
        {canCollapse ? (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className={cx(
              "flex min-w-0 flex-1 items-center gap-1 text-start",
              "cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            <h3 className="text-caption-1-semibold text-text-secondary">{title}</h3>
            <RiArrowDownSLine
              aria-hidden
              className={cx(
                "size-4 shrink-0 text-foreground-icon-secondary transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        ) : (
          <h3 className="text-caption-1-semibold text-text-secondary">{title}</h3>
        )}
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

      {expanded ? (
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
      ) : null}
    </section>
  );
}
