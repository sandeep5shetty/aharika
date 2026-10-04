"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import Image from "next/image";
import { type MouseEvent, type ReactNode } from "react";
import { withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

const LOGO_SRC = "/brand/aharika-logo.svg";

function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const localize = useTemplateCopy();
  return localize((
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-64 opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  ));
}

/** Sidebar mark: static jelly SVG + “Aharika”. Click navigates home (full reload on home). */
export function DashboardBrandLogo({
  collapsed = false,
  suppressHover = false,
  onHoverSuppressionEnd,
  className,
}: {
  collapsed?: boolean;
  suppressHover?: boolean;
  onHoverSuppressionEnd?: () => void;
  className?: string;
}) {
  const localize = useTemplateCopy();
  const homePath = withBasePath("/");
  const logoSrc = withBasePath(LOGO_SRC);
  const logoPx = collapsed ? 32 : 48;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const current = window.location.pathname.replace(/\/$/, "") || "/";
    const target = homePath.replace(/\/$/, "") || "/";
    if (current === target) {
      window.location.reload();
      return;
    }
    window.location.href = homePath;
  };

  return localize((
    <a
      href={homePath}
      aria-label="Aharika home"
      onClick={handleClick}
      onPointerLeave={() => {
        if (suppressHover) {
          onHoverSuppressionEnd?.();
        }
      }}
      className={cx(
        "feral-jelly-mint flex min-w-0 items-center gap-1.5 rounded-md outline-none",
        "transition-opacity hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
        collapsed && "w-10 justify-center gap-0",
        className,
      )}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
        style={{ width: logoPx, height: logoPx }}
        aria-hidden
      >
        <Image
          src={logoSrc}
          alt=""
          width={logoPx}
          height={logoPx}
          className="h-full w-full object-contain"
          priority
          unoptimized
        />
      </span>
      <Collapsible collapsed={collapsed}>
        <span className="font-moonet-wordmark whitespace-nowrap text-text-primary">
          AHARIKA
        </span>
      </Collapsible>
    </a>
  ));
}
