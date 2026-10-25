"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { RiMailLine, RiUserLine } from "@remixicon/react";
import { useSession } from "next-auth/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { guestRegex, withBasePath } from "@/lib/constants";
import {
  ALLERGY_OPTIONS,
  DIET_PATTERNS,
  parseAllergies,
  parseAllergyNote,
  parseDietPattern,
  type AllergyOption,
  type DietPattern,
} from "@/lib/nutrition/diet-preferences";
import { cx } from "@/utils/cx";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
  SettingsValueField,
} from "./settings-rows";
import { SETTINGS_CONTROL_WIDTH, SETTINGS_SELECT_TRIGGER } from "./settings-control-width";
import { SettingsDailyGoals } from "./settings-daily-goals";

const DIET_LABELS: Record<DietPattern, string> = {
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  "non-vegetarian": "Non-vegetarian",
  vegan: "Vegan",
};

const ALLERGY_LABELS: Record<AllergyOption, string> = {
  milk: "Milk",
  peanut: "Peanut",
  wheat: "Wheat",
  egg: "Egg",
};

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

  const isGuest =
    session?.user?.type === "guest" ||
    guestRegex.test(session?.user?.email ?? "");

  const email = session?.user?.email ?? "";
  const displayEmail = isGuest ? "Trial guest account" : email;
  const displayName =
    session?.user?.name?.trim() ||
    (email && !isGuest && email.includes("@") ? email.split("@")[0] : "");

  const [dietPattern, setDietPattern] = useState<DietPattern | null>(null);
  const [allergies, setAllergies] = useState<AllergyOption[]>([]);
  const [allergyNote, setAllergyNote] = useState("");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(withBasePath("/api/nutrition/preferences"));
        if (!response.ok) return;
        const data = (await response.json()) as {
          allergies?: unknown;
          allergyNote?: string | null;
          dietPattern?: unknown;
        };
        if (!cancelled) {
          setDietPattern(parseDietPattern(data.dietPattern));
          setAllergies(parseAllergies(data.allergies));
          setAllergyNote(data.allergyNote ?? "");
        }
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const saveDietFields = async (body: {
    allergies?: AllergyOption[];
    allergyNote?: string | null;
    dietPattern?: DietPattern | null;
  }) => {
    if (isGuest) return;
    try {
      await fetch(withBasePath("/api/nutrition/preferences"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved?.();
    } catch {
      // Keep the selected values on screen if the request fails.
    }
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
        <SettingsSectionLabel>Diet</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Diet pattern"
            description={
              isGuest
                ? "Create an account to save a diet pattern"
                : "Leave this empty when you have no restriction"
            }
          >
            <Select
              aria-label="Diet pattern"
              selectedKey={dietPattern ?? "none"}
              onSelectionChange={(key) => {
                if (isGuest || key === null) return;
                const next = key === "none" ? null : parseDietPattern(String(key));
                setDietPattern(next);
                void saveDietFields({ dietPattern: next });
              }}
              isDisabled={!prefsLoaded || isGuest}
              className={SETTINGS_CONTROL_WIDTH}
              triggerClassName={SETTINGS_SELECT_TRIGGER}
            >
              <SelectItem id="none" textValue="No restriction">
                No restriction
              </SelectItem>
              {DIET_PATTERNS.map((pattern) => (
                <SelectItem key={pattern} id={pattern} textValue={DIET_LABELS[pattern]}>
                  {DIET_LABELS[pattern]}
                </SelectItem>
              ))}
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Allergies"
            description={
              isGuest
                ? "Create an account to save foods you avoid"
                : "Aharika will avoid suggesting these foods"
            }
            className="sm:grid sm:grid-cols-[minmax(0,60%)_minmax(0,40%)] sm:items-center sm:gap-0"
            controlClassName="sm:w-full"
            labelClassName="sm:w-full"
          >
            <div className="grid w-full grid-cols-2 gap-x-2 gap-y-1">
              {ALLERGY_OPTIONS.map((option) => (
                <Checkbox
                  key={option}
                  size="sm"
                  className="min-h-8 whitespace-nowrap rounded-lg px-1 py-0.5"
                  isSelected={allergies.includes(option)}
                  isDisabled={!prefsLoaded || isGuest}
                  onChange={(selected) => {
                    const next = selected
                      ? [...allergies, option]
                      : allergies.filter((item) => item !== option);
                    setAllergies(next);
                    void saveDietFields({ allergies: next });
                  }}
                >
                  {ALLERGY_LABELS[option]}
                </Checkbox>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow
            label="Other foods to avoid"
            description={isGuest ? "Create an account to save a note" : "Optional, up to 80 characters"}
          >
            <Input
              aria-label="Other foods to avoid"
              size="small"
              maxLength={80}
              value={allergyNote}
              isDisabled={!prefsLoaded || isGuest}
              placeholder="For example, mushroom"
              onChange={setAllergyNote}
              onBlur={() => {
                const next = parseAllergyNote(allergyNote);
                setAllergyNote(next ?? "");
                void saveDietFields({ allergyNote: next });
              }}
              className={SETTINGS_CONTROL_WIDTH}
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
    </div>
  ));
}
