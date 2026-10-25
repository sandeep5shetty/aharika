const CLINICAL_PATTERN =
  /\b(allerg(?:y|ic|ies)?|anaphyl|diagnos(?:e|is|ed)|medication|medicine|insulin|cancer|thyroid|diabetes|disease|disorder|symptom|prescription|clinical|anorexia|bulimia|purging|coeliac|celiac)\b/i;

const DIETARY_PREFERENCE_PATTERN =
  /\b(vegetarian|vegan|jain|eggetarian|no onion|no garlic|usually|prefer|skip|habit)\b/i;

export const MEDICAL_ADVICE_REFUSAL =
  "I can't diagnose conditions or prescribe a clinical diet. For medical questions, allergies, or symptoms, please talk with a qualified clinician. I can still help you log everyday meals and track general calories and macros.";

export const UNSAFE_GOAL_MESSAGE =
  "That target is too low for general nutrition tracking. I can help with everyday meals and balanced goals, but very low calorie or protein targets need a qualified clinician.";

export const MIN_SAFE_CALORIES = 1200;
export const MIN_SAFE_PROTEIN_G = 40;

export function isMedicalAdviceRequest(text: string) {
  const normalized = text.trim();
  if (!normalized) return false;
  return CLINICAL_PATTERN.test(normalized);
}

/** Medical conditions and allergies stay out of coach memory. Everyday food habits can be stored. */
export function isClinicalMemoryNote(note: string) {
  const cleaned = note.trim();
  if (!cleaned) return false;
  if (!CLINICAL_PATTERN.test(cleaned)) return false;
  if (
    DIETARY_PREFERENCE_PATTERN.test(cleaned) &&
    !/\b(allerg|diagnos|medication|disease|disorder|symptom|prescription|insulin)\b/i.test(cleaned)
  ) {
    return false;
  }
  return true;
}

export function unsafeGoalReason(goals: { calories: number; proteinG: number }) {
  if (goals.calories < MIN_SAFE_CALORIES || goals.proteinG < MIN_SAFE_PROTEIN_G) {
    return UNSAFE_GOAL_MESSAGE;
  }
  return null;
}
