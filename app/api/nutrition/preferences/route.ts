import { z } from "zod";
import {
  parseAllergies,
  parseAllergyNote,
  parseDietPattern,
} from "@/lib/nutrition/diet-preferences";
import { parseWhatsappPhone, parseWhatsappTime } from "@/lib/nutrition/whatsapp";
import { auth } from "@/lib/auth";
import {
  getUserPreferenceRow,
  upsertUserPreferenceFields,
} from "@/lib/db/nutrition-queries";
import { bodyProfileFromPreferenceRow, bodyProfileSchema } from "@/lib/nutrition/body-profile";
import { ChatbotError } from "@/lib/errors";

function reminderFields(row: Awaited<ReturnType<typeof getUserPreferenceRow>>) {
  return {
    whatsappPhone: parseWhatsappPhone(row?.whatsappPhone),
    whatsappRemindersEnabled: row?.whatsappRemindersEnabled === true,
    whatsappScheduledEnabled: row?.whatsappScheduledEnabled === true,
    whatsappSmartEnabled: row?.whatsappSmartEnabled === true,
    whatsappBreakfastTime: parseWhatsappTime(row?.whatsappBreakfastTime),
    whatsappLunchTime: parseWhatsappTime(row?.whatsappLunchTime),
    whatsappDinnerTime: parseWhatsappTime(row?.whatsappDinnerTime),
  };
}

const patchSchema = z
  .object({
    timezone: z.string().min(1).max(64),
    activity: z.enum(["sedentary", "light", "moderate", "active"]).nullable().optional(),
    age: z.number().int().min(10).max(100).nullable().optional(),
    heightCm: z.number().positive().max(250).nullable().optional(),
    sex: z.enum(["male", "female"]).nullable().optional(),
    weightKg: z.number().positive().max(300).nullable().optional(),
    allergies: z.array(z.string()).optional(),
    allergyNote: z.string().max(80).nullable().optional(),
    coachMemoryEnabled: z.boolean().optional(),
    dietPattern: z.string().max(32).nullable().optional(),
    mealNudgesEnabled: z.boolean().optional(),
    whatsappPhone: z.string().max(20).nullable().optional(),
    whatsappRemindersEnabled: z.boolean().optional(),
    whatsappScheduledEnabled: z.boolean().optional(),
    whatsappSmartEnabled: z.boolean().optional(),
    whatsappBreakfastTime: z.string().max(5).nullable().optional(),
    whatsappLunchTime: z.string().max(5).nullable().optional(),
    whatsappDinnerTime: z.string().max(5).nullable().optional(),
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

  return Response.json({
    allergies: parseAllergies(row?.allergies),
    allergyNote: row?.allergyNote ?? null,
    timezone,
    bodyProfile,
    coachMemoryEnabled: row?.coachMemoryEnabled !== false,
    dietPattern: parseDietPattern(row?.dietPattern),
    mealNudgesEnabled: row?.mealNudgesEnabled !== false,
    ...reminderFields(row),
  });
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

  const {
    timezone,
    allergies,
    allergyNote,
    coachMemoryEnabled,
    dietPattern,
    mealNudgesEnabled,
    whatsappPhone,
    whatsappRemindersEnabled,
    whatsappScheduledEnabled,
    whatsappSmartEnabled,
    whatsappBreakfastTime,
    whatsappLunchTime,
    whatsappDinnerTime,
    ...bodyFields
  } = parsed.data;
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
  if (allergies !== undefined) patch.allergies = parseAllergies(allergies);
  if (allergyNote !== undefined) patch.allergyNote = parseAllergyNote(allergyNote);
  if (coachMemoryEnabled !== undefined) {
    patch.coachMemoryEnabled = coachMemoryEnabled;
  }
  if (dietPattern !== undefined) patch.dietPattern = parseDietPattern(dietPattern);
  if (mealNudgesEnabled !== undefined) {
    patch.mealNudgesEnabled = mealNudgesEnabled;
  }
  if (whatsappPhone !== undefined) {
    patch.whatsappPhone = parseWhatsappPhone(whatsappPhone);
  }
  if (whatsappRemindersEnabled !== undefined) {
    patch.whatsappRemindersEnabled = whatsappRemindersEnabled;
  }
  if (whatsappScheduledEnabled !== undefined) {
    patch.whatsappScheduledEnabled = whatsappScheduledEnabled;
  }
  if (whatsappSmartEnabled !== undefined) {
    patch.whatsappSmartEnabled = whatsappSmartEnabled;
  }
  if (whatsappBreakfastTime !== undefined) {
    patch.whatsappBreakfastTime = parseWhatsappTime(whatsappBreakfastTime);
  }
  if (whatsappLunchTime !== undefined) {
    patch.whatsappLunchTime = parseWhatsappTime(whatsappLunchTime);
  }
  if (whatsappDinnerTime !== undefined) {
    patch.whatsappDinnerTime = parseWhatsappTime(whatsappDinnerTime);
  }

  await upsertUserPreferenceFields(session.user.id, patch);

  const row = await getUserPreferenceRow(session.user.id);
  return Response.json({
    timezone: row?.timezone ?? "Asia/Kolkata",
    bodyProfile: bodyProfileFromPreferenceRow(row),
    allergies: parseAllergies(row?.allergies),
    allergyNote: row?.allergyNote ?? null,
    coachMemoryEnabled: row?.coachMemoryEnabled !== false,
    dietPattern: parseDietPattern(row?.dietPattern),
    mealNudgesEnabled: row?.mealNudgesEnabled !== false,
    ...reminderFields(row),
  });
}
