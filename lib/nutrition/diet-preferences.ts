export const DIET_PATTERNS = [
  "vegetarian",
  "eggetarian",
  "non-vegetarian",
  "vegan",
] as const;

export type DietPattern = (typeof DIET_PATTERNS)[number];

export const ALLERGY_OPTIONS = ["milk", "peanut", "wheat", "egg"] as const;

export type AllergyOption = (typeof ALLERGY_OPTIONS)[number];

const DIET_SET = new Set<string>(DIET_PATTERNS);
const ALLERGY_SET = new Set<string>(ALLERGY_OPTIONS);

export function parseDietPattern(value: unknown): DietPattern | null {
  if (typeof value !== "string") return null;
  return DIET_SET.has(value) ? (value as DietPattern) : null;
}

export function parseAllergies(value: unknown): AllergyOption[] {
  if (!Array.isArray(value)) return [];
  const selected: AllergyOption[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && ALLERGY_SET.has(entry) && !selected.includes(entry as AllergyOption)) {
      selected.push(entry as AllergyOption);
    }
  }
  return selected;
}

export function parseAllergyNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 80);
  return trimmed.length > 0 ? trimmed : null;
}

export function dietConstraintLines(input: {
  dietPattern: DietPattern | null;
  allergies: readonly string[];
  allergyNote: string | null;
}) {
  const lines: string[] = [];
  if (input.dietPattern) {
    lines.push(
      `Diet pattern: ${input.dietPattern}. Suggest foods that fit this pattern.`,
    );
  }
  const avoided = [...input.allergies];
  if (input.allergyNote) avoided.push(input.allergyNote);
  if (avoided.length > 0) {
    lines.push(
      `Do not suggest these foods: ${avoided.join(", ")}. Treat this as a food constraint only. Do not give medical advice about allergies.`,
    );
  }
  return lines;
}
