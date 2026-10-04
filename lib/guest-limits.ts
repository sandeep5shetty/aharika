import type { Session } from "next-auth";

export const GUEST_MAX_CHATS = 1;
/** User messages across the guest account (all chats). */
export const GUEST_MAX_USER_MESSAGES = 10;

export type GuestLimitReason =
  | "message_limit"
  | "new_chat"
  | "meal_logging"
  | "delete_chat";

export function isGuestSession(session: Session | null | undefined) {
  return session?.user?.type === "guest";
}

export function parseGuestLimitReason(
  payload: unknown,
): GuestLimitReason | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as { code?: string; cause?: string };
  if (record.code !== "forbidden:auth" || typeof record.cause !== "string") {
    return null;
  }
  if (
    record.cause === "message_limit" ||
    record.cause === "new_chat" ||
    record.cause === "meal_logging" ||
    record.cause === "delete_chat"
  ) {
    return record.cause;
  }
  return null;
}

export function guestLimitResponse(reason: GuestLimitReason) {
  return Response.json(
    {
      code: "forbidden:auth",
      cause: reason,
      message: guestLimitMessage(reason),
    },
    { status: 403 },
  );
}

export function guestLimitMessage(reason: GuestLimitReason) {
  switch (reason) {
    case "message_limit":
      return "You have reached the guest message limit for this trial.";
    case "new_chat":
      return "Guest mode includes one chat. Create an account to start more conversations.";
    case "meal_logging":
      return "Meals are not saved in guest mode. Sign in or create a free account to log to your diary.";
    case "delete_chat":
      return "Guest trial chats cannot be deleted. Create an account for full chat history controls.";
    default:
      return "Create an account to unlock the full experience.";
  }
}
