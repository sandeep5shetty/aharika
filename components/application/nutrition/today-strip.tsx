"use client";

import { useNutritionSummary } from "@/hooks/use-nutrition-summary";
import { cx } from "@/utils/cx";

import { DailyGoalProgress } from "./daily-goal-progress";

/** Compact “today” progress shown above the chat composer. */
export function TodayStrip({
  onEditTargets,
  className,
}: {
  onEditTargets?: () => void;
  className?: string;
}) {
  const { summary, loading } = useNutritionSummary(true);

  if (loading) {
    return (
      <div
        className={cx(
          "mb-2 rounded-2xl border border-border-button-default bg-background-primary-default px-3 py-3 shadow-xs",
          className,
        )}
      >
        <p className="text-caption-1-semibold text-text-tertiary">Loading today…</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <DailyGoalProgress
      className={cx("mb-2", className)}
      title="Today's progress"
      totals={summary.totals}
      goals={summary.goals}
      variant="compact"
      onEditTargets={onEditTargets}
    />
  );
}
