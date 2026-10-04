import { z } from "zod";

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const bodyProfileSchema = z.object({
  activity: z.enum(ACTIVITY_LEVELS).optional(),
  age: z.number().int().min(10).max(100).optional(),
  heightCm: z.number().positive().max(250).optional(),
  sex: z.enum(["male", "female"]).optional(),
  weightKg: z.number().positive().max(300).optional(),
});

export const bodyProfileForEstimateSchema = z.object({
  activity: z.enum(ACTIVITY_LEVELS),
  age: z.number().int().min(10).max(100),
  heightCm: z.number().positive().max(250),
  sex: z.enum(["male", "female"]),
  weightKg: z.number().positive().max(300),
});

export type BodyProfile = {
  activity: ActivityLevel | null;
  age: number | null;
  heightCm: number | null;
  sex: "male" | "female" | null;
  weightKg: number | null;
};

export const EMPTY_BODY_PROFILE: BodyProfile = {
  activity: null,
  age: null,
  heightCm: null,
  sex: null,
  weightKg: null,
};

export function bodyProfileFromPreferenceRow(row: {
  activity?: string | null;
  age?: number | null;
  heightCm?: number | null;
  sex?: string | null;
  weightKg?: number | null;
} | undefined): BodyProfile {
  if (!row) {
    return { ...EMPTY_BODY_PROFILE };
  }
  const activity =
    row.activity && ACTIVITY_LEVELS.includes(row.activity as ActivityLevel)
      ? (row.activity as ActivityLevel)
      : null;
  const sex = row.sex === "male" || row.sex === "female" ? row.sex : null;
  return {
    activity,
    age: row.age ?? null,
    heightCm: row.heightCm ?? null,
    sex,
    weightKg: row.weightKg ?? null,
  };
}
