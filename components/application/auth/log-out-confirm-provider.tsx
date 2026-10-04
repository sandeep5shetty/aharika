"use client";

import { BlobSpeech } from "feral-blob";
import { RiCloseLine } from "@remixicon/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { useDirection } from "@/components/foundations/direction/direction";
import { FeralJellyBlob } from "@/components/foundations/feral-blob/feral-jelly-blob";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { signOutToLogin } from "@/lib/auth-client";
import { cx } from "@/utils/cx";

const SPEECH = "Going somewhere?";

type LogOutConfirmContextValue = {
  openLogOutConfirm: () => void;
};

const LogOutConfirmContext = createContext<LogOutConfirmContextValue | null>(
  null,
);

export function useLogOutConfirm() {
  const value = useContext(LogOutConfirmContext);
  if (!value) {
    throw new Error("useLogOutConfirm must be used within LogOutConfirmProvider");
  }
  return value;
}

export function LogOutConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const openLogOutConfirm = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (signingOut) return;
    setIsOpen(false);
  }, [signingOut]);

  const confirm = useCallback(async () => {
    setSigningOut(true);
    await signOutToLogin();
  }, []);

  return (
    <LogOutConfirmContext.Provider value={{ openLogOutConfirm }}>
      {children}
      <LogOutConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={confirm}
        signingOut={signingOut}
      />
    </LogOutConfirmContext.Provider>
  );
}

function LogOutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  signingOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  signingOut: boolean;
}) {
  const direction = useDirection();
  const mounted = useHasMounted();
  const [portalMounted, setPortalMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setPortalMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
    } else {
      setVisible(false);
      unmountTimer.current = setTimeout(() => setPortalMounted(false), 320);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!portalMounted || !mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      dir={direction}
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close log out dialog"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          "absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cx(
          "relative transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.92] opacity-0 blur-[4px]",
        )}
      >
        <div
          ref={panelRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="log-out-title"
          aria-describedby="log-out-description"
          tabIndex={-1}
          className={cx(
            "relative w-full max-w-[400px] overflow-hidden rounded-3xl border border-border-button-default",
            "bg-background-primary-default px-6 pb-6 pt-5 shadow-xs outline-none",
            "dark:bg-background-secondary-default",
          )}
        >
          <div className="flex justify-end">
            <IconButton
              size="small"
              icon={RiCloseLine}
              aria-label="Close"
              onClick={onClose}
              disabled={signingOut}
            />
          </div>

          <div className="flex flex-col items-center gap-4 px-2 pb-2 pt-1 text-center">
            <div className="flex flex-col items-center gap-2">
              <BlobSpeech
                mood="curious"
                messages={{ curious: SPEECH }}
              />
              <FeralJellyBlob size="lg" mood="curious" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2
                id="log-out-title"
                className="text-title-2-medium text-text-primary"
              >
                Log Out?
              </h2>
              <p
                id="log-out-description"
                className="text-body-regular text-text-secondary"
              >
                You&apos;ll need to sign in again to access your account.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={signingOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={onConfirm}
              disabled={signingOut}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
