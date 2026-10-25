"use client";

import { useEffect, useRef, useState } from "react";
import { RiWhatsappLine } from "@remixicon/react";
import { useSession } from "next-auth/react";

import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Switch } from "@/components/base/switch/switch";
import { guestRegex, withBasePath } from "@/lib/constants";
import {
  from12Hour,
  joinWhatsappLocal,
  splitWhatsappLocal,
  to12Hour,
  whatsappJoinLink,
  type Meridiem,
} from "@/lib/nutrition/whatsapp";
import { MealTimeWheel } from "./meal-time-wheel";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

type Clock = { time: string; meridiem: Meridiem };

const DEFAULT_CLOCKS = {
  breakfast: to12Hour("09:00"),
  lunch: to12Hour("13:30"),
  dinner: to12Hour("20:30"),
};

export function SettingsTools({ onSaved }: { onSaved?: () => void } = {}) {
  const { data: session } = useSession();
  const isGuest =
    session?.user?.type === "guest" || guestRegex.test(session?.user?.email ?? "");

  const [countryCode, setCountryCode] = useState("+91");
  const [nationalNumber, setNationalNumber] = useState("");
  const [sandboxFrom, setSandboxFrom] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState(false);
  const [breakfast, setBreakfast] = useState<Clock>(DEFAULT_CLOCKS.breakfast);
  const [lunch, setLunch] = useState<Clock>(DEFAULT_CLOCKS.lunch);
  const [dinner, setDinner] = useState<Clock>(DEFAULT_CLOCKS.dinner);
  const [scheduledReminders, setScheduledReminders] = useState(false);
  const [smartReminders, setSmartReminders] = useState(false);
  const loadedPhone = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [response, prefsResponse] = await Promise.all([
          fetch(withBasePath("/api/nutrition/whatsapp"), { cache: "no-store" }),
          fetch(withBasePath("/api/nutrition/preferences"), { cache: "no-store" }),
        ]);
        if (!response.ok) return;
        const data = (await response.json()) as {
          joinCode?: string | null;
          phone?: string | null;
          sandboxFrom?: string | null;
        };
        const prefs = prefsResponse.ok
          ? ((await prefsResponse.json()) as {
              whatsappRemindersEnabled?: boolean;
              whatsappScheduledEnabled?: boolean;
              whatsappSmartEnabled?: boolean;
              whatsappBreakfastTime?: string | null;
              whatsappLunchTime?: string | null;
              whatsappDinnerTime?: string | null;
              whatsappPhone?: string | null;
            })
          : null;
        if (cancelled) return;
        setJoinCode(data.joinCode ?? null);
        setSandboxFrom(data.sandboxFrom ?? null);
        const phone = prefs?.whatsappPhone ?? data.phone;
        if (phone) {
          loadedPhone.current = phone;
          const parts = splitWhatsappLocal(phone);
          setCountryCode(parts.countryCode);
          setNationalNumber(parts.nationalNumber);
        }
        if (prefs) {
          setEnabled(prefs.whatsappRemindersEnabled === true);
          setScheduledReminders(prefs.whatsappScheduledEnabled === true);
          setSmartReminders(prefs.whatsappSmartEnabled === true);
          setBreakfast(to12Hour(prefs.whatsappBreakfastTime ?? "09:00"));
          setLunch(to12Hour(prefs.whatsappLunchTime ?? "13:30"));
          setDinner(to12Hour(prefs.whatsappDinnerTime ?? "20:30"));
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const joinHref =
    sandboxFrom && joinCode ? whatsappJoinLink(sandboxFrom, joinCode) : null;

  const savePatch = async (patch: Record<string, unknown>) => {
    if (isGuest) return;
    const response = await fetch(withBasePath("/api/nutrition/preferences"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      onSaved?.();
      void fetch(withBasePath("/api/nutrition/whatsapp/dispatch"), { method: "POST" });
    }
  };

  const onEnabledChange = (next: boolean) => {
    setEnabled(next);
    void savePatch({ whatsappRemindersEnabled: next });
  };

  const onScheduledChange = (next: boolean) => {
    setScheduledReminders(next);
    void savePatch({
      whatsappScheduledEnabled: next,
      whatsappBreakfastTime: from12Hour(breakfast.time, breakfast.meridiem),
      whatsappLunchTime: from12Hour(lunch.time, lunch.meridiem),
      whatsappDinnerTime: from12Hour(dinner.time, dinner.meridiem),
    });
  };

  const onSmartChange = (next: boolean) => {
    setSmartReminders(next);
    void savePatch({ whatsappSmartEnabled: next });
  };

  const commitClock = (
    key: "whatsappBreakfastTime" | "whatsappLunchTime" | "whatsappDinnerTime",
    clock: Clock,
  ) => {
    const stored = from12Hour(clock.time, clock.meridiem);
    if (!stored) return;
    void savePatch({ [key]: stored });
  };

  const onCountryCode = (value: string) => {
    const digits = value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 4);
    setCountryCode(digits ? `+${digits}` : "+");
  };

  const onNationalNumber = (value: string) => {
    setNationalNumber(value.replace(/\D/g, "").slice(0, 10));
  };

  const remindersOpen = loaded && enabled && !isGuest;

  useEffect(() => {
    if (!remindersOpen) return;
    const phone = joinWhatsappLocal(countryCode, nationalNumber);
    if (!phone || phone === loadedPhone.current) return;
    loadedPhone.current = phone;
    const timer = window.setTimeout(() => {
      void savePatch({ whatsappPhone: phone });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [countryCode, nationalNumber, remindersOpen]);

  const sendReminder = async () => {
    const next = joinWhatsappLocal(countryCode, nationalNumber);
    if (!next) {
      setNoticeError(true);
      setNotice("Enter a country code and a 10-digit mobile number.");
      return;
    }
    const parts = splitWhatsappLocal(next);
    setCountryCode(parts.countryCode);
    setNationalNumber(parts.nationalNumber);
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch(withBasePath("/api/nutrition/whatsapp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: next }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setNoticeError(true);
        setNotice(data?.message ?? "Could not send the reminder.");
        return;
      }
      setNoticeError(false);
      setNotice("Reminder sent. Check WhatsApp.");
    } catch {
      setNoticeError(true);
      setNotice("Could not send the reminder.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center gap-3 px-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-primary">
          <RiWhatsappLine className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-title-3-medium text-text-primary">WhatsApp</h3>
          <p className="text-body-2-regular text-text-secondary">A reminder to log a meal.</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Authentication</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="WhatsApp reminders"
            description={
              isGuest
                ? "Create an account to turn this on."
                : "Turn this on to get a reminder to log a meal."
            }
          >
            <Switch
              aria-label="WhatsApp reminders"
              isSelected={enabled && !isGuest}
              isDisabled={!loaded || isGuest}
              onChange={onEnabledChange}
            />
          </SettingsRow>
          {isGuest ? (
            <SettingsRow label="Account">
              <ButtonLink href={withBasePath("/signup")} variant="secondary" size="small">
                Create account
              </ButtonLink>
            </SettingsRow>
          ) : null}
          {remindersOpen ? (
            <>
              <SettingsRow label="Mobile number">
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-72">
                  <Input
                    aria-label="Country code"
                    size="small"
                    inputMode="tel"
                    inputDir="ltr"
                    value={countryCode}
                    onChange={onCountryCode}
                    className="w-16 shrink-0"
                  />
                  <Input
                    aria-label="10-digit mobile number"
                    size="small"
                    inputMode="numeric"
                    inputDir="ltr"
                    placeholder="9876543210"
                    maxLength={10}
                    value={nationalNumber}
                    onChange={onNationalNumber}
                    className="min-w-0 flex-1"
                  />
                </div>
              </SettingsRow>
              <SettingsRow label="Send now">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={sending}
                  onClick={() => void sendReminder()}
                >
                  {sending ? "Sending…" : "Send reminder"}
                </Button>
              </SettingsRow>
            </>
          ) : null}
        </SettingsCard>
        {notice ? (
          <p
            className={
              noticeError
                ? "px-3 text-body-2-regular text-text-error-primary"
                : "px-3 text-body-2-regular text-text-secondary"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsCard>
          <SettingsRow
            label="Join from your phone"
            description="Opens WhatsApp with the join message ready. You only need to send it."
          >
            {joinHref ? (
              <ButtonLink
                href={joinHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="small"
              >
                Open WhatsApp
              </ButtonLink>
            ) : (
              <Button variant="primary" size="small" disabled>
                Open WhatsApp
              </Button>
            )}
          </SettingsRow>
        </SettingsCard>
      </div>

      {remindersOpen ? (
        <>
          <div className="flex w-full flex-col gap-2">
            <SettingsSectionLabel>Scheduled reminders</SettingsSectionLabel>
            <SettingsCard>
              <SettingsRow
                label="At a set time"
                description="Turn this on to choose a time for breakfast, lunch, and dinner."
              >
                <Switch
                  aria-label="Scheduled reminders"
                  isSelected={scheduledReminders}
                  onChange={onScheduledChange}
                />
              </SettingsRow>
              {scheduledReminders ? (
                <>
                  {(
                    [
                      ["Breakfast", breakfast, setBreakfast, "whatsappBreakfastTime"],
                      ["Lunch", lunch, setLunch, "whatsappLunchTime"],
                      ["Dinner", dinner, setDinner, "whatsappDinnerTime"],
                    ] as [
                      string,
                      Clock,
                      (clock: Clock) => void,
                      "whatsappBreakfastTime" | "whatsappLunchTime" | "whatsappDinnerTime",
                    ][]
                  ).map(([label, clock, setClock, key]) => (
                    <SettingsRow key={label} label={label}>
                      <MealTimeWheel
                        label={label}
                        clock={clock}
                        onChange={(next) => {
                          setClock(next);
                          commitClock(key, next);
                        }}
                      />
                    </SettingsRow>
                  ))}
                </>
              ) : null}
            </SettingsCard>
          </div>

          <div className="flex w-full flex-col gap-2">
            <SettingsSectionLabel>Smart reminders</SettingsSectionLabel>
            <SettingsCard>
              <SettingsRow
                label="If a meal is missing"
                description="Aharika checks whether you logged the meal, and sends a WhatsApp reminder when you have not."
              >
                <Switch
                  aria-label="Smart reminders"
                  isSelected={smartReminders}
                  onChange={onSmartChange}
                />
              </SettingsRow>
            </SettingsCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
