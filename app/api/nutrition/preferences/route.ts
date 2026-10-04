import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getUserPreferenceRow,
  upsertUserPreferenceFields,
} from "@/lib/db/nutrition-queries";
import { bodyProfileFromPreferenceRow, bodyProfileSchema } from "@/lib/nutrition/body-profile";
import { ChatbotError } from "@/lib/errors";

const patchSchema = z
  .object({
    timezone: z.string().min(1).max(64),
    activity: z.enum(["sedentary", "light", "moderate", "active"]).nullable().optional(),
    age: z.number().int().min(10).max(100).nullable().optional(),
    heightCm: z.number().positive().max(250).nullable().optional(),
    sex: z.enum(["male", "female"]).nullable().optional(),
    weightKg: z.number().positive().max(300).nullable().optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const row = await getUserPreferenceRow(session.user.id);
  const timezone = row?.timezone ?? "Asia/Kolkata";
  const bodyProfile = bodyProfileFromPreferenceRow(row);

  return Response.json({ timezone, bodyProfile });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const { timezone, ...bodyFields } = parsed.data;
  const bodyParsed = bodyProfileSchema.safeParse(bodyFields);
  if (!bodyParsed.success && Object.keys(bodyFields).length > 0) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const patch: Parameters<typeof upsertUserPreferenceFields>[1] = {};
  if (timezone !== undefined) {
    patch.timezone = timezone;
  }
  if (bodyFields.sex !== undefined) patch.sex = bodyFields.sex;
  if (bodyFields.age !== undefined) patch.age = bodyFields.age;
  if (bodyFields.weightKg !== undefined) patch.weightKg = bodyFields.weightKg;
  if (bodyFields.heightCm !== undefined) patch.heightCm = bodyFields.heightCm;
  if (bodyFields.activity !== undefined) patch.activity = bodyFields.activity;

  await upsertUserPreferenceFields(session.user.id, patch);

  const row = await getUserPreferenceRow(session.user.id);
  return Response.json({
    timezone: row?.timezone ?? "Asia/Kolkata",
    bodyProfile: bodyProfileFromPreferenceRow(row),
  });
}
