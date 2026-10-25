"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useEffect, useRef, useState, type ComponentProps, type Key } from "react";
import { RiLogoutCircleLine, RiMailLine, RiUserLine } from "@remixicon/react";
import { useSession } from "next-auth/react";
import { useLogOutConfirm } from "@/components/application/auth/log-out-confirm-provider";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { Switch } from "@/components/base/switch/switch";
import { guestRegex, withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
  SettingsValueField,
} from "./settings-rows";
import { SETTINGS_CONTROL_WIDTH, SETTINGS_SELECT_TRIGGER } from "./settings-control-width";
import { SettingsDailyGoals } from "./settings-daily-goals";

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

function SavableInput({
  initialValue,
  onSaved,
  readOnly = false,
  ...inputProps
}: {
  initialValue: string;
  onSaved?: (value: string) => void | Promise<void>;
  readOnly?: boolean;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue">) {
  const localize = useTemplateCopy();
  const [value, setValue] = useState(initialValue);
  const committed = useRef(initialValue);

  useEffect(() => {
    setValue(initialValue);
    committed.current = initialValue;
  }, [initialValue]);

  if (readOnly) {
    return localize((
      <SettingsValueField icon={inputProps.leadingIcon} className={SETTINGS_CONTROL_WIDTH}>
        {initialValue || "—"}
      </SettingsValueField>
    ));
  }

  return localize((
    <Input
      size="small"
      {...inputProps}
      value={value}
      onChange={setValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLElement).blur();
      }}
      onBlur={() => {
        const next = value.trim();
        if (next && next !== committed.current) {
          committed.current = next;
          void onSaved?.(next);
        }
      }}
      className={cx(SETTINGS_CONTROL_WIDTH, inputProps.className)}
    />
  ));
}

export function SettingsProfile({ onSaved }: { onSaved?: () => void } = {}) {
  const localize = useTemplateCopy();
  const { data: session, update } = useSession();
  const { openLogOutConfirm } = useLogOutConfirm();

  const isGuest =
    session?.user?.type === "guest" ||
    guestRegex.test(session?.user?.email ?? "");

  const email = session?.user?.email ?? "";
  const displayEmail = isGuest ? "Trial guest account" : email;
  const displayName =
    session?.user?.name?.trim() ||
    (email && !isGuest && email.includes("@") ? email.split("@")[0] : "");

  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [mealNudges, setMealNudges] = useState(true);
  const [coachMemory, setCoachMemory] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedNudges = window.localStorage.getItem(MEAL_NUDGES_KEY);
      if (storedNudges !== null) setMealNudges(storedNudges === "true");
      const storedMemory = window.localStorage.getItem(COACH_MEMORY_KEY);
      if (storedMemory !== null) setCoachMemory(storedMemory === "true");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(withBasePath("/api/nutrition/preferences"));
        if (!response.ok) return;
        const data = (await response.json()) as { timezone?: string };
        if (!cancelled && data.timezone) {
          setTimezone(data.timezone);
        }
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

  const saveDisplayName = async (name: string) => {
    const response = await fetch(withBasePath("/api/user/profile"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return;
    await update({ user: { name } });
    onSaved?.();
  };

  const onMealNudgesChange = (enabled: boolean) => {
    setMealNudges(enabled);
    try {
      window.localStorage.setItem(MEAL_NUDGES_KEY, String(enabled));
    } catch {
      // ignore
    }
    onSaved?.();
  };

  const onCoachMemoryChange = (enabled: boolean) => {
    setCoachMemory(enabled);
    try {
      window.localStorage.setItem(COACH_MEMORY_KEY, String(enabled));
    } catch {
      // ignore
    }
    onSaved?.();
  };

  return localize((
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>About you</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Email">
            <SavableInput
              aria-label="Email"
              type="email"
              leadingIcon={RiMailLine}
              initialValue={displayEmail}
              readOnly
            />
          </SettingsRow>
          <SettingsRow
            label="Name"
            description={
              isGuest
                ? "Create an account to save a display name"
                : "How Aharika greets you in chat"
            }
          >
            <SavableInput
              aria-label="Name"
              leadingIcon={RiUserLine}
              initialValue={displayName}
              readOnly={isGuest}
              onSaved={saveDisplayName}
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

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Calorie & macro targets</SettingsSectionLabel>
        {isGuest ? (
          <SettingsCard>
            <SettingsRow
              label="Body-weight estimator"
              description="Sign up to calculate and save daily calories and macros"
            >
              <ButtonLink
                href={withBasePath("/signup")}
                variant="secondary"
                size="small"
                className="shrink-0"
              >
                Create account
              </ButtonLink>
            </SettingsRow>
          </SettingsCard>
        ) : (
          <SettingsDailyGoals variant="profile" onSaved={onSaved} />
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Account actions</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Sign out">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiLogoutCircleLine}
              onClick={openLogOutConfirm}
            >
              Sign out
            </Button>
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  ));
}
