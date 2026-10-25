const E164 = /^\+[1-9]\d{7,14}$/;

/** Accepts a country-code number and returns E.164, or null when it is not usable. */
export function parseWhatsappPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let next = value.trim().replace(/[\s()-]/g, "");
  if (next.startsWith("00")) next = `+${next.slice(2)}`;
  if (!E164.test(next)) return null;
  return next;
}

export function isWhatsappSandboxConfigured(env: {
  accountSid?: string;
  authToken?: string;
  from?: string;
  joinCode?: string;
}) {
  return Boolean(
    env.accountSid?.trim() &&
      env.authToken?.trim() &&
      env.from?.trim() &&
      sandboxJoinPhrase(env.joinCode ?? ""),
  );
}

/** Splits an E.164 number into a country code and a 10-digit national number. */
export function splitWhatsappLocal(phone: string | null | undefined): {
  countryCode: string;
  nationalNumber: string;
} {
  const fallback = { countryCode: "+91", nationalNumber: "" };
  if (!phone || !phone.startsWith("+") || phone.length <= 11) return fallback;
  const nationalNumber = phone.slice(-10);
  const countryCode = phone.slice(0, -10);
  if (!/^\+[1-9]\d{0,3}$/.test(countryCode) || !/^\d{10}$/.test(nationalNumber)) {
    return fallback;
  }
  return { countryCode, nationalNumber };
}

export function joinWhatsappLocal(countryCode: string, nationalNumber: string) {
  const codeDigits = countryCode.replace(/[^\d]/g, "").replace(/^0+/, "");
  const nationalDigits = nationalNumber.replace(/\D/g, "");
  if (!codeDigits || !/^\d{10}$/.test(nationalDigits)) return null;
  return parseWhatsappPhone(`+${codeDigits}${nationalDigits}`);
}

export function sandboxJoinPhrase(code: string) {
  const trimmed = code.trim();
  if (trimmed.length === 0) return "";
  return /^join\s/i.test(trimmed) ? trimmed : `join ${trimmed}`;
}

/** Opens WhatsApp with the join phrase already typed. The user only has to send it. */
export function whatsappJoinLink(from: string, phrase: string) {
  const digits = from.replace(/\D/g, "");
  const text = phrase.trim();
  if (!digits || !text) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type Meridiem = "AM" | "PM";

/** Stores a clock time as 24-hour HH:MM, or null when it is not a real time. */
export function parseWhatsappTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** `9:00` + PM is 21:00. `12:00` + AM is 00:00. `12:30` + PM stays 12:30. */
export function from12Hour(text: string, meridiem: Meridiem): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (meridiem === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function to12Hour(hhmm: string | null | undefined): {
  time: string;
  meridiem: Meridiem;
} {
  const stored = parseWhatsappTime(hhmm ?? "");
  if (!stored) return { time: "9:00", meridiem: "AM" };
  const [hourText, minuteText] = stored.split(":");
  const hour24 = Number(hourText);
  const meridiem: Meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { time: `${hour12}:${minuteText}`, meridiem };
}

export function reminderName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "there";
}

/** Greeting, the missed meal, a blank line, then the chat link. */
export function reminderBody(input: {
  appUrl: string;
  name: string;
  meal: "breakfast" | "lunch" | "dinner";
}) {
  const base = input.appUrl.replace(/\/$/, "");
  return `Hey ${input.name}\nLooks like you forgot to log ${input.meal} in Aharika.\n\n${base}/chat`;
}

/** Plain sandbox message. Never includes a ContentSid. */
export function twilioMessageFields(input: {
  from: string;
  to: string;
  body: string;
}) {
  const from = input.from.replace(/^whatsapp:/, "");
  const to = input.to.replace(/^whatsapp:/, "");
  return {
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: input.body,
  };
}
