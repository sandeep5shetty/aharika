const NUTRITION_PATTERN =
  /\b(meal|meals|eat|ate|eating|food|foods|calorie|calories|kcal|macro|protein|carbs?|fat|fiber|breakfast|lunch|dinner|snack|log(?:ged|ging)?|dashboard|goal|nutrition|grams?|gm|roti|chapati|dal|rice|curd|biryani|snacks?|intake|diet|hungry|portion|serving|indb|track)\b/i;

const OFF_TOPIC_PATTERN =
  /\b(code|coding|program(?:ming)?|algorithm|script|function|leetcode|homework|assignment|essay|poem|story|joke|translate|debug|compiler|api\s+design)\b/i;

const CODE_LANG_PATTERN =
  /\b(java|python|javascript|typescript|c\+\+|c#|html|css|sql|ruby|golang|kotlin|swift|react|node\.?js)\b/i;

export const OFF_TOPIC_REFUSAL =
  "I'm your nutrition coach — I only help with meals, calories, macros, and your goals in this app. I can't help with coding or other general tasks. Tell me what you ate (for example, lunch today) or ask how you're doing on your targets.";

export function getUserMessageText(
  parts: Array<{ type: string; text?: string }> | undefined
): string {
  if (!parts) {
    return "";
  }
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function isOffTopicUserMessage(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return false;
  }
  if (NUTRITION_PATTERN.test(normalized)) {
    return false;
  }
  if (OFF_TOPIC_PATTERN.test(normalized)) {
    return true;
  }
  if (
    CODE_LANG_PATTERN.test(normalized) &&
    /\b(add|write|print|implement|create|build|solve|show|give)\b/i.test(
      normalized
    )
  ) {
    return true;
  }
  return false;
}
