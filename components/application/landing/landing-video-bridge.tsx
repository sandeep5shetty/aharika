"use client";

import { motion, type Variants } from "motion/react";

import { cx } from "@/utils/cx";

const fadeUp: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)", y: 12 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { type: "spring", bounce: 0.22, duration: 1 },
  },
};

export function LandingVideoBridge() {
  return (
    <motion.section
      className="relative z-20 flex w-full flex-col items-center bg-background-full pt-10 pb-6 md:pt-14 md:pb-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      aria-labelledby="landing-video-bridge-heading"
    >
      <motion.div
        className={cx(
          "mb-8 h-8 w-full border-t border-separator-border opacity-80",
          "bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]",
          "bg-size-[10px_10px] text-border-button-default",
        )}
        variants={fadeUp}
        aria-hidden
      />

      <motion.h2
        id="landing-video-bridge-heading"
        className="max-w-2xl px-4 text-center font-instrument-serif text-2xl font-normal tracking-tight text-text-primary md:text-4xl"
        variants={fadeUp}
      >
        See how Aharika works in 60 seconds
      </motion.h2>

      <motion.p
        className="mt-3 max-w-md px-4 text-center text-body-regular text-text-secondary"
        variants={fadeUp}
      >
        Tap play - chat, voice, and your dashboard in one flow.
      </motion.p>

      <motion.div
        className={cx(
          "mt-8 h-8 w-full border-b border-separator-border opacity-80",
          "bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]",
          "bg-size-[10px_10px] text-border-button-default",
        )}
        variants={fadeUp}
        aria-hidden
      />
    </motion.section>
  );
}
