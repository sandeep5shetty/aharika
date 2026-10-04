"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { HeroRays } from "@/components/application/landing/hero-rays/hero-rays";
import { ProPromptCard } from "@/components/application/templates/pro-prompt-card";
import { TEMPLATE_PRO_RAYS } from "@/components/application/templates/pro-prompt-rays";
import { useThemeMode } from "@/components/application/theme/theme-toggle";
import { ButtonLink } from "@/components/base/buttons/button";
import { withBasePath } from "@/lib/constants";
import {
  guestLimitMessage,
  type GuestLimitReason,
} from "@/lib/guest-limits";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const AHARIKA_LOGO = withBasePath("/brand/aharika-favicon.svg");

export function GuestUpgradePrompt({
  open,
  reason,
  onDismiss,
  dismissible = true,
}: {
  open: boolean;
  reason: GuestLimitReason;
  onDismiss: () => void;
  dismissible?: boolean;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const theme = useThemeMode();

  useEffect(() => {
    setReduceMotion(window.matchMedia(REDUCED_MOTION_QUERY).matches);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismissible, onDismiss]);

  const rays =
    theme === "dark"
      ? {
          ...TEMPLATE_PRO_RAYS,
          background: TEMPLATE_PRO_RAYS.backgroundDark,
          grain: TEMPLATE_PRO_RAYS.grainDark,
        }
      : TEMPLATE_PRO_RAYS;

  const loginHref = withBasePath("/login");
  const signupHref = withBasePath("/signup");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="guest-upgrade-modal"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {dismissible ? (
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-background-full/50 backdrop-blur-md"
              aria-label="Close dialog"
              onClick={onDismiss}
            />
          ) : (
            <div
              className="absolute inset-0 bg-background-full/55 backdrop-blur-md"
              aria-hidden
            />
          )}

          <ProPromptCard
            placement="center"
            aria-label="Create an account"
            dismissible={dismissible}
            dismissLabel="Not now"
            title="Create a free account to keep going"
            description={guestLimitMessage(reason)}
            leading={
              <div className="relative flex shrink-0 items-center gap-2">
                <Image
                  src={AHARIKA_LOGO}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-xl object-contain"
                  unoptimized
                />
                <span className="text-caption-1-semibold text-text-tertiary">Guest trial</span>
              </div>
            }
            backdrop={
              <HeroRays
                config={rays}
                paused={reduceMotion}
                className="absolute inset-0 size-full"
              />
            }
            backdropHeight={TEMPLATE_PRO_RAYS.height}
            cta={
              <div className="flex w-full flex-col gap-2">
                <ButtonLink href={signupHref} className="w-full">
                  Create free account
                </ButtonLink>
                <ButtonLink href={loginHref} variant="secondary" className="w-full">
                  Sign in
                </ButtonLink>
              </div>
            }
            onDismiss={onDismiss}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
