import {
  RiAlarmWarningLine,
  RiCheckboxCircleLine,
  RiRestaurantLine,
  RiRunLine,
  RiScalesLine,
} from "@remixicon/react";

import type { NotificationCenterItem } from "@/components/application/notification-center/notification-center";
import type { NutrientTotals } from "@/lib/nutrition/day-shared";
import { compareToGoals } from "@/lib/nutrition/day-shared";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type BuildNotificationsInput = {
  now: Date;
  timeZone: string;
  mealNudgesEnabled: boolean;
  mealsToday: MealType[];
  totals: NutrientTotals;
  goals: NutrientTotals & { isDefault?: boolean };
  /** Signed-in member with persisted diary; guests get onboarding-only items. */
  isMember: boolean;
};

const MEAL_SLOTS: {
  type: MealType;
  label: string;
  remindAfterHour: number;
  logActionId: string;
}[] = [
  { type: "breakfast", label: "Breakfast", remindAfterHour: 9, logActionId: "log-breakfast" },
  { type: "lunch", label: "Lunch", remindAfterHour: 13, logActionId: "log-lunch" },
  { type: "dinner", label: "Dinner", remindAfterHour: 19, logActionId: "log-dinner" },
];

function localHour(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number.parseInt(hour, 10);
}

function relativeTimeLabel(now: Date, timeZone: string) {
  const hour = localHour(now, timeZone);
  if (hour < 12) return "This morning";
  if (hour < 17) return "Today";
  return "Tonight";
}

function hasMealType(meals: MealType[], type: MealType) {
  return meals.includes(type);
}

function logMealAction(label = "Log meal") {
  return [{ id: "log-meal", label, variant: "primary" as const }];
}

/** Dev inbox: every notification shape at once (see NOTIFICATION_PREVIEW_EMAIL). */
export const NOTIFICATION_PREVIEW_EMAIL = "sandy@gmail.com";

export function buildAllNutritionNotificationsPreview(): NotificationCenterItem[] {
  return [
    {
      id: "preview-targets-starter",
      category: "system",
      group: "Goals",
      title: "Personalize your daily targets",
      description:
        "You are on starter macros. Set your body stats in Profile or ask Aharika in chat to calculate calories and protein for you.",
      timestamp: "Today",
      unread: true,
      status: "information",
      icon: RiScalesLine,
      actions: [
        { id: "profile", label: "Open profile", variant: "secondary" },
        { id: "log-meal", label: "Ask in chat", variant: "primary" },
      ],
    },
    {
      id: "preview-remind-breakfast",
      category: "mentions",
      group: "Reminders",
      title: "Log breakfast",
      description:
        "No breakfast logged yet today. Tell Aharika what you ate and she will estimate macros for you.",
      timestamp: "Now",
      unread: true,
      status: "information",
      icon: RiRestaurantLine,
      actions: logMealAction("Log breakfast"),
    },
    {
      id: "preview-remind-lunch",
      category: "mentions",
      group: "Reminders",
      title: "Log lunch",
      description:
        "No lunch logged yet today. Tell Aharika what you ate and she will estimate macros for you.",
      timestamp: "Now",
      unread: true,
      status: "information",
      icon: RiRestaurantLine,
      actions: logMealAction("Log lunch"),
    },
    {
      id: "preview-remind-dinner",
      category: "mentions",
      group: "Reminders",
      title: "Log dinner",
      description:
        "No dinner logged yet today. Tell Aharika what you ate and she will estimate macros for you.",
      timestamp: "Now",
      unread: true,
      status: "information",
      icon: RiRestaurantLine,
      actions: logMealAction("Log dinner"),
    },
    {
      id: "preview-remind-empty-diary",
      category: "mentions",
      group: "Reminders",
      title: "Your diary is empty today",
      description: "Log even a snack so today's progress and dashboard stay accurate.",
      timestamp: "Now",
      unread: true,
      status: "information",
      icon: RiRestaurantLine,
      actions: logMealAction(),
    },
    {
      id: "preview-midday-on-track",
      category: "activity",
      group: "Progress",
      title: "On pace for today",
      description: "About 62% of your calorie target so far (1,240 / 2,000 kcal).",
      timestamp: "Today",
      unread: false,
      status: "success",
      icon: RiCheckboxCircleLine,
      actions: [{ id: "dashboard", label: "View dashboard", variant: "secondary" }],
    },
    {
      id: "preview-eod-over-calories",
      category: "system",
      group: "End of day",
      title: "Above your calorie target",
      description:
        "You finished about 320 kcal over today's 2,000 kcal goal. A lighter breakfast or an extra walk tomorrow can balance things out.",
      timestamp: "Today",
      unread: true,
      status: "error",
      icon: RiAlarmWarningLine,
      actions: [
        { id: "dashboard", label: "Review day", variant: "secondary" },
        { id: "log-meal", label: "Log tomorrow", variant: "primary" },
      ],
    },
    {
      id: "preview-eod-under-calories",
      category: "system",
      group: "End of day",
      title: "Under your calorie goal",
      description:
        "You are about 410 kcal below target. If you were not fasting intentionally, add a balanced snack or meal tomorrow.",
      timestamp: "Today",
      unread: true,
      status: "information",
      icon: RiRestaurantLine,
      actions: logMealAction("Plan tomorrow"),
    },
    {
      id: "preview-eod-calories-met",
      category: "system",
      group: "End of day",
      title: "Calorie goal in range",
      description: "Nice work — you landed within 45 kcal of your 2,000 kcal target.",
      timestamp: "Today",
      unread: false,
      status: "success",
      icon: RiCheckboxCircleLine,
    },
    {
      id: "preview-eod-low-protein",
      category: "system",
      group: "End of day",
      title: "Protein came up short",
      description:
        "About 32g protein below your 120g goal. Eggs, dal, yogurt, or paneer are easy wins tomorrow.",
      timestamp: "Today",
      unread: true,
      status: "information",
      icon: RiRunLine,
      actions: logMealAction("Log protein snack"),
    },
  ];
}

export function buildNutritionNotifications(input: BuildNotificationsInput): NotificationCenterItem[] {
  const { now, timeZone, mealNudgesEnabled, mealsToday, totals, goals, isMember } = input;
  const hour = localHour(now, timeZone);
  const delta = compareToGoals(totals, goals);
  const timeLabel = relativeTimeLabel(now, timeZone);
  const items: NotificationCenterItem[] = [];

  if (!isMember) {
    items.push({
      id: "guest-save-diary",
      category: "system",
      group: "Aharika",
      title: "Save your meals across devices",
      description: "Create a free account to keep your diary, targets, and reminders in sync.",
      timestamp: "Tip",
      unread: true,
      status: "information",
      icon: RiScalesLine,
      actions: [{ id: "signup", label: "Create account", variant: "primary" }],
    });
    return items;
  }

  if (goals.isDefault) {
    items.push({
      id: "targets-starter",
      category: "system",
      group: "Goals",
      title: "Personalize your daily targets",
      description:
        "You are on starter macros. Set your body stats in Profile or ask Aharika in chat to calculate calories and protein for you.",
      timestamp: timeLabel,
      unread: true,
      status: "information",
      icon: RiScalesLine,
      actions: [
        { id: "profile", label: "Open profile", variant: "secondary" },
        { id: "log-meal", label: "Ask in chat", variant: "primary" },
      ],
    });
  }

  if (mealNudgesEnabled) {
    if (mealsToday.length === 0 && hour >= 12) {
      items.push({
        id: "remind-any-meal",
        category: "mentions",
        group: "Reminders",
        title: "Your diary is empty today",
        description: "Log even a snack so today's progress and dashboard stay accurate.",
        timestamp: "Now",
        unread: true,
        status: "information",
        icon: RiRestaurantLine,
        actions: logMealAction(),
      });
    } else {
      for (const slot of MEAL_SLOTS) {
        if (hour >= slot.remindAfterHour && !hasMealType(mealsToday, slot.type)) {
          items.push({
            id: `remind-${slot.type}`,
            category: "mentions",
            group: "Reminders",
            title: `Log ${slot.label.toLowerCase()}`,
            description: `No ${slot.label.toLowerCase()} logged yet today. Tell Aharika what you ate and she will estimate macros for you.`,
            timestamp: "Now",
            unread: true,
            status: "information",
            icon: RiRestaurantLine,
            actions: logMealAction(`Log ${slot.label.toLowerCase()}`),
          });
        }
      }
    }
  }

  const calorieProgress =
    goals.calories > 0 ? (totals.calories / goals.calories) * 100 : 0;

  if (hour >= 11 && hour < 20 && calorieProgress >= 45 && calorieProgress <= 85) {
    items.push({
      id: "midday-on-track",
      category: "activity",
      group: "Progress",
      title: "On pace for today",
      description: `About ${Math.round(calorieProgress)}% of your calorie target so far (${Math.round(totals.calories)} / ${goals.calories} kcal).`,
      timestamp: timeLabel,
      unread: false,
      status: "success",
      icon: RiCheckboxCircleLine,
      actions: [{ id: "dashboard", label: "View dashboard", variant: "secondary" }],
    });
  }

  if (hour >= 20) {
    const overCalories = delta.calories > 100;
    const underCalories = delta.calories < -250;
    const lowProtein = delta.proteinG < -25;

    if (overCalories) {
      items.push({
        id: "eod-over-calories",
        category: "system",
        group: "End of day",
        title: "Above your calorie target",
        description: `You finished about ${Math.round(delta.calories)} kcal over today's ${goals.calories} kcal goal. A lighter breakfast or an extra walk tomorrow can balance things out.`,
        timestamp: "Today",
        unread: true,
        status: "error",
        icon: RiAlarmWarningLine,
        actions: [
          { id: "dashboard", label: "Review day", variant: "secondary" },
          { id: "log-meal", label: "Log tomorrow", variant: "primary" },
        ],
      });
    } else if (underCalories) {
      items.push({
        id: "eod-under-calories",
        category: "system",
        group: "End of day",
        title: "Under your calorie goal",
        description: `You are about ${Math.round(Math.abs(delta.calories))} kcal below target. If you were not fasting intentionally, add a balanced snack or meal tomorrow.`,
        timestamp: "Today",
        unread: true,
        status: "information",
        icon: RiRestaurantLine,
        actions: logMealAction("Plan tomorrow"),
      });
    } else if (Math.abs(delta.calories) <= 100) {
      items.push({
        id: "eod-calories-met",
        category: "system",
        group: "End of day",
        title: "Calorie goal in range",
        description: `Nice work — you landed within ${Math.round(Math.abs(delta.calories))} kcal of your ${goals.calories} kcal target.`,
        timestamp: "Today",
        unread: false,
        status: "success",
        icon: RiCheckboxCircleLine,
      });
    }

    if (lowProtein && !underCalories) {
      items.push({
        id: "eod-low-protein",
        category: "system",
        group: "End of day",
        title: "Protein came up short",
        description: `About ${Math.round(Math.abs(delta.proteinG))}g protein below your ${goals.proteinG}g goal. Eggs, dal, yogurt, or paneer are easy wins tomorrow.`,
        timestamp: "Today",
        unread: true,
        status: "information",
        icon: RiRunLine,
        actions: logMealAction("Log protein snack"),
      });
    }
  }

  return items;
}
