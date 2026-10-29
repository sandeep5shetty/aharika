import assert from "node:assert/strict";
import { buildNutritionNotifications } from "./build-notifications";
import {
  dietConstraintLines,
  parseAllergies,
  parseAllergyNote,
  parseDietPattern,
} from "./diet-preferences";
import { computeGoalsFromProfile } from "./goals";
import { goalsForRange } from "./day-shared";
import { dueWhatsappReminder } from "./whatsapp-schedule";
import {
  from12Hour,
  isWhatsappSandboxConfigured,
  joinWhatsappLocal,
  parseWhatsappPhone,
  to12Hour,
  whatsappJoinLink,
  reminderBody,
  reminderName,
  splitWhatsappLocal,
  twilioMessageFields,
} from "./whatsapp";
import { inspectMealCompleteness } from "./meal-completeness";
import { mergeMemoryNotes, toStoredSummary } from "./memory-summary";
import {
  expectedMealMinutes,
  isSlotDue,
  parseNudgeNotificationId,
  shouldSkipRecordedNudge,
} from "./nudge-timing";
import {
  isClinicalMemoryNote,
  isMedicalAdviceRequest,
  unsafeGoalReason,
} from "./safety";
import { isOffTopicUserMessage } from "./scope";

const goals = computeGoalsFromProfile({
  activity: "moderate",
  age: 30,
  heightCm: 175,
  sex: "male",
  weightKg: 72,
});

assert.ok(goals.calories > 1500);
assert.ok(goals.proteinG > 50);

const weekly = goalsForRange(
  { calories: 2592, proteinG: 72, carbsG: 415, fatG: 72, fiberG: 35, isDefault: false },
  "7d",
);
assert.equal(weekly.calories, 2592 * 7);
assert.equal(weekly.proteinG, 72 * 7);
assert.equal(weekly.carbsG, 415 * 7);
assert.equal(weekly.fatG, 72 * 7);
assert.equal(weekly.fiberG, 35 * 7);
assert.equal(
  goalsForRange(
    { calories: 2592, proteinG: 72, carbsG: 415, fatG: 72, fiberG: 35, isDefault: false },
    "today",
  ).calories,
  2592,
);
assert.equal(goals.isDefault, false);

assert.equal(isOffTopicUserMessage("write me java code to add numbers"), true);
assert.equal(isOffTopicUserMessage("I had 2 chapati and dal for lunch"), false);

const stored = toStoredSummary(
  {
    avgDailyCalories7d: 1800,
    frequentFoods: ["dal"],
    mealTimeBreakfast: "08:30",
    mealTimeDinner: "20:00",
    mealTimeLunch: "13:15",
    notes: ["Skips breakfast on weekdays", "Skips breakfast on weekdays"],
    typicalBreakfast: "idli",
    typicalDinner: "rice",
    typicalLunch: "dal",
    typicalSnacks: null,
  },
  ["Skips breakfast on weekdays", "Prefers curd"],
);
assert.deepEqual(stored.usualMealTimes, {
  breakfast: "08:30",
  lunch: "13:15",
  dinner: "20:00",
});
assert.equal("mealTimeBreakfast" in stored, false);
assert.deepEqual(stored.notes, ["Skips breakfast on weekdays", "Prefers curd"]);
assert.deepEqual(
  mergeMemoryNotes(["dal on weekdays"], ["dal on weekdays", "extra fruit"]),
  ["dal on weekdays", "extra fruit"],
);

assert.equal(isMedicalAdviceRequest("I have diabetes, what should I eat?"), true);
assert.equal(isMedicalAdviceRequest("I had 2 chapati and dal for lunch"), false);
assert.equal(isClinicalMemoryNote("allergic to peanuts"), true);
assert.equal(isClinicalMemoryNote("usually skips breakfast"), false);
assert.ok(unsafeGoalReason({ calories: 800, proteinG: 60 }));
assert.equal(unsafeGoalReason({ calories: 1800, proteinG: 70 }), null);

assert.equal(
  expectedMealMinutes("breakfast", { usualMealTimes: { breakfast: "07:45" } }),
  7 * 60 + 45,
);
assert.equal(isSlotDue(10 * 60, 8 * 60), true);
assert.equal(isSlotDue(9 * 60, 8 * 60 + 30), false);

const incomplete = inspectMealCompleteness({
  items: [{ name: "rice", quantity: 1, unit: "plate" }],
  rawText: "rice",
});
assert.equal(incomplete.followUp, "About how many grams or pieces of rice?");

assert.equal(parseDietPattern("eggetarian"), "eggetarian");
assert.equal(parseDietPattern("keto"), null);
assert.deepEqual(parseAllergies(["milk", "glue", "milk", "sesame"]), ["milk"]);
assert.equal(parseAllergyNote("  mushroom  "), "mushroom");
assert.equal(parseAllergyNote("   "), null);
const constraint = dietConstraintLines({
  dietPattern: "vegan",
  allergies: ["soy"],
  allergyNote: "mushroom",
});
assert.ok(constraint.some((line) => line.includes("vegan")));
assert.ok(
  constraint.some(
    (line) =>
      line.includes("soy") &&
      line.includes("mushroom") &&
      line.includes("Do not give medical advice"),
  ),
);

const totals = { calories: 900, proteinG: 40, carbsG: 90, fatG: 20, fiberG: 8 };
const goalsForReminders = { ...totals, calories: 2000, isDefault: false };
const beforeLearnedLunch = buildNutritionNotifications({
  now: new Date("2026-10-25T04:00:00.000Z"),
  timeZone: "Asia/Kolkata",
  mealNudgesEnabled: true,
  mealsToday: ["breakfast"],
  totals,
  goals: goalsForReminders,
  isMember: true,
  usualMealTimes: { lunch: "10:00", dinner: "21:00" },
});
assert.equal(
  beforeLearnedLunch.some((item) => item.id === "nudge-2026-10-25-lunch"),
  false,
);
const afterLearnedLunch = buildNutritionNotifications({
  now: new Date("2026-10-25T05:00:00.000Z"),
  timeZone: "Asia/Kolkata",
  mealNudgesEnabled: true,
  mealsToday: ["breakfast"],
  totals,
  goals: goalsForReminders,
  isMember: true,
  usualMealTimes: { lunch: "10:00", dinner: "21:00" },
});
assert.equal(
  afterLearnedLunch.some((item) => item.id === "nudge-2026-10-25-lunch"),
  true,
);
assert.equal(
  afterLearnedLunch.some((item) => item.id === "nudge-2026-10-25-dinner"),
  false,
);
const beforeDefaultDinner = buildNutritionNotifications({
  now: new Date("2026-10-25T13:30:00.000Z"),
  timeZone: "Asia/Kolkata",
  mealNudgesEnabled: true,
  mealsToday: ["breakfast", "lunch"],
  totals,
  goals: goalsForReminders,
  isMember: true,
});
assert.equal(
  beforeDefaultDinner.some((item) => item.id === "nudge-2026-10-25-dinner"),
  false,
);

assert.equal(shouldSkipRecordedNudge({ dismissedAt: new Date("2026-10-25T05:00:00.000Z") }), true);
assert.equal(shouldSkipRecordedNudge({ dismissedAt: null }), false);
assert.equal(shouldSkipRecordedNudge(undefined), false);
assert.deepEqual(parseNudgeNotificationId("nudge-2026-10-25-breakfast"), {
  date: "2026-10-25",
  mealType: "breakfast",
});
assert.equal(parseNudgeNotificationId("remind-breakfast"), null);

assert.equal(parseWhatsappPhone(" +91 98765 43210 "), "+919876543210");
assert.equal(parseWhatsappPhone("00919876543210"), "+919876543210");
assert.equal(parseWhatsappPhone("9876543210"), null);
assert.equal(parseWhatsappPhone("not-a-number"), null);

const reminder = reminderBody({
  appUrl: "https://aharika.example/",
  name: "Sande",
  meal: "dinner",
});
assert.equal(
  reminder,
  "Hey Sande\nLooks like you forgot to log dinner in Aharika.\n\nhttps://aharika.example/chat",
);
assert.equal(reminderName("  "), "there");
assert.equal(reminder.includes("ContentSid"), false);
const fields = twilioMessageFields({
  from: "whatsapp:+14155238886",
  to: "+919876543210",
  body: reminder,
});
assert.equal(fields.From, "whatsapp:+14155238886");
assert.equal(fields.To, "whatsapp:+919876543210");
assert.equal(fields.Body, reminder);
assert.equal("ContentSid" in fields, false);
assert.equal(
  isWhatsappSandboxConfigured({
    accountSid: "AC",
    authToken: "token",
    from: "+14155550100",
    joinCode: "join example",
  }),
  true,
);
assert.equal(
  isWhatsappSandboxConfigured({
    accountSid: "AC",
    authToken: "",
    from: "+14155550100",
    joinCode: "join example",
  }),
  false,
);
assert.deepEqual(splitWhatsappLocal("+919876543210"), {
  countryCode: "+91",
  nationalNumber: "9876543210",
});
assert.deepEqual(splitWhatsappLocal("+14155550199"), {
  countryCode: "+1",
  nationalNumber: "4155550199",
});
assert.equal(
  whatsappJoinLink("whatsapp:+14155550100", "join example"),
  "https://wa.me/14155550100?text=join%20example",
);
assert.equal(whatsappJoinLink("", "join example"), null);
assert.equal(joinWhatsappLocal("+91", "9876543210"), "+919876543210");
assert.equal(joinWhatsappLocal("91", "98765"), null);
assert.equal(from12Hour("9:00", "PM"), "21:00");
assert.equal(from12Hour("12:00", "AM"), "00:00");
assert.equal(from12Hour("12:30", "PM"), "12:30");
assert.equal(from12Hour("01:30", "PM"), "13:30");
assert.equal(from12Hour("13:30", "PM"), null);
assert.deepEqual(to12Hour("20:30"), { time: "8:30", meridiem: "PM" });
assert.deepEqual(to12Hour("00:15"), { time: "12:15", meridiem: "AM" });

const breakfastWindow = {
  scheduledEnabled: true,
  smartEnabled: false,
  times: { breakfast: "09:00", lunch: "13:30", dinner: "20:30" },
  loggedMeals: ["breakfast"],
  sent: [],
};
assert.deepEqual(dueWhatsappReminder({ ...breakfastWindow, nowMinutes: 9 * 60 }), {
  mealType: "breakfast",
  kind: "scheduled",
});
assert.deepEqual(dueWhatsappReminder({ ...breakfastWindow, nowMinutes: 14 * 60 }), {
  mealType: "lunch",
  kind: "scheduled",
});
assert.deepEqual(
  dueWhatsappReminder({
    nowMinutes: 2 * 60 + 4,
    scheduledEnabled: true,
    smartEnabled: false,
    times: { breakfast: "08:30", lunch: "13:30", dinner: "02:00" },
    loggedMeals: [],
    sent: [],
  }),
  { mealType: "dinner", kind: "scheduled" },
);

assert.equal(
  dueWhatsappReminder({
    nowMinutes: 10 * 60 + 30,
    scheduledEnabled: false,
    smartEnabled: true,
    times: { breakfast: "09:00", lunch: "13:30", dinner: "20:30" },
    loggedMeals: ["breakfast"],
    sent: [],
  }),
  null,
);
assert.deepEqual(
  dueWhatsappReminder({
    nowMinutes: 10 * 60 + 30,
    scheduledEnabled: false,
    smartEnabled: true,
    times: {},
    loggedMeals: [],
    sent: [],
  }),
  { mealType: "breakfast", kind: "smart" },
);
assert.equal(
  dueWhatsappReminder({
    nowMinutes: 10 * 60 + 30,
    scheduledEnabled: false,
    smartEnabled: true,
    times: {},
    loggedMeals: [],
    sent: [{ mealType: "breakfast", kind: "scheduled" }],
  }),
  null,
);

console.log("nutrition unit checks passed");
