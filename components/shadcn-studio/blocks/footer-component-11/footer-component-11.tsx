"use client";

import Link from "next/link";
import type { ComponentType } from "react";

import BrandCursorIcon from "@/components/ui/brand-cursor-icon";
import GithubIcon from "@/components/ui/github-icon";
import InstagramIcon from "@/components/ui/instagram-icon";
import LinkedinIcon from "@/components/ui/linkedin-icon";
import TwitterXIcon from "@/components/ui/twitter-x-icon";
import type { AnimatedIconProps } from "@/components/ui/types";
import { Separator } from "@/components/ui/separator";
import { FeralJellyBlob } from "@/components/foundations/feral-blob/feral-jelly-blob";
import { withBasePath } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CREATOR_HANDLE = "Sandeep Shetty";
const CREATOR_X_URL = "https://x.com/sandyyy_dev";

const socialIconClass = "text-foreground-icon-primary";

const socials: {
  label: string;
  href: string;
  Icon: ComponentType<AnimatedIconProps>;
}[] = [
  { label: "GitHub", href: "https://github.com/sandeep5shetty", Icon: GithubIcon },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sandeep-shetty-dev/",
    Icon: LinkedinIcon,
  },
  { label: "X", href: CREATOR_X_URL, Icon: TwitterXIcon },
  {
    label: "Instagram",
    href: "https://www.instagram.com/sxndeep_shetty/",
    Icon: InstagramIcon,
  },
  { label: "Cursor", href: "https://cursor.com/@sandeepshetty", Icon: BrandCursorIcon },
];

const socialButtonClass = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-button-default",
  "bg-background-primary-default text-text-primary shadow-sm transition-colors",
  "hover:bg-background-secondary-default",
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
  "sm:size-12",
);

/**
 * Shadcn Studio footer-component-11 — minimal white footer.
 * @see https://shadcnstudio.com/blocks/marketing-ui/footer-component
 */
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t border-separator-border bg-background-primary-default py-6 sm:py-12 lg:py-14",
      )}
    >
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <div className="flex items-center gap-3 sm:gap-4">
            {socials.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className={socialButtonClass}
              >
                <social.Icon size={22} className={socialIconClass} aria-hidden />
              </Link>
            ))}
          </div>
          <Separator className="flex-1" />
        </div>

        <div
          className={cn(
            "mx-auto grid w-full max-w-4xl grid-cols-1 items-center gap-5",
            "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-6",
          )}
        >
          <p className="text-center text-body-regular text-text-secondary sm:text-end">
            Thank you for visiting Aharika
          </p>
          <div
            className="feral-jelly-mint mx-auto flex size-24 shrink-0 items-center justify-center sm:size-28"
            aria-hidden
          >
            <FeralJellyBlob size="lg" mood="happy" stillBody />
          </div>
          <p className="text-center text-body-regular text-text-secondary sm:text-start">
            Let&apos;s eat mindfully, your way
          </p>
        </div>

        <div className="space-y-1 text-center">
          <Link
            href={withBasePath("/")}
            className={cn(
              "mx-auto block w-fit font-instrument-serif text-5xl font-normal tracking-tight text-text-primary",
              "transition-opacity hover:opacity-85 sm:text-6xl",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            Aharika
          </Link>
          <p className="text-caption-1-medium text-text-tertiary">
            <Link
              href={CREATOR_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "transition-colors hover:text-text-secondary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              @{CREATOR_HANDLE}
            </Link>{" "}
            {year}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
