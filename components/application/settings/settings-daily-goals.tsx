"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Key,
  type MutableRefObject,
} from "react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import type { ActivityLevel, BodyProfile } from "@/lib/nutrition/body-profile";
import type { UserGoals } from "@/lib/nutrition/goals";
import { withBasePath } from "@/lib/constants";
import { notifyNutritionDataUpdated } from "@/lib/nutrition/events";
import { SettingsCard, SettingsRow } from "./settings-rows";

const SELECT_TRIGGER = "h-8 w-full max-w-[202px] gap-1 rounded-lg px-2 py-1.5";

type GoalField = keyof Pick<UserGoals, "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG">;

const GOAL_FIELDS: { key: GoalField; label: string; suffix: string }[] = [
  { key: "calories", label: "Calories", suffix: "kcal" },
  { key: "proteinG", label: "Protein", suffix: "g" },
  { key: "carbsG", label: "Carbs", suffix: "g" },
  { key: "fatG", label: "Fat", suffix: "g" },
  { key: "fiberG", label: "Fiber", suffix: "g" },
];

const ACTIVITY_OPTIONS = [
  { id: "sedentary", label: "Mostly seated" },
  { id: "light", label: "Light activity" },
  { id: "moderate", label: "Moderate activity" },
  { id: "active", label: "Very active" },
] as const;

function parsePositiveInt(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePositiveFloat(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function applyBodyProfileToForm(
  profile: BodyProfile,
  setters: {
    setSex: (value: "male" | "female") => void;
    setActivity: (value: ActivityLevel) => void;
    setAge: (value: string) => void;
    setWeightKg: (value: string) => void;
    setHeightCm: (value: string) => void;
  }
) {
  if (profile.sex) setters.setSex(profile.sex);
  if (profile.activity) setters.setActivity(profile.activity);
  if (profile.age !== null) setters.setAge(String(profile.age));
  if (profile.weightKg !== null) setters.setWeightKg(String(profile.weightKg));
  if (profile.heightCm !== null) setters.setHeightCm(String(profile.heightCm));
}

export function SettingsDailyGoals({
  onSaved,
  variant = "profile",
}: {
  onSaved?: () => void;
  /** `modal` — daily goals dialog; `profile` — settings profile (estimator open by default). */
  variant?: "profile" | "modal";
}) {
  const localize = useTemplateCopy();
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [draft, setDraft] = useState<Record<GoalField, string>>({
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    fiberG: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(variant === "profile");
  const [sex, setSex] = useState<"male" | "female">("female");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [age, setAge] = useState("28");
  const [weightKg, setWeightKg] = useState("65");
  const [heightCm, setHeightCm] = useState("165");
  const committedAge = useRef(age);
  const committedWeight = useRef(weightKg);
  const committedHeight = useRef(heightCm);

  const persistBodyProfile = useCallback(
    async (patch: {
      sex?: "male" | "female";
      activity?: ActivityLevel;
      age?: number;
      weightKg?: number;
      heightCm?: number;
    }) => {
      try {
        const response = await fetch(withBasePath("/api/nutrition/preferences"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!response.ok) return;
      } catch {
        // keep local values
      }
    },
    [],
  );

  const loadGoals = useCallback(async () => {
    try {
      const [goalsResponse, prefsResponse] = await Promise.all([
        fetch(withBasePath("/api/nutrition/goals")),
        fetch(withBasePath("/api/nutrition/preferences")),
      ]);
      if (goalsResponse.ok) {
        const data = (await goalsResponse.json()) as UserGoals;
        setGoals(data);
        setDraft({
          calories: String(data.calories),
          proteinG: String(data.proteinG),
          carbsG: String(data.carbsG),
          fatG: String(data.fatG),
          fiberG: String(data.fiberG),
        });
      }
      if (prefsResponse.ok) {
        const prefs = (await prefsResponse.json()) as { bodyProfile: BodyProfile };
        applyBodyProfileToForm(prefs.bodyProfile, {
          setSex,
          setActivity,
          setAge,
          setWeightKg,
          setHeightCm,
        });
        committedAge.current =
          prefs.bodyProfile.age !== null ? String(prefs.bodyProfile.age) : committedAge.current;
        committedWeight.current =
          prefs.bodyProfile.weightKg !== null
            ? String(prefs.bodyProfile.weightKg)
            : committedWeight.current;
        committedHeight.current =
          prefs.bodyProfile.heightCm !== null
            ? String(prefs.bodyProfile.heightCm)
            : committedHeight.current;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const saveGoals = async () => {
    const payload = {
      calories: parsePositiveInt(draft.calories),
      proteinG: parsePositiveInt(draft.proteinG),
      carbsG: parsePositiveInt(draft.carbsG),
      fatG: parsePositiveInt(draft.fatG),
      fiberG: parsePositiveInt(draft.fiberG),
    };
    if (Object.values(payload).some((v) => v === null)) return;

    setSaving(true);
    try {
      const response = await fetch(withBasePath("/api/nutrition/goals"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, isDefault: false }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as UserGoals;
      setGoals(data);
      setDraft({
        calories: String(data.calories),
        proteinG: String(data.proteinG),
        carbsG: String(data.carbsG),
        fatG: String(data.fatG),
        fiberG: String(data.fiberG),
      });
      notifyNutritionDataUpdated();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const commitNumericProfileField = (
    field: "age" | "weightKg" | "heightCm",
    value: string,
    committed: MutableRefObject<string>
  ) => {
    if (value === committed.current) return;
    committed.current = value;
    if (field === "age") {
      const parsed = parsePositiveInt(value);
      if (parsed !== null && parsed >= 10 && parsed <= 100) {
        void persistBodyProfile({ age: parsed });
      }
      return;
    }
    const parsed = parsePositiveFloat(value);
    if (parsed === null) return;
    if (field === "weightKg") void persistBodyProfile({ weightKg: parsed });
    if (field === "heightCm") void persistBodyProfile({ heightCm: parsed });
  };

  const estimateFromProfile = async () => {
    const profile = {
      sex,
      activity,
      age: parsePositiveInt(age) ?? 28,
      weightKg: parsePositiveFloat(weightKg),
      heightCm: parsePositiveFloat(heightCm),
    };
    if (profile.weightKg === null || profile.heightCm === null) return;

    setSaving(true);
    try {
      const response = await fetch(withBasePath("/api/nutrition/goals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) return;
      const data = (await response.json()) as UserGoals;
      setGoals(data);
      setDraft({
        calories: String(data.calories),
        proteinG: String(data.proteinG),
        carbsG: String(data.carbsG),
        fatG: String(data.fatG),
        fiberG: String(data.fiberG),
      });
      notifyNutritionDataUpdated();
      committedAge.current = age;
      committedWeight.current = weightKg;
      committedHeight.current = heightCm;
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const estimatorToggle = (
    <button
      type="button"
      onClick={() => setEstimateOpen((open) => !open)}
      className="w-fit cursor-pointer px-3 text-start text-body-medium text-accent-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
    >
      {estimateOpen ? "Hide estimator" : "Estimate from height & weight"}
    </button>
  );

  const estimatorCard = estimateOpen ? (
    <SettingsCard>
      <SettingsRow label="Sex">
        <Select
          aria-label="Sex"
          selectedKey={sex}
          onSelectionChange={(key) => {
            if (key === "male" || key === "female") {
              setSex(key);
              void persistBodyProfile({ sex: key });
            }
          }}
          className="w-[202px] shrink-0"
          triggerClassName={SELECT_TRIGGER}
        >
          <SelectItem id="female" textValue="Female">Female</SelectItem>
          <SelectItem id="male" textValue="Male">Male</SelectItem>
        </Select>
      </SettingsRow>
      <SettingsRow label="Age">
        <Input
          size="small"
          type="number"
          inputMode="numeric"
          aria-label="Age"
          value={age}
          onChange={setAge}
          onBlur={() => commitNumericProfileField("age", age, committedAge)}
          className="w-[202px] shrink-0 tabular-nums"
        />
      </SettingsRow>
      <SettingsRow label="Weight (kg)">
        <Input
          size="small"
          type="number"
          inputMode="decimal"
          aria-label="Weight in kilograms"
          value={weightKg}
          onChange={setWeightKg}
          onBlur={() => commitNumericProfileField("weightKg", weightKg, committedWeight)}
          className="w-[202px] shrink-0 tabular-nums"
        />
      </SettingsRow>
      <SettingsRow label="Height (cm)">
        <Input
          size="small"
          type="number"
          inputMode="decimal"
          aria-label="Height in centimeters"
          value={heightCm}
          onChange={setHeightCm}
          onBlur={() => commitNumericProfileField("heightCm", heightCm, committedHeight)}
          className="w-[202px] shrink-0 tabular-nums"
        />
      </SettingsRow>
      <SettingsRow label="Activity">
        <Select
          aria-label="Activity level"
          selectedKey={activity}
          onSelectionChange={(key: Key | null) => {
            if (key === "sedentary" || key === "light" || key === "moderate" || key === "active") {
              setActivity(key);
              void persistBodyProfile({ activity: key });
            }
          }}
          className="w-[202px] shrink-0"
          triggerClassName={SELECT_TRIGGER}
        >
          {ACTIVITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>
      </SettingsRow>
      <SettingsRow label="Apply estimate">
        <Button variant="secondary" size="small" disabled={saving} onClick={estimateFromProfile}>
          {saving ? "Saving…" : "Calculate & save"}
        </Button>
      </SettingsRow>
    </SettingsCard>
  ) : null;

  if (loading) {
    return localize((
      <p className="px-3 text-body-medium text-text-tertiary">Loading your targets…</p>
    ));
  }

  if (variant === "profile") {
    return localize((
      <div className="flex w-full flex-col gap-2">
        {estimatorToggle}
        {estimatorCard}
        {goals && !goals.isDefault ? (
          <p className="px-3 text-body-2-regular text-text-secondary">
            Saved targets: {goals.calories} kcal · {goals.proteinG}g protein · {goals.carbsG}g carbs ·{" "}
            {goals.fatG}g fat · {goals.fiberG}g fiber. Fine-tune numbers in Daily targets (sidebar).
          </p>
        ) : goals?.isDefault ? (
          <p className="px-3 text-body-2-regular text-text-tertiary">
            You&apos;re on starter targets. Run the estimator or set custom macros from Daily targets in the sidebar.
          </p>
        ) : null}
      </div>
    ));
  }

  return localize((
    <div className="flex w-full flex-col gap-2">
      <SettingsCard>
        {GOAL_FIELDS.map(({ key, label, suffix }) => (
          <SettingsRow key={key} label={label} description={`Daily ${suffix} target`}>
            <Input
              size="small"
              type="number"
              inputMode="numeric"
              aria-label={label}
              value={draft[key]}
              onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
              className="w-[202px] shrink-0 tabular-nums"
            />
          </SettingsRow>
        ))}
        <SettingsRow label="Save targets">
          <Button variant="primary" size="small" disabled={saving} onClick={saveGoals}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SettingsRow>
      </SettingsCard>

      <div className="flex flex-col gap-2">
        {estimatorToggle}
        {estimatorCard}
        {goals?.isDefault ? (
          <p className="px-3 text-body-2-regular text-text-tertiary">
            You&apos;re on starter targets. Adjust the numbers above or use the estimator.
          </p>
        ) : null}
      </div>
    </div>
  ));
}
