"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, Popover } from "react-aria-components";
import { popoverClassName, triggerButtonClassName } from "@/components/base/date-picker/shared";
import { to12Hour, type Meridiem } from "@/lib/nutrition/whatsapp";
import { cx } from "@/utils/cx";
import { useDismissOnOutsidePress } from "@/utils/use-dismiss-on-outside-press";

export type MealClock = { time: string; meridiem: Meridiem };

const SLOTS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const stored = `${String(hour).padStart(2, "0")}:${minute}`;
  return { stored, ...to12Hour(stored) };
});

function labelFor(slot: (typeof SLOTS)[number], hour12: boolean) {
  return hour12 ? `${slot.time} ${slot.meridiem}` : slot.stored;
}

export function MealTimeWheel({
  label,
  clock,
  onChange,
}: {
  label: string;
  clock: MealClock;
  onChange: (clock: MealClock) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);

  useDismissOnOutsidePress(open, () => setOpen(false), [triggerRef, popoverRef]);

  const selected = SLOTS.find(
    (slot) => slot.time === clock.time && slot.meridiem === clock.meridiem,
  ) ?? SLOTS.find((slot) => slot.stored === "09:00");

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>("[data-selected='true']")
        ?.scrollIntoView({ block: "center" });
      setScrollTop(listRef.current?.scrollTop ?? 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, hour12, selected?.stored]);

  const fade = Math.min(scrollTop / 24, 1);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} time`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cx(triggerButtonClassName, "h-8 rounded-lg px-2")}
      >
        <span className="px-1 text-body-medium text-text-primary" dir="ltr">
          {clock.time} {clock.meridiem}
        </span>
      </button>
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={open}
        onOpenChange={setOpen}
        offset={4}
        placement="bottom start"
        shouldFlip={false}
        isNonModal
        className={cx(popoverClassName, "w-36")}
      >
        <Dialog aria-label={`${label} time`} className="outline-none">
          <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              aria-pressed={hour12}
              onClick={() => setHour12(true)}
              className={cx(
                "rounded-md px-2 py-1 text-caption-1-semibold outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                hour12
                  ? "bg-background-primary-default text-text-primary"
                  : "text-text-tertiary",
              )}
            >
              12h
            </button>
            <button
              type="button"
              aria-pressed={!hour12}
              onClick={() => setHour12(false)}
              className={cx(
                "rounded-md px-2 py-1 text-caption-1-semibold outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                hour12
                  ? "text-text-tertiary"
                  : "bg-background-primary-default text-text-primary",
              )}
            >
              24h
            </button>
          </div>
          <div className="relative">
            <div
              ref={listRef}
              className="max-h-52 overflow-y-auto px-2 pb-2"
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            >
              {SLOTS.map((slot) => {
                const isSelected = slot.stored === selected?.stored;
                return (
                  <button
                    key={slot.stored}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => {
                      onChange({ time: slot.time, meridiem: slot.meridiem });
                      setOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center justify-center rounded-lg py-1.5 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      isSelected
                        ? "bg-background-tertiary-default text-text-primary"
                        : "text-text-secondary hover:bg-background-secondary-hover",
                    )}
                  >
                    <span dir="ltr">{labelFor(slot, hour12)}</span>
                  </button>
                );
              })}
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
              <div
                className="h-6 bg-gradient-to-b from-background-secondary-default to-transparent backdrop-blur-[1px]"
                style={{ opacity: fade }}
              />
            </div>
          </div>
        </Dialog>
      </Popover>
    </>
  );
}
