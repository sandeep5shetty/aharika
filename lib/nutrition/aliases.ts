export const FOOD_ALIASES: Record<string, string[]> = {
  chapati: ["roti", "phulka", "fulka", "chapathi"],
  curd: ["dahi", "yogurt", "yoghurt"],
  rice: ["chawal", "bhat", "steamed rice"],
  dal: ["daal", "lentil curry", "lentils"],
  sabzi: ["sabji", "vegetable curry", "mixed vegetables"],
  idli: ["idly"],
  dosa: ["dosai"],
  poha: ["pohe", "flattened rice"],
  biryani: ["biriyani"],
  paneer: ["cottage cheese"],
};

export function aliasesForFood(canonicalName: string): string[] {
  const key = canonicalName.toLowerCase();
  for (const [canonical, aliases] of Object.entries(FOOD_ALIASES)) {
    if (canonical === key || aliases.some((a) => a === key)) {
      return [canonical, ...aliases];
    }
  }
  return [];
}

export function normalizeFoodQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(FOOD_ALIASES)) {
    if (normalized === canonical || aliases.includes(normalized)) {
      return canonical;
    }
  }
  return normalized;
}
