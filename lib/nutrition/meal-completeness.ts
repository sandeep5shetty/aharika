const GENERIC_NAME =
  /^(food|meal|something|stuff|dish|snack|item|things?)$/i;
const VAGUE_UNIT = /^(some|bit|a bit|serving|plate|bowl|handful)$/i;

export type MealCompletenessItem = {
  name: string;
  quantity: number;
  unit: string;
  foodId?: string;
  estimatedMacros?: unknown;
};

export type MealCompleteness = {
  followUp: string | null;
  warnings: string[];
};

export function inspectMealCompleteness(input: {
  rawText?: string;
  items: MealCompletenessItem[];
}): MealCompleteness {
  const warnings: string[] = [];

  if (!input.rawText?.trim()) {
    warnings.push("Add a short description of what was eaten.");
  }

  for (const item of input.items) {
    const name = item.name.trim();
    if (!name || GENERIC_NAME.test(name)) {
      warnings.push("Name the food more specifically than a generic meal.");
      continue;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      warnings.push(`How much ${name} was it?`);
      continue;
    }
    if (VAGUE_UNIT.test(item.unit.trim())) {
      warnings.push(`About how many grams or pieces of ${name}?`);
    } else if (item.estimatedMacros && !item.foodId) {
      warnings.push(`${name} will be saved as a low-confidence estimate.`);
    }
  }

  const unique = [...new Set(warnings)];
  return {
    followUp: unique[0] ?? null,
    warnings: unique,
  };
}
