const PORTION_GRAMS: Record<string, number> = {
  bowl: 180,
  cup: 200,
  glass: 250,
  katori: 120,
  medium: 100,
  piece: 40,
  plate: 250,
  serving: 100,
  tbsp: 15,
  tsp: 5,
};

export function gramsFromPortion(quantity: number, unit: string) {
  const key = unit.trim().toLowerCase();
  const gramsPerUnit = PORTION_GRAMS[key] ?? PORTION_GRAMS.serving;
  return quantity * gramsPerUnit;
}

export function parseQuantityPhrase(quantity: number, unit: string) {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === "g" || normalizedUnit === "gram" || normalizedUnit === "grams") {
    return { grams: quantity, assumed: false };
  }
  return { grams: gramsFromPortion(quantity, normalizedUnit), assumed: true };
}
