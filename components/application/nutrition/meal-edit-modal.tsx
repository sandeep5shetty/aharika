"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine } from "@remixicon/react";

import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { useDirection } from "@/components/foundations/direction/direction";
import { withBasePath } from "@/lib/constants";
import { NUTRITION_DATA_UPDATED } from "@/lib/nutrition/events";
import { cx } from "@/utils/cx";

import type { MealItemBreakdown } from "@/lib/types";
import type { NutritionMealRow } from "./nutrition-meals-table";

export type SavedMealEdit = NutritionMealRow & {
  items?: MealItemBreakdown[];
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const CONFIDENCE_OPTIONS = [
  { id: "High", label: "Verified" },
  { id: "Medium", label: "Estimated" },
  { id: "Low", label: "Low confidence" },
] as const;
const PORTION_PRESETS = ["0.5", "1", "1.5", "2"] as const;

type MealEditModalProps = {
  meal: NutritionMealRow | null;
  onClose: () => void;
  onSaved: (meal: SavedMealEdit) => void;
  hint?: string;
};

export function MealEditModal({
  meal,
  onClose,
  onSaved,
  hint = "Update the diary entry without leaving the dashboard.",
}: MealEditModalProps) {
  const direction = useDirection();
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("lunch");
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE_OPTIONS)[number]["id"]>("Medium");
  const [portionScale, setPortionScale] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meal) return;
    setDescription(meal.description);
    const type = MEAL_TYPES.find((entry) => entry === meal.mealType) ?? "lunch";
    setMealType(type);
    const level = meal.confidence.toLowerCase();
    setConfidence(level === "high" ? "High" : level === "low" ? "Low" : "Medium");
    setPortionScale("1");
    setError(null);
  }, [meal]);

  useEffect(() => {
    if (!meal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [meal, onClose]);

  if (!meal || typeof document === "undefined") return null;

  const save = async () => {
    const rawText = description.trim();
    const scale = Number.parseFloat(portionScale);
    if (!rawText || !Number.isFinite(scale) || scale <= 0 || scale > 5) {
      setError("Enter a description and a portion between 0.1 and 5.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(withBasePath("/api/nutrition/meals"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: meal.id,
          rawText,
          mealType,
          confidence,
          ...(scale === 1 ? {} : { portionScale: scale }),
        }),
      });
      if (!response.ok) {
        setError("Could not save this meal.");
        return;
      }
      const data = (await response.json()) as {
        calories: number;
        carbsG: number;
        confidence: string;
        fatG: number;
        fiberG: number;
        items?: MealItemBreakdown[];
        mealType: string;
        proteinG: number;
        rawText: string;
      };
      onSaved({
        ...meal,
        calories: data.calories,
        carbsG: data.carbsG,
        confidence: data.confidence,
        description: data.rawText,
        fatG: data.fatG,
        fiberG: data.fiberG,
        items: data.items,
        mealType: data.mealType,
        proteinG: data.proteinG,
      });
      window.dispatchEvent(new Event(NUTRITION_DATA_UPDATED));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div dir={direction} className="fixed inset-0 z-100 flex items-end justify-center p-2 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Close meal editor"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit meal"
        className={cx(
          "relative flex w-full max-w-lg flex-col gap-4 rounded-3xl bg-background-full p-4 shadow-xs sm:p-6",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-title-3-medium text-text-primary">Edit meal</h2>
            <p className="text-body-2-regular text-text-tertiary">{hint}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={cx(
              "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full",
              "bg-background-tertiary-default text-foreground-icon-secondary",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            <RiCloseLine className="size-4" aria-hidden />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-body-2-medium text-text-secondary">Description</span>
          <Input aria-label="Meal description" value={description} onChange={setDescription} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            aria-label="Meal type"
            selectedKey={mealType}
            onSelectionChange={(key) => {
              if (MEAL_TYPES.includes(key as (typeof MEAL_TYPES)[number])) {
                setMealType(key as (typeof MEAL_TYPES)[number]);
              }
            }}
          >
            {MEAL_TYPES.map((type) => (
              <SelectItem key={type} id={type} textValue={type}>
                <span className="capitalize">{type}</span>
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Status"
            selectedKey={confidence}
            onSelectionChange={(key) => {
              if (key === "High" || key === "Medium" || key === "Low") setConfidence(key);
            }}
          >
            {CONFIDENCE_OPTIONS.map((option) => (
              <SelectItem key={option.id} id={option.id} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body-2-medium text-text-secondary">Portion vs current</span>
          <div className="flex flex-wrap gap-2">
            {PORTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPortionScale(preset)}
                className={cx(
                  "rounded-full border px-3 py-1 text-caption-1-semibold",
                  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  portionScale === preset
                    ? "border-accent-600 bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-50"
                    : "border-border-button-default bg-background-primary-default text-text-secondary",
                )}
              >
                {preset}x
              </button>
            ))}
          </div>
          <Input
            aria-label="Portion scale"
            type="number"
            inputMode="decimal"
            value={portionScale}
            onChange={setPortionScale}
          />
        </div>

        {error ? <p className="text-body-2-regular text-text-error-primary">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="small" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save meal"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
