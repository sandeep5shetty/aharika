"use client";

import { motion, useInView } from "motion/react";
import { useId, useRef, type ReactNode, type SVGProps } from "react";

import {
  LANDING_CHAT_CENTER,
  LANDING_CHAT_LEFT,
  LANDING_CHAT_RIGHT,
  LandingPhoneChat,
} from "@/components/application/landing/landing-phone-chat";
import { cx } from "@/utils/cx";

interface Iphone15ProProps extends SVGProps<SVGSVGElement> {
  width?: string | number;
  height?: string | number;
  screen?: ReactNode;
  className?: string;
  clipPathId: string;
}

function Iphone15Pro({
  width = "100%",
  height = "auto",
  screen,
  className,
  clipPathId,
  ...props
}: Iphone15ProProps) {
  return (
    <div className={cx("relative", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 433 882"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-500 ease-in-out"
        {...props}
      >
        <path
          d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"
          className="fill-neutral-800 dark:fill-neutral-950"
        />
        <path
          opacity="0.5"
          d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z"
          className="fill-neutral-700 dark:fill-neutral-300"
        />
        <path
          d="M21.25 75C21.25 44.2101 46.2101 19.25 77 19.25H355C385.79 19.25 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 21.25 837.79 21.25 807V75Z"
          className="fill-neutral-900 dark:fill-neutral-100"
        />
        {screen && (
          <foreignObject
            x="21.25"
            y="19.25"
            width="389.5"
            height="843.5"
            clipPath={`url(#${clipPathId})`}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "55.75px",
                overflow: "hidden",
                position: "relative",
              }}
              className="bg-background-full"
            >
              {screen}
            </div>
          </foreignObject>
        )}
        <path
          d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"
          className="fill-neutral-800 dark:fill-neutral-200"
        />
        <path
          d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z"
          className="fill-neutral-900 dark:fill-neutral-300"
        />
        <path
          d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z"
          className="fill-white/30 dark:fill-black/40"
        />
        <defs>
          <clipPath id={clipPathId}>
            <rect x="21.25" y="19.25" width="389.5" height="843.5" rx="55.75" ry="55.75" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

export function LandingTriplePhone() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, {
    once: true,
    margin: "-20% 0px -20% 0px",
  });
  const clipLeft = useId();
  const clipCenter = useId();
  const clipRight = useId();

  const common = {
    duration: 1.2,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  };

  const centerVariant = {
    hidden: { opacity: 0, y: "50%", scale: 0.85 },
    visible: {
      opacity: 1,
      y: "10%",
      scale: 1,
      transition: { ...common },
    },
  };

  const side = (dir: "left" | "right") => ({
    hidden: { opacity: 0, y: "55%", x: "0%", rotate: 0, scale: 0.85 },
    visible: {
      opacity: 0.88,
      y: "18%",
      x: dir === "left" ? "-50%" : "50%",
      rotate: dir === "left" ? -10 : 10,
      scale: 1,
      transition: { ...common, delay: 0.15 },
    },
  });

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[380px] w-full items-center justify-center"
    >
      <div className="relative flex h-full w-full max-w-4xl items-center justify-center">
        <motion.div
          variants={side("left")}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="absolute z-10 w-[240px] md:w-[280px] lg:w-[300px]"
        >
          <Iphone15Pro
            clipPathId={clipLeft}
            screen={
              <LandingPhoneChat messages={LANDING_CHAT_LEFT} animate={false} />
            }
          />
        </motion.div>

        <motion.div
          variants={centerVariant}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative z-20 w-[260px] md:w-[300px] lg:w-[320px]"
        >
          <Iphone15Pro
            clipPathId={clipCenter}
            screen={
              <LandingPhoneChat
                messages={LANDING_CHAT_CENTER}
                animate={isInView}
              />
            }
          />
        </motion.div>

        <motion.div
          variants={side("right")}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="absolute z-10 w-[240px] md:w-[280px] lg:w-[300px]"
        >
          <Iphone15Pro
            clipPathId={clipRight}
            screen={
              <LandingPhoneChat messages={LANDING_CHAT_RIGHT} animate={false} />
            }
          />
        </motion.div>
      </div>
    </div>
  );
}
