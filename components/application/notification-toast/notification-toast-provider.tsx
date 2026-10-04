"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  Notification,
  NotificationViewport,
  type NotificationStatus,
} from "@/components/base/notification/notification";
import {
  readPendingToast,
  TOAST_EVENT,
  type ToastPayload,
} from "@/lib/notification-toast/show-toast";

type ToastItem = ToastPayload & { id: string };

const DEFAULT_DURATION = 3500;

function pushToast(
  setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>>,
  payload: ToastPayload & { id: string },
) {
  setToasts((current) => [...current, payload]);
}

export function NotificationToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const pending = readPendingToast();
    if (pending) {
      pushToast(setToasts, pending);
    }

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastItem>).detail;
      if (!detail?.id) return;
      pushToast(setToasts, detail);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <>
      {children}
      <NotificationViewport position="top-center" aria-label="App messages">
        {toasts.map((toast) => (
          <Notification
            key={toast.id}
            status={(toast.status ?? "information") as NotificationStatus}
            title={toast.title}
            description={toast.description}
            autoDismissDuration={
              toast.duration === undefined
                ? DEFAULT_DURATION
                : toast.duration > 0
                  ? toast.duration
                  : undefined
            }
            introDelay={0}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </NotificationViewport>
    </>
  );
}
