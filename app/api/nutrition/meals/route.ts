import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getMealById,
  updateMealRecord,
  deleteMealRecord,
} from "@/lib/db/nutrition-queries";
import { scaleMealItems, sumMealItems } from "@/lib/nutrition/meal-patch";
import { ChatbotError } from "@/lib/errors";
import { guestLimitResponse } from "@/lib/guest-limits";

const patchSchema = z.object({
  id: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  portionScale: z.number().positive().max(5).optional(),
});

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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
  if (session.user.type === "guest") {
    return guestLimitResponse("meal_logging");
  }

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

  const items = parsed.data.portionScale
    ? scaleMealItems(
        existing.items as import("@/lib/types").MealItemBreakdown[],
        parsed.data.portionScale
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
  });
}
