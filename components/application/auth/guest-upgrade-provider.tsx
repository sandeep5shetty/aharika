"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { GuestUpgradePrompt } from "@/components/application/auth/guest-upgrade-prompt";
import type { GuestLimitReason } from "@/lib/guest-limits";

type GuestUpgradeContextValue = {
  showGuestUpgrade: (reason: GuestLimitReason, options?: { dismissible?: boolean }) => void;
  hideGuestUpgrade: () => void;
};

const GuestUpgradeContext = createContext<GuestUpgradeContextValue | null>(null);

export function GuestUpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<GuestLimitReason>("message_limit");
  const [dismissible, setDismissible] = useState(true);

  const showGuestUpgrade = useCallback(
    (nextReason: GuestLimitReason, options?: { dismissible?: boolean }) => {
      setReason(nextReason);
      setDismissible(options?.dismissible ?? true);
      setOpen(true);
    },
    [],
  );

  const hideGuestUpgrade = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ hideGuestUpgrade, showGuestUpgrade }),
    [hideGuestUpgrade, showGuestUpgrade],
  );

  return (
    <GuestUpgradeContext.Provider value={value}>
      {children}
      <GuestUpgradePrompt
        open={open}
        reason={reason}
        dismissible={dismissible}
        onDismiss={hideGuestUpgrade}
      />
    </GuestUpgradeContext.Provider>
  );
}

export function useGuestUpgrade() {
  const context = useContext(GuestUpgradeContext);
  if (!context) {
    throw new Error("useGuestUpgrade must be used within GuestUpgradeProvider");
  }
  return context;
}
