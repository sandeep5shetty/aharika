"use client";

import type { Variants } from "motion/react";
import Link from "next/link";
import { RiArrowRightSLine, RiChatAiLine } from "@remixicon/react";

import { ButtonLink } from "@/components/base/buttons/button";
import { LandingAnimatedGroup } from "@/components/application/landing/landing-animated-group";
import { LandingTriplePhone } from "@/components/application/landing/landing-triple-phone";
import { CHAT_PATH, withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

const transitionVariants: { item: Variants } = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const heroContainerVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.12,
    },
  },
};

export function LandingHero() {
  const chatHref = withBasePath(CHAT_PATH);
  const signupHref = withBasePath("/signup");

  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden pt-8 md:pt-12">
      <LandingAnimatedGroup
        className="flex w-full flex-col items-center"
        variants={{
          container: heroContainerVariants,
          item: transitionVariants.item,
        }}
      >
        <Link
          href={chatHref}
          className={cx(
            "flex w-fit items-center gap-2 rounded-full border border-border-button-default",
            "bg-background-full/95 p-1 shadow-sm backdrop-blur-md transition-colors",
            "hover:bg-background-primary-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          )}
        >
          <span className="rounded-full bg-accent-600 px-3 py-1 text-caption-1-semibold text-white">
            New
          </span>
          <span className="flex items-center gap-0.5 pe-2 text-body-2-medium text-text-secondary">
            Voice logging with Sarvam STT
            <RiArrowRightSLine className="size-4 text-foreground-icon-secondary" aria-hidden />
          </span>
        </Link>

        <h1
          className={cx(
            "font-instrument-serif mt-6 max-w-4xl px-4 text-center text-4xl font-normal leading-[1.05] tracking-tight text-black opacity-80",
            "[text-shadow:0px_4px_4px_rgba(0,0,0,0.09)] md:text-7xl",
          )}
        >
          Someone who cares
          about
          <br />
          every meal you eat.
        </h1>

        <p className="mt-4 max-w-xl px-4 text-center text-base text-white/90 md:text-md">
          Chat or speak what you ate. Aharika estimates macros, remembers your habits, and keeps
          your dashboard in sync, built for real Indian portions and home cooking.
        </p>

        <div className="mt-8 flex w-full flex-col items-center gap-3 px-4 sm:w-auto sm:flex-row">
        <ButtonLink
            href={chatHref}
            variant="secondary"
            size="medium"
            leadingIcon={RiChatAiLine}
            className="w-full sm:w-auto"
          >
            Start chatting
          </ButtonLink>
          <ButtonLink href={signupHref} size="medium" className="w-full sm:w-auto">
            Create account
          </ButtonLink>
          
        </div>
      </LandingAnimatedGroup>

      <div
        className={cx(
          "mb-3 mt-6 h-10 w-full border-y border-white opacity-30",
          "bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]",
          "bg-size-[10px_10px] text-white",
        )}
        aria-hidden
      />

      <div className="relative z-10 mt-2 -mb-8 flex w-full justify-center">
        <LandingTriplePhone />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-48 bg-linear-to-t from-background-full to-transparent"
        aria-hidden
      />
    </section>
  );
}
