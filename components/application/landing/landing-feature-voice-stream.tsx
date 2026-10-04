"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { LandingLoopingWaveform } from "@/components/application/landing/landing-looping-waveform";
import { cx } from "@/utils/cx";

const STREAM_PHRASE = "Lunch mein do roti, dal aur dahi chawal khaya…";

export function LandingFeatureVoiceStream() {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      if (index > STREAM_PHRASE.length + 10) {
        index = 0;
      }
      setVisibleLength(Math.min(index, STREAM_PHRASE.length));
    }, 48);
    return () => window.clearInterval(id);
  }, []);

  const streamed = STREAM_PHRASE.slice(0, visibleLength);

  return (
    <div
      className={cx(
        "flex flex-col gap-4 rounded-2xl border border-border-button-default",
        "bg-background-secondary-default p-4",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.span
            className="size-2 rounded-full bg-accent-600"
            aria-hidden
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ type: "tween", duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-caption-1-semibold text-accent-700">Transcribing live</span>
        </div>
        <span className="text-caption-1-medium text-text-tertiary">Sarvam STT</span>
      </div>

      <LandingLoopingWaveform className="text-accent-600/55" height={56} bars={40} />

      <div
        className={cx(
          "min-h-[4.5rem] rounded-xl border border-border-button-default",
          "bg-background-primary-default px-3 py-3",
        )}
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-body-2-regular text-text-primary">
          {streamed}
          <motion.span
            className="ms-0.5 inline-block h-4 w-0.5 translate-y-px bg-accent-600"
            aria-hidden
            animate={{ opacity: [1, 0, 1] }}
            transition={{ type: "tween", duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
        </p>
      </div>
    </div>
  );
}
