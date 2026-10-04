"use client";

import { useDirection } from "@/components/foundations/direction/direction";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiCheckboxCircleFill, RiCloseLine } from "@remixicon/react";
import { cx } from "@/utils/cx";

import { showToast } from "@/lib/notification-toast/show-toast";

import { SettingsDailyGoals } from "./settings-daily-goals";

export interface DailyGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Focused modal for daily calorie and macro targets (same shell motion as Settings). */
export function DailyGoalsModal({ isOpen, onClose }: DailyGoalsModalProps) {
  const direction = useDirection();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [savedPhase, setSavedPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSavedToast = () => {
    showToast({
      title: "Targets saved",
      description: "Your daily calorie and macro goals were updated.",
      status: "success",
    });
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedPhase("shown");
    savedTimer.current = setTimeout(() => {
      setSavedPhase("leaving");
      savedTimer.current = setTimeout(() => setSavedPhase("hidden"), 220);
    }, 2000);
  };

  const [contentScrolled, setContentScrolled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      setSavedPhase("hidden");
      unmountTimer.current = setTimeout(() => setMounted(false), 320);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
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

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div dir={direction} className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close daily targets"
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
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.85] opacity-0 blur-[4px]",
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Daily targets"
          tabIndex={-1}
          className={cx(
            "relative flex h-[min(640px,calc(100dvh-32px))] w-[min(520px,calc(100vw-32px))] flex-col",
            "overflow-clip rounded-3xl bg-background-full shadow-xs outline-none",
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-separator-border px-6 py-5">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-title-3-medium text-text-primary">Daily targets</h2>
              <p className="text-body-2-regular text-text-tertiary">
                Calories and macros for today&apos;s progress in chat and on your dashboard.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={cx(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full",
                "bg-background-tertiary-default text-foreground-icon-secondary",
                "transition-colors duration-150 ease hover:bg-background-tertiary-hover",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              <RiCloseLine className="size-4" aria-hidden />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              className="h-full overflow-y-auto px-6 py-5"
              onScroll={(e) => setContentScrolled(e.currentTarget.scrollTop > 0)}
            >
              <SettingsDailyGoals variant="modal" onSaved={showSavedToast} />
            </div>
            <div
              aria-hidden
              className={cx(
                "pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-background-primary-default to-transparent",
                "transition-opacity duration-200 ease-out",
                contentScrolled ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>

        <div
          aria-live="polite"
          className={cx(
            "pointer-events-none absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1",
            "rounded-full border border-border-button-default bg-background-primary-default py-1 pe-2.5 ps-1.5 shadow-dropdown",
            "transition-[opacity,transform,filter] duration-200 ease-out",
            savedPhase === "shown" && "translate-y-1/2 opacity-100 scale-100 blur-0",
            savedPhase === "hidden" && "translate-y-[calc(50%+12px)] opacity-0 scale-90 blur-[2px]",
            savedPhase === "leaving" && "translate-y-[calc(50%-10px)] opacity-0 scale-90 blur-[2px]",
          )}
        >
          <RiCheckboxCircleFill className="size-4 shrink-0 text-lime-600" aria-hidden />
          <span className="text-body-2-medium whitespace-nowrap text-text-primary">Saved</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
