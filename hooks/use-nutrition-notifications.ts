"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import type { NotificationCenterItem } from "@/components/application/notification-center/notification-center";
import { guestRegex, withBasePath } from "@/lib/constants";
import type { NutrientTotals } from "@/lib/nutrition/day-shared";
import { NUTRITION_DATA_UPDATED } from "@/lib/nutrition/events";
import {
  buildAllNutritionNotificationsPreview,
  buildNutritionNotifications,
  NOTIFICATION_PREVIEW_EMAIL,
  type MealType,
} from "@/lib/nutrition/build-notifications";

const MEAL_NUDGES_KEY = "aharika-meal-nudges";

type SummaryPayload = {
  totals: NutrientTotals;
  goals: NutrientTotals & { isDefault?: boolean };
  meals: { mealType: MealType }[];
};

function readMealNudgesEnabled() {
  try {
    const stored = window.localStorage.getItem(MEAL_NUDGES_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

export function useNutritionNotifications(enabled = true) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationCenterItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const fetchGeneration = useRef(0);

  const isGuest =
    session?.user?.type === "guest" || guestRegex.test(session?.user?.email ?? "");
  const isMember = Boolean(session?.user && !isGuest);

  const load = useCallback(async () => {
    if (!enabled || !session?.user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const email = session.user.email?.trim().toLowerCase() ?? "";
    if (email === NOTIFICATION_PREVIEW_EMAIL) {
      setNotifications(buildAllNutritionNotificationsPreview());
      setLoading(false);
      return;
    }

    const generation = ++fetchGeneration.current;
    setLoading(true);

    try {
      const [summaryRes, prefsRes] = await Promise.all([
        fetch(withBasePath(`/api/nutrition/summary?_=${Date.now()}`), { cache: "no-store" }),
        fetch(withBasePath("/api/nutrition/preferences"), { cache: "no-store" }),
      ]);

      if (generation !== fetchGeneration.current) return;

      if (!summaryRes.ok) {
        setNotifications(
          buildNutritionNotifications({
            now: new Date(),
            timeZone: "Asia/Kolkata",
            mealNudgesEnabled: readMealNudgesEnabled(),
            mealsToday: [],
            totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
            goals: { calories: 2000, proteinG: 60, carbsG: 250, fatG: 65, fiberG: 30, isDefault: true },
            isMember,
          }),
        );
        return;
      }

      const summary = (await summaryRes.json()) as SummaryPayload;
      const prefs = prefsRes.ok
        ? ((await prefsRes.json()) as { timezone?: string })
        : { timezone: "Asia/Kolkata" };

      const built = buildNutritionNotifications({
        now: new Date(),
        timeZone: prefs.timezone ?? "Asia/Kolkata",
        mealNudgesEnabled: readMealNudgesEnabled(),
        mealsToday: summary.meals.map((meal) => meal.mealType),
        totals: summary.totals,
        goals: summary.goals,
        isMember,
      });

      if (generation === fetchGeneration.current) {
        setNotifications(built);
      }
    } catch {
      if (generation === fetchGeneration.current) setNotifications([]);
    } finally {
      if (generation === fetchGeneration.current) setLoading(false);
    }
  }, [enabled, isMember, session?.user]);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(NUTRITION_DATA_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      window.removeEventListener(NUTRITION_DATA_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.clearInterval(interval);
    };
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  return { notifications, unreadCount, loading, reload: load };
}
