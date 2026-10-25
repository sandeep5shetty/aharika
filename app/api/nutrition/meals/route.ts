import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getMealById,
  updateMealRecord,
  deleteMealRecord,
} from "@/lib/db/nutrition-queries";
import { scaleMealItems, sumMealItems } from "@/lib/nutrition/meal-patch";
import { ChatbotError } from "@/lib/errors";
import { guestLimitResponse, isGuestSession } from "@/lib/guest-limits";

const patchSchema = z
  .object({
    id: z.string().uuid(),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    portionScale: z.number().positive().max(5).optional(),
    rawText: z.string().trim().min(1).max(500).optional(),
    confidence: z.enum(["High", "Medium", "Low"]).optional(),
  })
  .refine(
    (value) =>
      value.mealType !== undefined ||
      value.portionScale !== undefined ||
      value.rawText !== undefined ||
      value.confidence !== undefined,
    { message: "At least one field is required" },
  );

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  await deleteMealRecord(id, session.user.id);
  return Response.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }
  if (isGuestSession(session)) {
    return guestLimitResponse("meal_logging");
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

  const existing = await getMealById(parsed.data.id, session.user.id);
  if (!existing) {
    return new ChatbotError("not_found:chat").toResponse();
  }

  const shouldScale =
    parsed.data.portionScale !== undefined && parsed.data.portionScale !== 1;
  const items = shouldScale
    ? scaleMealItems(
        existing.items as import("@/lib/types").MealItemBreakdown[],
        parsed.data.portionScale ?? 1,
      )
    : (existing.items as import("@/lib/types").MealItemBreakdown[]);

  const totals = sumMealItems(items);

  const updated = await updateMealRecord(parsed.data.id, session.user.id, {
    calories: totals.calories,
    carbsG: totals.carbsG,
    fatG: totals.fatG,
    fiberG: totals.fiberG,
    items,
    mealType: parsed.data.mealType,
    proteinG: totals.proteinG,
    rawText: parsed.data.rawText,
    confidence: parsed.data.confidence,
  });

  if (!updated) {
    return new ChatbotError("not_found:chat").toResponse();
  }

  return Response.json({
    calories: updated.calories,
    carbsG: updated.carbsG,
    fatG: updated.fatG,
    fiberG: updated.fiberG,
    id: updated.id,
    items: updated.items,
    mealType: updated.mealType,
    proteinG: updated.proteinG,
    rawText: updated.rawText,
    confidence: updated.confidence,
  });
}
