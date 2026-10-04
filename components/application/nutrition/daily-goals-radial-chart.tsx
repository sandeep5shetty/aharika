"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";

import { Chip } from "@/components/base/badges/chip";
import {
  compareToGoals,
  goalRemainderLabel,
  nutrientProgressPercent,
  type NutrientTotals,
} from "@/lib/nutrition/day-shared";
import { cx } from "@/utils/cx";

import type { DailyGoalProgressGoals } from "./daily-goal-progress";

type RingRow = {
  id: string;
  label: string;
  short: string;
  progress: number;
  value: number;
  goal: number;
  unit: string;
  noun: string;
  fill: string;
};

const RING_META: {
  id: keyof NutrientTotals;
  label: string;
  short: string;
  unit: string;
  noun: string;
  fill: string;
}[] = [
  { id: "fiberG", label: "Fiber", short: "Fib", unit: "g", noun: "fiber", fill: "var(--color-chart-5)" },
  { id: "fatG", label: "Fat", short: "Fat", unit: "g", noun: "fat", fill: "var(--color-chart-4)" },
  { id: "carbsG", label: "Carbs", short: "Carb", unit: "g", noun: "carbs", fill: "var(--color-chart-3)" },
  { id: "proteinG", label: "Protein", short: "Pro", unit: "g", noun: "protein", fill: "var(--color-chart-2)" },
  {
    id: "calories",
    label: "Calories",
    short: "Cal",
    unit: "kcal",
    noun: "calories",
    fill: "var(--color-chart-1)",
  },
];

function buildRings(totals: NutrientTotals, goals: NutrientTotals): RingRow[] {
  return RING_META.map((meta) => {
    const value = totals[meta.id];
    const goal = goals[meta.id];
    const progress = nutrientProgressPercent(value, goal);
    return {
      id: meta.id,
      label: meta.label,
      short: meta.short,
      progress: Math.min(100, progress),
      value,
      goal,
      unit: meta.unit,
      noun: meta.noun,
      fill: meta.fill,
    };
  });
}

function RadialTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { payload?: { payload: RingRow }[] }) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  const pct = row.goal > 0 ? Math.round((row.value / row.goal) * 100) : 0;
  const remainder = goalRemainderLabel(row.value - row.goal, row.unit, row.noun);
  const valueLabel =
    row.id === "calories"
      ? `${Math.round(row.value)} kcal`
      : `${Math.round(row.value)}g`;

  return (
    <div
      className={cx(
        "rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2 shadow-xs",
      )}
    >
      <p className="text-caption-1-semibold text-text-primary">{row.label}</p>
      <p className="text-body-2-medium text-text-secondary tabular-nums">
        {valueLabel} / {row.id === "calories" ? `${Math.round(row.goal)} kcal` : `${Math.round(row.goal)}g`}
      </p>
      <p className="text-caption-1-regular text-text-tertiary">{pct}% of target · {remainder.text}</p>
    </div>
  );
}

function macroValueLabel(row: RingRow) {
  return row.id === "calories"
    ? `${Math.round(row.value)} / ${Math.round(row.goal)} kcal`
    : `${Math.round(row.value)} / ${Math.round(row.goal)}g`;
}

function CompactMacroRow({
  rows,
  activeRingId,
  columns = 3,
}: {
  rows: RingRow[];
  activeRingId?: string;
  columns?: 2 | 3;
}) {
  return (
    <ul
      className={cx(
        "grid w-full min-w-0 gap-1.5",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {rows.map((row) => {
        const pct = row.goal > 0 ? Math.round((row.value / row.goal) * 100) : 0;
        return (
          <li
            key={row.id}
            className={cx(
              "flex min-w-0 flex-1 flex-col gap-px rounded-lg bg-background-primary-default px-1.5 py-1",
              activeRingId === row.id && "ring-1 ring-border-focus-ring",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="flex min-w-0 items-center gap-1 truncate text-caption-1-semibold text-text-secondary">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.fill }}
                  aria-hidden
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 text-caption-1-semibold text-text-tertiary tabular-nums">{pct}%</span>
            </div>
            <p className="truncate text-caption-1-regular text-text-tertiary tabular-nums">
              {macroValueLabel(row)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function MacroLegendList({
  rings,
  activeRingId,
}: {
  rings: RingRow[];
  activeRingId?: string;
}) {
  return (
    <ul className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-md">
      {[...rings].reverse().map((row) => {
        const pct = row.goal > 0 ? Math.round((row.value / row.goal) * 100) : 0;
        const remainder = goalRemainderLabel(row.value - row.goal, row.unit, row.noun);

        return (
          <li
            key={row.id}
            className={cx(
              "flex flex-col gap-1 rounded-2xl bg-background-secondary-default px-3 py-2.5",
              activeRingId === row.id && "ring-2 ring-border-focus-ring",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-body-2-medium text-text-secondary">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.fill }}
                  aria-hidden
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="text-caption-1-semibold text-text-tertiary tabular-nums">{pct}%</span>
            </div>
            <p className="text-caption-1-regular text-text-tertiary tabular-nums">{macroValueLabel(row)}</p>
            <p className="text-caption-1-regular text-text-tertiary">{remainder.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyGoalsRadialChart({
  totals,
  goals,
  title = "Today's targets",
  layout = "full",
  className,
}: {
  totals: NutrientTotals;
  goals: DailyGoalProgressGoals;
  title?: string;
  /** `bento` — tall right rail on the dashboard; `compact` — short chart row tile. */
  layout?: "full" | "compact" | "bento";
  className?: string;
}) {
  const tile = layout === "compact" || layout === "bento";
  const bento = layout === "bento";
  const rings = useMemo(() => buildRings(totals, goals), [totals, goals]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeRing =
    activeIndex !== null && activeIndex >= 0 && activeIndex < rings.length
      ? rings[activeIndex]
      : null;

  const centerRing = activeRing ?? rings.at(-1);
  const centerPct =
    centerRing && centerRing.goal > 0
      ? Math.round((centerRing.value / centerRing.goal) * 100)
      : 0;
  const centerTitle = activeRing?.label ?? "Calories";
  const calDelta = compareToGoals(totals, goals).calories;
  const calRemainder = goalRemainderLabel(calDelta, "kcal", "calories");
  const displayMacros = useMemo(() => [...rings].reverse(), [rings]);
  const macroLegendRow1 = tile ? displayMacros.slice(0, 3) : [];
  const macroLegendRow2 = tile ? displayMacros.slice(3) : [];

  const radialChart = (
    <div
      className={cx(
        "relative w-full",
        tile
          ? cx("mx-auto min-h-0 w-full flex-1", bento ? "max-w-full" : "max-w-[min(100%,360px)]")
          : "mx-auto aspect-square max-w-[280px]",
      )}
    >
      <div
        className={cx(
          "pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center transition-opacity duration-150",
          activeIndex !== null && "opacity-0",
        )}
        aria-hidden
      >
        <p
          className={cx(
            "tabular-nums text-text-primary",
            tile ? (bento ? "text-title-1-medium" : "text-title-2-medium") : "text-title-1-medium",
          )}
        >
          {centerPct}%
        </p>
        <p className="text-caption-1-semibold text-text-tertiary">{centerTitle}</p>
      </div>
      <div className="relative z-10 h-full w-full min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={rings}
          startAngle={90}
          endAngle={-270}
          innerRadius={tile ? (bento ? "28%" : "26%") : "22%"}
          outerRadius="100%"
          barSize={bento ? 12 : tile ? 10 : 14}
          onMouseMove={(state) => {
            const index = Number(state?.activeTooltipIndex);
            if (state?.isTooltipActive && Number.isFinite(index)) {
              setActiveIndex(index);
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            cursor={false}
            content={<RadialTooltip />}
            wrapperStyle={{ zIndex: 20, outline: "none" }}
          />
          <RadialBar
            dataKey="progress"
            background={{ fill: "var(--color-chart-track)" }}
            cornerRadius={tile ? 4 : 6}
          >
            {rings.map((entry) => (
              <Cell key={entry.id} fill={entry.fill} />
            ))}
            {!tile ? (
              <LabelList
                position="insideStart"
                dataKey="short"
                fill="var(--color-text-primary)"
                fontSize={10}
                fontWeight={600}
              />
            ) : null}
          </RadialBar>
        </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <section
      className={cx(
        "flex flex-col",
        tile
          ? cx(
              "min-w-0 rounded-2xl bg-background-secondary-default lg:h-full",
              bento ? "gap-3 px-4 pt-4 pb-3" : "min-h-[344px] gap-2 px-3 pt-3 pb-2",
            )
          : "w-full gap-6 rounded-3xl border border-border-button-default bg-background-primary-default px-4 py-4 shadow-xs sm:px-6 sm:py-5",
        className,
      )}
      aria-label="Daily nutrition progress"
    >
      <div
        className={cx(
          "flex shrink-0 gap-2",
          tile ? "flex-row items-center justify-between gap-1.5" : "flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className={cx(tile ? "text-body-medium text-text-secondary" : "text-title-3-semibold text-text-primary")}>
            {title}
          </h2>
          {!tile ? (
            <p className="text-body-2-regular text-text-tertiary">
              Progress toward your daily macros — hover a ring for detail.
            </p>
          ) : null}
        </div>
        {!tile ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {goals.isDefault ? (
              <Chip variant="caption" color="yellow">
                Default targets
              </Chip>
            ) : null}
            <Chip variant="bold" color={calRemainder.chipColor}>
              {calRemainder.text}
            </Chip>
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {goals.isDefault ? (
              <Chip variant="caption" color="yellow">
                Default
              </Chip>
            ) : null}
            <Chip variant="caption" color={calRemainder.chipColor} className="max-w-[9rem] truncate">
              {calRemainder.text}
            </Chip>
          </div>
        )}
      </div>

      {tile ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className={cx("flex shrink-0 flex-col", bento ? "gap-1.5" : "gap-1")}>
            <CompactMacroRow rows={macroLegendRow1} activeRingId={activeRing?.id} columns={3} />
            <CompactMacroRow rows={macroLegendRow2} activeRingId={activeRing?.id} columns={3} />
          </div>
          {radialChart}
          {bento ? (
            <p className="shrink-0 text-center text-caption-1-regular text-text-tertiary">
              Hover a ring for macro detail
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
          {radialChart}
          <MacroLegendList rings={rings} activeRingId={activeRing?.id} />
        </div>
      )}
    </section>
  );
}
