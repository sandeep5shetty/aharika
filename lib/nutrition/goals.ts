import type { Goal } from "@/lib/db/schema";

export const DEFAULT_GOALS = {
  calories: 2000,
  proteinG: 60,
  carbsG: 250,
  fatG: 65,
  fiberG: 30,
  isDefault: true,
} as const;

export type UserGoals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isDefault: boolean;
};

export function goalsFromRow(row: Goal | undefined): UserGoals {
  if (!row) {
    return { ...DEFAULT_GOALS };
  }
  return {
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fiberG: row.fiberG,
    isDefault: row.isDefault,
  };
}

export function computeGoalsFromProfile(profile: {
  age: number;
  sex: "male" | "female";
  weightKg: number;
  heightCm: number;
  activity: "sedentary" | "light" | "moderate" | "active";
}) {
  const bmr =
    profile.sex === "male"
      ? 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5
      : 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;

  const activityMultiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  }[profile.activity];

  const calories = Math.round(bmr * activityMultiplier);
  const proteinG = Math.round(profile.weightKg * 1.2);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

  return {
    calories,
    proteinG,
    carbsG: Math.max(carbsG, 130),
    fatG,
    fiberG: 30,
    isDefault: false,
  };
}
