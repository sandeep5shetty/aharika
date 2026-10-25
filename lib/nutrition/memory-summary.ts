export const MEMORY_NOTE_CAP = 12;

export type SummaryPayload = {
  typicalBreakfast: string | null;
  typicalLunch: string | null;
  typicalDinner: string | null;
  typicalSnacks: string | null;
  mealTimeBreakfast: string | null;
  mealTimeLunch: string | null;
  mealTimeDinner: string | null;
  avgDailyCalories7d: number | null;
  frequentFoods: string[];
  notes: string[];
};

export function normalizeMemoryNote(note: string) {
  return note.trim().replace(/\s+/g, " ");
}

/** Keep the newest unique notes, capped so refreshes cannot grow the list forever. */
export function mergeMemoryNotes(prior: string[], incoming: string[], cap = MEMORY_NOTE_CAP) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const note of [...prior, ...incoming]) {
    const cleaned = normalizeMemoryNote(note);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(cleaned);
  }

  return merged.slice(-cap);
}

export function toStoredSummary(object: SummaryPayload, priorNotes: string[]) {
  const {
    mealTimeBreakfast,
    mealTimeLunch,
    mealTimeDinner,
    notes: newNotes,
    ...rest
  } = object;

  return {
    ...rest,
    usualMealTimes: {
      breakfast: mealTimeBreakfast,
      lunch: mealTimeLunch,
      dinner: mealTimeDinner,
    },
    notes: mergeMemoryNotes(priorNotes, newNotes ?? []),
  };
}
