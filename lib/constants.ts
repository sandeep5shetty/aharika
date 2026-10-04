import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "I had 2 chapati, dal, and a bowl of curd rice for lunch",
  "How am I doing today?",
  "Set my protein goal to 120g",
  "Show my week on the dashboard",
];

export const LOGO_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.png`;

export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Marketing home. */
export const LANDING_PATH = "/";
/** Nutrition coach (chat UI). */
export const CHAT_PATH = "/chat";
