"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import {
  NotificationsProvider,
} from "@/components/application/app-shell/notification-bell";
import { useStarterBase } from "@/components/application/app-shell/app-shell";
import type { NotificationCenterTab } from "@/components/application/notification-center/notification-center";
import { useNutritionNotifications } from "@/hooks/use-nutrition-notifications";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import { openSettingsModal } from "@/lib/settings/open-settings";

const NUTRITION_TAB_LABELS: Record<NotificationCenterTab, string> = {
  all: "All",
  mentions: "Reminders",
  system: "Daily",
};

export function NutritionNotificationsProvider({ children }: { children: ReactNode }) {
  const localize = useTemplateCopy();
  const router = useRouter();
  const base = useStarterBase();
  const { notifications } = useNutritionNotifications(true);

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
      tabLabels={NUTRITION_TAB_LABELS}
      emptyMessage="You're all caught up for now."
    >
      {children}
    </NotificationsProvider>
  ));
}
