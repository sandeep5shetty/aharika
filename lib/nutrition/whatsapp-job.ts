import { timingSafeEqual } from "node:crypto";
import { guestRegex } from "@/lib/constants";
import {
  claimWhatsappReminder,
  getMealsBetween,
  listWhatsappReminderSubscribers,
  listWhatsappReminders,
  releaseWhatsappReminder,
} from "@/lib/db/nutrition-queries";
import { endOfDayInTimeZone, localDateKey, startOfDayInTimeZone } from "@/lib/nutrition/day";
import { parseWhatsappPhone, reminderName } from "@/lib/nutrition/whatsapp";
import { sendSandboxWhatsapp } from "@/lib/nutrition/whatsapp-send";
import { dueWhatsappReminder, zonedClock } from "@/lib/nutrition/whatsapp-schedule";

export const WHATSAPP_REMINDER_JOB_MS = 15 * 60 * 1000;

type ReminderPreference = {
  timezone: string | null;
  whatsappBreakfastTime: string | null;
  whatsappDinnerTime: string | null;
  whatsappLunchTime: string | null;
  whatsappPhone: string | null;
  whatsappRemindersEnabled: boolean;
  whatsappScheduledEnabled: boolean;
  whatsappSmartEnabled: boolean;
};

export function isCronAuthorized(header: string | null) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Sends the one reminder that is due for this member, if it has not already been claimed. */
export async function dispatchDueWhatsappReminder(
  request: Request,
  input: {
    name: string | null | undefined;
    preference: ReminderPreference;
    userId: string;
  },
) {
  const phone = parseWhatsappPhone(input.preference.whatsappPhone);
  if (!input.preference.whatsappRemindersEnabled || !phone) {
    return { sent: false as const };
  }

  const timeZone = input.preference.timezone || "Asia/Kolkata";
  const now = new Date();
  const date = localDateKey(now, timeZone);
  const meals = await getMealsBetween(
    input.userId,
    startOfDayInTimeZone(now, timeZone),
    endOfDayInTimeZone(now, timeZone),
  );
  const sentRows = await listWhatsappReminders(input.userId, date);
  const due = dueWhatsappReminder({
    nowMinutes: zonedClock(now, timeZone),
    scheduledEnabled: input.preference.whatsappScheduledEnabled,
    smartEnabled: input.preference.whatsappSmartEnabled,
    times: {
      breakfast: input.preference.whatsappBreakfastTime,
      lunch: input.preference.whatsappLunchTime,
      dinner: input.preference.whatsappDinnerTime,
    },
    loggedMeals: meals.map((meal) => meal.mealType),
    sent: sentRows.map((item) => ({ mealType: item.mealType, kind: item.kind })),
  });
  if (!due) return { sent: false as const };

  const claimed = await claimWhatsappReminder({
    userId: input.userId,
    date,
    mealType: due.mealType,
    kind: due.kind,
  });
  if (!claimed) return { sent: false as const };

  const sent = await sendSandboxWhatsapp(request, phone, {
    name: reminderName(input.name),
    meal: due.mealType,
  });
  if (!sent.ok) {
    await releaseWhatsappReminder({
      userId: input.userId,
      date,
      mealType: due.mealType,
      kind: due.kind,
    });
    return { sent: false as const, message: sent.message };
  }

  return { sent: true as const, mealType: due.mealType, kind: due.kind };
}

export async function runWhatsappReminderJob() {
  const subscribers = await listWhatsappReminderSubscribers();
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const request = new Request(origin);
  let sent = 0;

  for (const subscriber of subscribers) {
    if (guestRegex.test(subscriber.email)) continue;
    try {
      const result = await dispatchDueWhatsappReminder(request, {
        name: subscriber.name,
        preference: subscriber,
        userId: subscriber.userId,
      });
      if (result.sent) sent += 1;
    } catch (error) {
      console.error("WhatsApp reminder failed for a subscriber", error);
    }
  }

  return { checked: subscribers.length, sent };
}

const jobState = globalThis as { __aharikaWhatsappJob?: boolean };

export function startWhatsappReminderJob() {
  if (jobState.__aharikaWhatsappJob) return;
  jobState.__aharikaWhatsappJob = true;

  const tick = () => {
    void runWhatsappReminderJob()
      .then((result) => {
        console.info(
          `WhatsApp reminder job checked ${result.checked} subscriber(s) and sent ${result.sent}`,
        );
      })
      .catch((error) => {
        console.error("WhatsApp reminder job failed", error);
      });
  };

  tick();
  setInterval(tick, WHATSAPP_REMINDER_JOB_MS);
}
