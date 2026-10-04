"use client";

import { LandingFeatures } from "@/components/application/landing/landing-features";
import { LandingFooter } from "@/components/application/landing/landing-footer";
import { LandingHero } from "@/components/application/landing/landing-hero";
import { LandingHeroVideoSection } from "@/components/application/landing/landing-hero-video";
import { LandingVideoBridge } from "@/components/application/landing/landing-video-bridge";
import { LandingNavbar } from "@/components/application/landing/landing-navbar";
import { cx } from "@/utils/cx";

export function LandingPage() {
  return (
    <div className="feral-jelly-mint flex min-h-screen w-full flex-col bg-background-full font-sans">
      <main
        className={cx(
          "relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col",
          "border-x border-separator-border",
        )}
      >
        <div className="relative flex w-full flex-col">
          <div
            className="absolute top-0 left-1/2 z-[-1] h-full w-[100vw] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(180deg, var(--color-background-full) 0%, var(--color-accent-500) 50%, var(--color-background-full) 100%)",
            }}
            aria-hidden
          />

          <div
            className="pointer-events-none absolute inset-0 z-50 border-x border-white/30"
            aria-hidden
          />

          <LandingNavbar />
          <LandingHero />
        </div>

        <div id="demo" className="relative z-10 w-full scroll-mt-24 bg-background-full">
          <LandingVideoBridge />
          <LandingHeroVideoSection />
        </div>

        <LandingFeatures />
        <LandingFooter />
      </main>
    </div>
  );
}
