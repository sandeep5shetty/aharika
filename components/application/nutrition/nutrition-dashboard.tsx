"use client";

import {
  RiAddFill,
  RiRestaurantLine,
  RiRunLine,
  RiFireLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { NotificationBell } from "@/components/application/app-shell/notification-bell";
import { AppShell, useStarterBase } from "@/components/application/app-shell/app-shell";
import { OrdersChartCard } from "@/components/application/dashboard/orders-chart-card";
import {
  RevenueChartCard,
  type TrendChartFormat,
} from "@/components/application/dashboard/revenue-chart-card";
import type { OrdersPoint } from "@/components/application/dashboard/orders-chart-card";
import type { RevenuePoint } from "@/components/application/dashboard/revenue-chart-card";
import { Stat, StatCards } from "@/components/application/dashboard/stat-cards";
import {
  NutritionMealsTable,
  type NutritionMealRow,
} from "@/components/application/nutrition/nutrition-meals-table";
import { ButtonLink } from "@/components/base/buttons/button";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import type { DailyNutritionPoint, NutrientTotals } from "@/lib/nutrition/day-shared";
import {
  percentChange,
  shortWeekdayLabel,
  sumMealCount,
  sumTotals,
} from "@/lib/nutrition/day-shared";
import { NUTRITION_DATA_UPDATED } from "@/lib/nutrition/events";
import { DailyGoalsRadialChart } from "@/components/application/nutrition/daily-goals-radial-chart";

type DashboardProps = {
  timeZone: string;
  dailySeries: DailyNutritionPoint[];
  tableMeals: NutritionMealRow[];
  goals: NutrientTotals & { isDefault?: boolean };
  todayTotals: NutrientTotals;
};

const CALORIE_TREND_FORMAT: TrendChartFormat = {
  formatHeadline: (value) => `${value.toLocaleString("en-US")} kcal`,
  formatComparison: (value, hovering) =>
    `${value.toLocaleString("en-US")} kcal ${hovering ? "prior week" : "previous week"}`,
  formatAxis: (value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`),
  legendCurrent: "This week",
  legendPrevious: "Prior week",
};

const MEAL_BAR_FORMAT = {
  formatHeadline: (value: number) => value.toLocaleString("en-US"),
  formatComparison: (value: number, hovering: boolean) =>
    `${value.toLocaleString("en-US")} ${hovering ? "prior week" : "previous week"}`,
  formatAxis: (value: number) => `${value}`,
  legendCurrent: "This week",
  legendPrevious: "Prior week",
};

function formatPercentDelta(current: number, previous: number): Pick<Stat, "delta" | "deltaColor"> {
  if (previous === 0 && current === 0) {
    return { delta: "No logs", deltaColor: "neutral" };
  }
  if (previous === 0 && current > 0) {
    return { delta: "New", deltaColor: "lime" };
  }
  const change = percentChange(current, previous);
  const rounded = Math.round(Math.abs(change) * 10) / 10;
  if (rounded === 0) {
    return { delta: "Same", deltaColor: "neutral" };
  }
  const sign = change > 0 ? "+" : "-";
  return {
    delta: `${sign}${rounded}%`,
    deltaColor: change > 0 ? "lime" : "rose",
  };
}

function displayNameFromSession(session: ReturnType<typeof useSession>["data"]) {
  const name = session?.user?.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  const email = session?.user?.email ?? "";
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

export function NutritionDashboard({
  timeZone,
  dailySeries,
  tableMeals: initialTableMeals,
  goals,
  todayTotals,
}: DashboardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const base = useStarterBase();
  const [tableMeals, setTableMeals] = useState(initialTableMeals);

  useEffect(() => {
    setTableMeals(initialTableMeals);
  }, [initialTableMeals]);

  useEffect(() => {
    const onUpdate = () => router.refresh();
    window.addEventListener(NUTRITION_DATA_UPDATED, onUpdate);
    return () => window.removeEventListener(NUTRITION_DATA_UPDATED, onUpdate);
  }, [router]);

  const currentWeek = dailySeries.slice(-7);
  const priorWeek = dailySeries.slice(0, 7);

  const weekTotals = sumTotals(currentWeek);
  const priorWeekTotals = sumTotals(priorWeek);
  const weekMeals = sumMealCount(currentWeek);
  const priorWeekMeals = sumMealCount(priorWeek);
  const calorieChart: RevenuePoint[] = currentWeek.map((day, index) => ({
    label: shortWeekdayLabel(day.date, timeZone),
    current: Math.round(day.totals.calories),
    previous: Math.round(priorWeek[index]?.totals.calories ?? 0),
  }));

  const mealsChart: OrdersPoint[] = currentWeek.map((day, index) => ({
    label: shortWeekdayLabel(day.date, timeZone),
    current: day.mealCount,
    previous: priorWeek[index]?.mealCount ?? 0,
  }));

  const stats: Stat[] = useMemo(() => {
    const calDelta = formatPercentDelta(weekTotals.calories, priorWeekTotals.calories);
    const mealDelta = formatPercentDelta(weekMeals, priorWeekMeals);
    const proteinDelta = formatPercentDelta(weekTotals.proteinG, priorWeekTotals.proteinG);
    return [
      {
        icon: RiFireLine,
        label: "Calories this week",
        value: `${Math.round(weekTotals.calories).toLocaleString("en-US")} kcal`,
        ...calDelta,
        tone: "orange",
        caption: "vs prior week",
        hint: "Sum of logged calories across the last seven days. The change compares this week to the seven days before it.",
      },
      {
        icon: RiRestaurantLine,
        label: "Meals logged",
        value: weekMeals.toLocaleString("en-US"),
        ...mealDelta,
        tone: "blue",
        caption: "vs prior week",
        hint: "How many meals you logged with Aharika this week, including snacks.",
      },
      {
        icon: RiRunLine,
        label: "Protein intake",
        value: `${Math.round(weekTotals.proteinG)}g`,
        ...proteinDelta,
        tone: "purple",
        caption: "vs prior week",
        hint: "Total protein from your diary this week compared to the previous week.",
      },
    ];
  }, [
    priorWeekMeals,
    priorWeekTotals.calories,
    priorWeekTotals.proteinG,
    weekMeals,
    weekTotals.calories,
    weekTotals.proteinG,
  ]);

  const firstName = displayNameFromSession(session);

  const deleteMeal = async (id: string) => {
    const response = await fetch(withBasePath(`/api/nutrition/meals?id=${id}`), {
      method: "DELETE",
    });
    if (response.ok) {
      setTableMeals((prev) => prev.filter((meal) => meal.id !== id));
      window.dispatchEvent(new Event(NUTRITION_DATA_UPDATED));
    }
  };

  return (
    <AppShell
      title="Dashboard"
      heading={`Welcome ${firstName}`}
      actions={
        <>
          <NotificationBell />
          <ButtonLink
            variant="primary"
            size="medium"
            leadingIcon={RiAddFill}
            href={`${base}${CHAT_PATH}`}
          >
            Log meal
          </ButtonLink>
        </>
      }
    >
      <section
        className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,27%)] lg:items-stretch"
        aria-label="Dashboard overview"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <StatCards variant="footer" stats={stats} columns={3} className="grid-cols-1 sm:grid-cols-3" />
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <RevenueChartCard
              className="min-h-[344px] min-w-0"
              data={calorieChart}
              title="Calories"
              valueFormat={CALORIE_TREND_FORMAT}
            />
            <OrdersChartCard
              className="min-h-[344px] min-w-0"
              data={mealsChart}
              title="Meals logged"
              valueFormat={MEAL_BAR_FORMAT}
            />
          </div>
        </div>

        <DailyGoalsRadialChart
          layout="bento"
          className="min-h-[380px] min-w-0 lg:min-h-0 lg:h-full"
          title="Today's targets"
          totals={todayTotals}
          goals={goals}
        />
      </section>

      <NutritionMealsTable rows={tableMeals} onDelete={deleteMeal} />

      <p className="text-body-2-regular text-text-tertiary">
        Estimate targets from your profile in Settings → Profile, or edit numbers in Daily targets (sidebar).
      </p>
    </AppShell>
  );
}
