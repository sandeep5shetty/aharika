"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { RiCloseLine, RiPlayFill } from "@remixicon/react";

import { cx } from "@/utils/cx";

export interface LandingHeroVideoProps {
  videoSrc: string;
  thumbnailSrc: string;
  thumbnailAlt?: string;
  className?: string;
}

export function LandingHeroVideo({
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = "Video thumbnail",
  className,
}: LandingHeroVideoProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const openVideo = useCallback(() => setIsVideoOpen(true), []);
  const closeVideo = useCallback(() => setIsVideoOpen(false), []);

  useEffect(() => {
    if (!isVideoOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeVideo();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVideoOpen, closeVideo]);

  return (
    <div className={cx("relative flex justify-center", className)}>
      <button
        type="button"
        onClick={openVideo}
        className="group relative cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        aria-label="Play product video"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailSrc}
          alt={thumbnailAlt}
          width={1920}
          height={1080}
          className={cx(
            "w-[20rem] rounded-md border border-border-button-default shadow-lg transition-all duration-200 ease-out md:w-[60rem]",
            "group-hover:brightness-[0.85]",
          )}
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span
            className={cx(
              "relative flex size-20 scale-100 items-center justify-center rounded-full shadow-md transition-all duration-200 ease-out",
              "bg-linear-to-b from-accent-400/40 to-accent-600 group-hover:scale-[1.2]",
              "dark:from-background-primary-default/30 dark:to-background-secondary-default/50",
            )}
          >
            <RiPlayFill
              className="size-8 fill-white text-white transition-transform duration-200 ease-out group-hover:scale-105 dark:fill-text-primary dark:text-text-primary"
              style={{
                filter:
                  "drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))",
              }}
            />
          </span>
        </span>
      </button>

      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            key="hero-video-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeVideo}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background-full/30 backdrop-blur-md"
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0, rotate: "180deg" }}
              animate={{
                scale: 1,
                rotate: "0deg",
                transition: {
                  type: "spring",
                  bounce: 0.25,
                },
              }}
              exit={{ scale: 0, rotate: "180deg" }}
              className="relative mx-4 aspect-video w-full max-w-4xl md:mx-0"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Product video"
            >
              <button
                type="button"
                className={cx(
                  "absolute -top-16 end-0 rounded-full p-2 text-xl backdrop-blur-md outline-none",
                  "bg-background-secondary-default/80 text-text-primary ring-1 ring-border-button-default",
                  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                )}
                onClick={closeVideo}
                aria-label="Close video"
              >
                <RiCloseLine className="size-6" aria-hidden />
              </button>

              <iframe
                src={videoSrc}
                title={thumbnailAlt}
                className="size-full rounded-2xl border border-border-button-default"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const HERO_VIDEO_EMBED =
  "https://www.youtube.com/embed/cjZjqP3EqdE?si=wXqy8Rpcnwll8Grr&start=360";

export function LandingHeroVideoSection() {
  return (
    <section
      className="relative z-20 flex w-full flex-col items-center bg-background-full px-4 pt-4 pb-20 md:pt-6 md:pb-28"
      aria-label="Product video"
    >
      <LandingHeroVideo
        className="dark:hidden"
        videoSrc={HERO_VIDEO_EMBED}
        thumbnailSrc="https://startup-template-sage.vercel.app/hero-light.png"
        thumbnailAlt="See how Aharika works"
      />
      <LandingHeroVideo
        className="hidden dark:block"
        videoSrc={HERO_VIDEO_EMBED}
        thumbnailSrc="https://startup-template-sage.vercel.app/hero-dark.png"
        thumbnailAlt="See how Aharika works"
      />
    </section>
  );
}
