"use client";

import { RiArrowLeftLine, RiHammerLine, RiHomeLine } from "@remixicon/react";

import { ButtonLink } from "@/components/base/buttons/button";
import { LANDING_PATH, withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

export interface SettingsUnderConstructionProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Placeholder for settings pages that are not shipped yet — centered in the
 * modal content area, accent icon tile, primary/secondary actions.
 */
export function SettingsUnderConstruction({
  title,
  description = "We're building something useful here. This section will be available soon — check back later.",
  className,
}: SettingsUnderConstructionProps) {
  return (
    <div
      className={cx(
        "flex min-h-[min(420px,50vh)] w-full flex-col items-center justify-center px-2 py-10 text-center",
        className,
      )}
    >
      <div
        className={cx(
          "mb-6 flex size-20 items-center justify-center rounded-3xl",
          "border border-border-button-default bg-accent-50 shadow-xs",
        )}
        aria-hidden
      >
        <RiHammerLine className="size-10 text-accent-600" />
      </div>

      <p className="text-caption-1-semibold tracking-wide text-accent-700 uppercase">Coming soon</p>
      <h3 className="mt-2 text-title-2-medium text-text-primary">{title}</h3>
      <p className="mt-3 max-w-md text-body-medium text-text-secondary">{description}</p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href={withBasePath(LANDING_PATH)} variant="primary" size="medium" leadingIcon={RiHomeLine}>
          Go home
        </ButtonLink>
        <ButtonLink
          href={withBasePath("/dashboard")}
          variant="secondary"
          size="medium"
          leadingIcon={RiArrowLeftLine}
        >
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
