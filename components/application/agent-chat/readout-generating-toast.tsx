"use client";

import { useEffect, useState } from "react";
import { RiLoader4Line } from "@remixicon/react";

import { useReadoutGenerating } from "@/components/application/agent-chat/voice-readout";
import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { cx } from "@/utils/cx";

/** Small bottom pill, same shape as the settings "Saved" toast, while Sarvam audio is in flight. */
export function ReadoutGeneratingToast() {
  const localize = useTemplateCopy();
  const generating = useReadoutGenerating();
  const [phase, setPhase] = useState<"hidden" | "shown" | "leaving">("hidden");

  useEffect(() => {
    if (!generating) {
      setPhase((current) => (current === "shown" ? "leaving" : current));
      return;
    }
    setPhase("hidden");
    const frame = requestAnimationFrame(() => setPhase("shown"));
    return () => cancelAnimationFrame(frame);
  }, [generating]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => setPhase("hidden"), 220);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") {
    return null;
  }

  return localize(
    <div
      aria-live="polite"
      className={cx(
        "pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 flex -translate-x-1/2 items-center gap-1",
        "rounded-full border border-border-button-default bg-background-primary-default py-1 pe-2.5 ps-1.5 shadow-dropdown",
        "transition-[opacity,transform,filter] duration-200 ease-out",
        phase === "shown" && "opacity-100 scale-100 blur-0",
        phase === "leaving" && "-translate-y-2.5 opacity-0 scale-90 blur-[2px]",
      )}
    >
      <RiLoader4Line
        className="size-4 shrink-0 animate-spin text-foreground-icon-secondary"
        aria-hidden
      />
      <span className="text-body-2-medium whitespace-nowrap text-text-primary">
        Generating voice
      </span>
    </div>,
  );
}
