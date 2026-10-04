"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import { ButtonLink } from "@/components/base/buttons/button";
import { LinkButton } from "@/components/base/buttons/link-button";
import { RiArrowRightLine } from "@remixicon/react";
import { CHAT_PATH, LANDING_PATH, withBasePath } from "@/lib/constants";

const LOGO_SRC = "/brand/aharika-logo.svg";

const navLinkClass =
  "text-body-medium text-text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2";

function scrollToSection(
  event: MouseEvent<HTMLAnchorElement>,
  sectionId: string,
  hashHref: string,
) {
  const section = document.getElementById(sectionId);
  if (!section) {
    return;
  }

  event.preventDefault();
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  window.history.pushState(null, "", hashHref);
}

export function LandingNavbar() {
  const homeHref = withBasePath(LANDING_PATH);
  const chatHref = withBasePath(CHAT_PATH);
  const loginHref = withBasePath("/login");
  const dashboardHref = withBasePath("/dashboard");
  const logoSrc = withBasePath(LOGO_SRC);

  const featuresHref = `${homeHref}#features`;
  const demoHref = `${homeHref}#demo`;
  const footerHref = `${homeHref}#footer`;

  return (
    <header className="flex w-full items-center justify-between border-b border-white/50 px-4 py-6 md:px-8">
      <Link href={homeHref} className="flex items-center gap-2">
        <Image
          src={logoSrc}
          alt="Aharika logo"
          width={28}
          height={28}
          className="size-7"
          unoptimized
        />
        <span className="font-moonet-wordmark text-xl font-bold tracking-tight text-text-primary">
          AHARIKA
        </span>
      </Link>

      <nav className="hidden items-center gap-4 md:flex lg:gap-8" aria-label="Primary">
        <Link
          href={featuresHref}
          className={navLinkClass}
          onClick={(event) => scrollToSection(event, "features", featuresHref)}
        >
          Features
        </Link>
        <Link
          href={demoHref}
          className={navLinkClass}
          onClick={(event) => scrollToSection(event, "demo", demoHref)}
        >
          Demo
        </Link>
        <Link
          href={footerHref}
          className={navLinkClass}
          onClick={(event) => scrollToSection(event, "footer", footerHref)}
        >
          Footer
        </Link>
        <Link href={dashboardHref} className={navLinkClass}>
          Dashboard
        </Link>
      </nav>

    <div className="flex items-center gap-4">
        
        <LinkButton href={loginHref} className="hidden sm:inline-flex">
          Sign in
        </LinkButton>
        <ButtonLink href={chatHref} size="small" leadingIcon={RiArrowRightLine}>
          Open coach
        </ButtonLink>
      </div>
    </header>
  );
}
