"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  NotificationsProvider,
} from "@/components/application/app-shell/notification-bell";
import { useStarterBase } from "@/components/application/app-shell/app-shell";
import type { NotificationCenterTab } from "@/components/application/notification-center/notification-center";
import { useNutritionNotifications } from "@/hooks/use-nutrition-notifications";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import { parseNudgeNotificationId } from "@/lib/nutrition/nudge-timing";
import { openSettingsModal } from "@/lib/settings/open-settings";

const NUTRITION_TAB_LABELS: Record<NotificationCenterTab, string> = {
  all: "All",
  mentions: "Reminders",
  system: "Daily",
};

const READS_CACHE_KEY = "aharika-notification-reads";

function readsCacheKey(userId: string) {
  return `${READS_CACHE_KEY}:${userId}`;
}

function readCachedReads(userId: string | undefined) {
  if (!userId || typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(readsCacheKey(userId)) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function cacheReads(userId: string, ids: string[]) {
  window.localStorage.setItem(readsCacheKey(userId), JSON.stringify(ids));
}

export function NutritionNotificationsProvider({ children }: { children: ReactNode }) {
  const localize = useTemplateCopy();
  const router = useRouter();
  const base = useStarterBase();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { notifications, reload } = useNutritionNotifications(true);
  const [persistedReadIds, setPersistedReadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setPersistedReadIds([]);
      return;
    }
    setPersistedReadIds(readCachedReads(userId));
    let cancelled = false;
    void fetch(withBasePath("/api/nutrition/notification-reads"), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { ids?: string[] };
        if (cancelled || !payload.ids) return;
        setPersistedReadIds((current) => {
          const next = [...new Set([...current, ...payload.ids!])];
          cacheReads(userId, next);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persistRead = useCallback(
    (ids: string[]) => {
      if (!userId) return;
      setPersistedReadIds((current) => {
        const next = [...new Set([...current, ...ids])];
        cacheReads(userId, next);
        return next;
      });
      void fetch(withBasePath("/api/nutrition/notification-reads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    [userId],
  );

  const dismissNudgeNotification = useCallback(
    (notificationId: string) => {
      const nudge = parseNudgeNotificationId(notificationId);
      if (!nudge) return;
      void fetch(withBasePath("/api/nutrition/nudges"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nudge),
      }).then(() => reload());
    },
    [reload],
  );

  const onAction = useCallback(
    (_notificationId: string, actionId: string) => {
      if (actionId === "signup") {
        router.push(withBasePath("/signup"));
        return;
      }
      if (actionId === "profile") {
        openSettingsModal("profile");
        return;
      }
      if (actionId === "dashboard") {
        router.push(withBasePath(`${base}/dashboard`));
        return;
      }
      if (actionId === "log-meal" || actionId.startsWith("log-")) {
        router.push(withBasePath(`${base}${CHAT_PATH}`));
      }
    },
    [base, router],
  );

  return localize((
    <NotificationsProvider
      notifications={notifications}
      onAction={onAction}
      onItemRead={dismissNudgeNotification}
      onPersistRead={persistRead}
      persistedReadIds={persistedReadIds}
      tabLabels={NUTRITION_TAB_LABELS}
      emptyMessage="You're all caught up for now."
    >
      {children}
    </NotificationsProvider>
  ));
}
