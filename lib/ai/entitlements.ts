import type { UserType } from "@/lib/auth";
import { GUEST_MAX_CHATS, GUEST_MAX_USER_MESSAGES } from "@/lib/guest-limits";

type Entitlements = {
  maxMessagesPerHour: number;
  maxChats: number | null;
  maxUserMessages: number | null;
  canPersistMeals: boolean;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerHour: 10,
    maxChats: GUEST_MAX_CHATS,
    maxUserMessages: GUEST_MAX_USER_MESSAGES,
    canPersistMeals: false,
  },
  regular: {
    maxMessagesPerHour: 10,
    maxChats: null,
    maxUserMessages: null,
    canPersistMeals: true,
  },
};
