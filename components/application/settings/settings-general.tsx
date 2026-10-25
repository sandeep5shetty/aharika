"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useEffect, useState, type Key } from "react";
import { RiLogoutCircleLine } from "@remixicon/react";
import { useSession } from "next-auth/react";
import { useLogOutConfirm } from "@/components/application/auth/log-out-confirm-provider";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { Switch } from "@/components/base/switch/switch";
import { guestRegex, withBasePath } from "@/lib/constants";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";
import { SETTINGS_CONTROL_WIDTH, SETTINGS_SELECT_TRIGGER } from "./settings-control-width";

const TIMEZONE_OPTIONS = [
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "Gulf (GST)" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Europe/London", label: "United Kingdom" },
  { id: "America/New_York", label: "US Eastern" },
  { id: "America/Los_Angeles", label: "US Pacific" },
  { id: "Australia/Sydney", label: "Australia (Sydney)" },
] as const;

const MEAL_NUDGES_KEY = "aharika-meal-nudges";
const COACH_MEMORY_KEY = "aharika-coach-memory";

function readStoredFlag(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === "true";
  } catch {
    return fallback;
  }
}

/** Aharika general preferences — appearance, diary, and account actions. */
export function SettingsGeneral({ onSaved }: { onSaved?: () => void } = {}) {
  const localize = useTemplateCopy();
  const { data: session, status } = useSession();
  const { openLogOutConfirm } = useLogOutConfirm();
  const isGuest =
    status !== "authenticated" ||
    session?.user?.type === "guest" ||
    guestRegex.test(session?.user?.email ?? "");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [mealNudges, setMealNudges] = useState(() => readStoredFlag(MEAL_NUDGES_KEY, true));
  const [coachMemory, setCoachMemory] = useState(() => readStoredFlag(COACH_MEMORY_KEY, true));
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(withBasePath("/api/nutrition/preferences"));
        if (!response.ok) return;
        const data = (await response.json()) as {
          timezone?: string;
          coachMemoryEnabled?: boolean;
          mealNudgesEnabled?: boolean;
        };
        if (cancelled) return;
        if (data.timezone) setTimezone(data.timezone);
        if (typeof data.mealNudgesEnabled === "boolean") setMealNudges(data.mealNudgesEnabled);
        if (typeof data.coachMemoryEnabled === "boolean") setCoachMemory(data.coachMemoryEnabled);
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTimezone = async (key: Key | null) => {
    if (key === null) return;
    const next = String(key);
    setTimezone(next);
    try {
      await fetch(withBasePath("/api/nutrition/preferences"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: next }),
      });
      onSaved?.();
    } catch {
      // keep UI value; toast not required
    }
  };

  const saveCoachFlag = async (
    key: "mealNudgesEnabled" | "coachMemoryEnabled",
    enabled: boolean,
  ) => {
    try {
      await fetch(withBasePath("/api/nutrition/preferences"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: enabled }),
      });
    } catch {
      // The switch still updates locally if the request fails.
    }
  };

  const onMealNudgesChange = (enabled: boolean) => {
    setMealNudges(enabled);
    try {
      window.localStorage.setItem(MEAL_NUDGES_KEY, String(enabled));
    } catch {
      // ignore
    }
    void saveCoachFlag("mealNudgesEnabled", enabled);
    onSaved?.();
  };

  const onCoachMemoryChange = (enabled: boolean) => {
    setCoachMemory(enabled);
    try {
      window.localStorage.setItem(COACH_MEMORY_KEY, String(enabled));
    } catch {
      // ignore
    }
    void saveCoachFlag("coachMemoryEnabled", enabled);
    onSaved?.();
  };

  return localize((
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Appearance</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Theme"
            description="Light or dark. Saved on this device and used across Aharika."
          >
            <ThemeToggle
              appearance="segmented"
              size="small"
              onChange={() => onSaved?.()}
            />
          </SettingsRow>
        </SettingsCard>
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Coaching & diary</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Timezone"
            description="Meal days and gentle reminders use this clock"
          >
            <Select
              aria-label="Timezone"
              selectedKey={timezone}
              onSelectionChange={saveTimezone}
              isDisabled={!prefsLoaded}
              className={SETTINGS_CONTROL_WIDTH}
              triggerClassName={SETTINGS_SELECT_TRIGGER}
            >
              {TIMEZONE_OPTIONS.map((zone) => (
                <SelectItem key={zone.id} id={zone.id} textValue={zone.label}>
                  {zone.label}
                </SelectItem>
              ))}
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Meal reminders"
            description="In-chat nudges when you miss a usual breakfast, lunch, or dinner"
          >
            <Switch
              aria-label="Meal reminders"
              isSelected={mealNudges}
              onChange={onMealNudgesChange}
            />
          </SettingsRow>
          <SettingsRow
            label="Coach memory"
            description="Recent meals and habits personalize your advice"
          >
            <Switch
              aria-label="Coach memory"
              isSelected={coachMemory}
              onChange={onCoachMemoryChange}
            />
          </SettingsRow>
        </SettingsCard>
      </div>

      {isGuest ? null : (
        <div className="flex w-full flex-col gap-2">
          <SettingsSectionLabel>Account actions</SettingsSectionLabel>
          <SettingsCard>
            <SettingsRow label="Sign out">
              <Button
                variant="danger"
                size="small"
                leadingIcon={RiLogoutCircleLine}
                onClick={openLogOutConfirm}
              >
                Sign out
              </Button>
            </SettingsRow>
          </SettingsCard>
        </div>
      )}
    </div>
  ));
}
