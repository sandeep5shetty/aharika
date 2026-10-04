import type { NotificationStatus } from "@/components/base/notification/notification";

export const TOAST_EVENT = "aharika:toast";
export const PENDING_TOAST_KEY = "aharika-pending-toast";

export type ToastPayload = {
  id?: string;
  title: string;
  description?: string;
  status?: NotificationStatus;
  /** Auto-dismiss ms (default 3500). Set 0 to keep until dismissed. */
  duration?: number;
};

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        ...payload,
        id: payload.id ?? crypto.randomUUID(),
      } satisfies ToastPayload & { id: string },
    }),
  );
}

/** Survives a full navigation (login → chat, sign out → login). */
export function queueToastAfterNavigation(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PENDING_TOAST_KEY,
      JSON.stringify({
        ...payload,
        id: payload.id ?? crypto.randomUUID(),
      }),
    );
  } catch {
    showToast(payload);
  }
}

export function readPendingToast(): (ToastPayload & { id: string }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_TOAST_KEY);
    return JSON.parse(raw) as ToastPayload & { id: string };
  } catch {
    return null;
  }
}
