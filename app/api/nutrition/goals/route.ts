import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getGoalForUser,
  upsertGoalForUser,
  upsertUserPreferenceFields,
} from "@/lib/db/nutrition-queries";
import { bodyProfileForEstimateSchema } from "@/lib/nutrition/body-profile";
import { computeGoalsFromProfile, goalsFromRow } from "@/lib/nutrition/goals";
import { ChatbotError } from "@/lib/errors";
import { guestLimitResponse } from "@/lib/guest-limits";

const goalsSchema = z.object({
  calories: z.number().int().positive(),
  proteinG: z.number().int().positive(),
  carbsG: z.number().int().positive(),
  fatG: z.number().int().positive(),
  fiberG: z.number().int().positive(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const row = await getGoalForUser(session.user.id);
  return Response.json(goalsFromRow(row));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const json = await request.json();
  const parsed = bodyProfileForEstimateSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await upsertUserPreferenceFields(session.user.id, {
    activity: parsed.data.activity,
    age: parsed.data.age,
    heightCm: parsed.data.heightCm,
    sex: parsed.data.sex,
    weightKg: parsed.data.weightKg,
  });

  const goals = computeGoalsFromProfile(parsed.data);
  const saved = await upsertGoalForUser(session.user.id, goals);
  return Response.json(goalsFromRow(saved));
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const json = await request.json();
  const parsed = goalsSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }
  if (session.user.type === "guest") {
    return guestLimitResponse("meal_logging");
  }

  const saved = await upsertGoalForUser(session.user.id, {
    ...parsed.data,
    isDefault: parsed.data.isDefault ?? false,
  });

  return Response.json(goalsFromRow(saved));
}
