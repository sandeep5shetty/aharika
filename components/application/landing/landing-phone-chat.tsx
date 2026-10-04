"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

export type LandingPhoneChatMessage = {
  id: string;
  name: string;
  message: string;
};

const AHARIKA_LOGO = withBasePath("/brand/aharika-favicon.svg");

/** Upscale UI inside the iPhone foreignObject (layout box stays unscaled). */
const LANDING_PHONE_SCREEN_SCALE = 1.38;
const LANDING_PHONE_SCREEN_INNER_PCT = `${(100 / LANDING_PHONE_SCREEN_SCALE).toFixed(3)}%`;

function ChatBubble({
  message,
  isCurrentUser,
}: {
  message: LandingPhoneChatMessage;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={cx(
        "flex max-w-[88%] items-end gap-2",
        isCurrentUser ? "ms-auto flex-row-reverse" : "me-auto",
      )}
    >
      {!isCurrentUser && (
        <span
          className={cx(
            "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full",
            "bg-accent-100 ring-1 ring-border-button-default",
          )}
        >
          <Image
            src={AHARIKA_LOGO}
            alt=""
            width={24}
            height={24}
            className="size-6 object-contain"
            unoptimized
          />
        </span>
      )}
      <p
        className={cx(
          "rounded-2xl px-3 py-2 text-body-regular break-words",
          isCurrentUser
            ? "rounded-br-md bg-background-primary-default text-text-primary shadow-sm"
            : "rounded-bl-md bg-accent-100 text-text-primary",
        )}
      >
        {message.message}
      </p>
    </div>
  );
}

export function LandingPhoneChat({
  messages,
  currentUser = "You",
  animate = true,
  className,
}: {
  messages: LandingPhoneChatMessage[];
  currentUser?: string;
  animate?: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<LandingPhoneChatMessage[]>(
    animate ? [] : messages,
  );

  useEffect(() => {
    if (!animate) {
      setVisible(messages);
      return;
    }

    setVisible([]);
    let cancelled = false;

    (async () => {
      for (const msg of messages) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 650));
        if (cancelled) return;
        setVisible((prev) => [...prev, msg]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [animate, messages]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible]);

  return (
    <div
      className={cx(
        "relative h-full w-full overflow-hidden bg-background-full",
        className,
      )}
    >
      <div
        className="absolute top-0 start-1/2 flex origin-top flex-col bg-background-full"
        style={{
          width: LANDING_PHONE_SCREEN_INNER_PCT,
          height: LANDING_PHONE_SCREEN_INNER_PCT,
          transform: `translateX(-50%) scale(${LANDING_PHONE_SCREEN_SCALE})`,
          transformOrigin: "top center",
        }}
      >
        <div
          className={cx(
            "flex shrink-0 items-center justify-center gap-1.5 border-b border-separator-border",
            "bg-background-primary-default px-4 pb-3.5 pt-14",
          )}
        >
          <Image
            src={AHARIKA_LOGO}
            alt=""
            width={22}
            height={22}
            className="size-[22px]"
            unoptimized
          />
          <span
            className={cx(
              "font-moonet text-xl leading-none tracking-[0.02em] text-text-primary",
              "uppercase",
            )}
          >
            Aharika
          </span>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 pt-5 pb-3"
        >
          {visible.map((message) => {
            const isCurrentUser = message.name === currentUser;
            return (
              <motion.div
                key={message.id}
                initial={animate ? { opacity: 0, y: 12 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <ChatBubble message={message} isCurrentUser={isCurrentUser} />
              </motion.div>
            );
          })}
          {visible.length > 0 && visible[visible.length - 1].name === currentUser && (
            <p className="ms-auto pe-1 text-body-2-regular text-text-tertiary">Delivered</p>
          )}
        </div>

        <div
          className="pointer-events-none h-10 shrink-0 bg-linear-to-t from-background-full to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

export const LANDING_CHAT_CENTER: LandingPhoneChatMessage[] = [
  {
    id: "1",
    name: "You",
    message: "I had 2 chapati, dal, and curd rice for lunch",
  },
  {
    id: "2",
    name: "Aharika",
    message: "Logged lunch — about 520 kcal. You're at 1,420 kcal today (71% of goal).",
  },
  {
    id: "3",
    name: "You",
    message: "How much protein do I have left?",
  },
  {
    id: "4",
    name: "Aharika",
    message: "About 38g left to hit your 120g goal. Nice dal portion!",
  },
];

export const LANDING_CHAT_LEFT: LandingPhoneChatMessage[] = [
  { id: "l1", name: "You", message: "Logged idli and sambar for breakfast" },
  {
    id: "l2",
    name: "Aharika",
    message: "Breakfast saved — 280 kcal. Want to set a protein target?",
  },
];

export const LANDING_CHAT_RIGHT: LandingPhoneChatMessage[] = [
  {
    id: "r1",
    name: "Aharika",
    message: "Today: 1,420 / 2,000 kcal · Protein 82g / 120g",
  },
  { id: "r2", name: "You", message: "Remind me to log dinner tonight" },
  {
    id: "r3",
    name: "Aharika",
    message: "Got it — I'll nudge you around 8 PM.",
  },
];
