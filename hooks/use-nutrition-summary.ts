"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NutrientTotals } from "@/lib/nutrition/day-shared";
import { withBasePath } from "@/lib/constants";
import { NUTRITION_DATA_UPDATED } from "@/lib/nutrition/events";

import type { DailyGoalProgressGoals } from "@/components/application/nutrition/daily-goal-progress";

export type NutritionSummary = {
  goals: DailyGoalProgressGoals;
  totals: NutrientTotals;
};

export function useNutritionSummary(enabled = true) {
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fetchGeneration = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setSummary(null);
      setLoading(false);
      return;
    }
    const generation = ++fetchGeneration.current;
    try {
      const response = await fetch(
        withBasePath(`/api/nutrition/summary?_=${Date.now()}`),
        { cache: "no-store" },
      );
      if (!response.ok) {
        if (generation === fetchGeneration.current) setSummary(null);
        return;
      }
      const data = (await response.json()) as NutritionSummary;
      if (generation === fetchGeneration.current) setSummary(data);
    } catch {
      if (generation === fetchGeneration.current) setSummary(null);
    } finally {
      if (generation === fetchGeneration.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    setLoading(enabled);
    load();
    const onUpdate = () => load();
    window.addEventListener(NUTRITION_DATA_UPDATED, onUpdate);
    return () => window.removeEventListener(NUTRITION_DATA_UPDATED, onUpdate);
  }, [load, enabled]);

  return { summary, loading, reload: load };
}
