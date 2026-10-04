"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import type { UseChatHelpers } from "@ai-sdk/react";
import { RiCheckLine, RiFileCopyLine, RiVolumeMuteLine, RiVolumeUpLine } from "@remixicon/react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  MealLogCard,
  ProgressCard,
} from "@/components/application/nutrition/meal-log-card";
import { MealLogConfirmation } from "@/components/application/nutrition/meal-log-confirmation";
import { withBasePath } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";
import Image from "next/image";

const AHARIKA_LOGO_SRC = "/brand/aharika-logo.svg";

function AgentBlobAvatar() {
  return (
    <span
      className="feral-jelly-mint mt-0.5 inline-flex size-10 shrink-0 items-center justify-center"
      aria-hidden
    >
      <Image
        src={withBasePath(AHARIKA_LOGO_SRC)}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * One turn in the transcript.
 *
 * Assistant replies arrive a paragraph at a time, each softening in out of a
 * blur as it first appears and then only growing, so nothing already on screen
 * ever re-animates.
 *
 * The action row stays mounted under each assistant message and stays visible
 * (copy, read aloud, timestamp) so controls are always discoverable; it hides
 * only while that message is still streaming.
 */

export interface AgentMessageProps {
  role: string;
  text: string;
  /** True while this message is still being streamed. */
  streaming?: boolean;
  /** When the message first appeared, for the hover timestamp. */
  at?: number;
}

export function AgentMessage({ role, text, streaming = false, at }: AgentMessageProps) {
  const localize = useTemplateCopy();
  if (!text) return null;

  if (role === "user") {
    return localize((
      <p className="ms-auto flex w-fit max-w-[75%] flex-col rounded-2xl bg-background-primary-default px-3 py-[11px] text-start text-body-regular break-words whitespace-pre-wrap text-text-primary shadow-card">
        {text}
      </p>
    ));
  }

  return localize((
    <div className="group/message flex flex-col gap-1 px-1">
      <StreamedText text={text} />
      <MessageActions text={text} at={at} hidden={streaming} />
    </div>
  ));
}

/**
 * Paragraphs, each softening in once as it first appears.
 *
 * The animation deliberately lives at the line level rather than the word
 * level. Animating words looks worse in practice: a token arrives as a
 * fragment, the blur-in plays on that fragment, and then the fragment mutates
 * to the finished word with no transition — which reads as a stutter. It also
 * forces a swap from animated spans back to plain text when the stream ends,
 * and everything mid-flight snaps at once.
 *
 * A line mounts exactly once and then only grows, so nothing ever restarts or
 * snaps. Evenness of the text itself comes from the server, which releases
 * whole words on a steady tick (see `smoothStream` in the route).
 */
export function StreamedText({ text, paragraphs = false }: { text: string; paragraphs?: boolean }) {
  const localize = useTemplateCopy();
  const reduceMotion = useReducedMotion();
  const lines = useMemo(() => text.split(paragraphs ? /\n\s*\n/ : "\n").filter((line) => line.trim() !== ""), [text, paragraphs]);

  return localize((
    <div className="flex flex-col gap-3">
      {lines.map((line, index) => (
        <Line key={index} text={line} animate={!reduceMotion} />
      ))}
    </div>
  ));
}

/**
 * At module scope so their identity is stable. A line re-renders on every
 * token of the reply — dozens of times a second — and handing Motion a fresh
 * object literal each time invites it to re-evaluate a target that has not
 * actually changed.
 */
const LINE_HIDDEN = { opacity: 0, filter: "blur(5px)", y: 4 };
const LINE_SHOWN = { opacity: 1, filter: "blur(0px)", y: 0 };
const LINE_TRANSITION = { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] } as const;

/**
 * A settled line keeps `filter: blur(0px)` rather than losing the filter
 * altogether — Motion owns that property once it animates it, and a `style`
 * override does not win it back. At one filtered element per paragraph the
 * cost is invisible; it was only a problem when every word carried its own.
 *
 * memo matters here: without it every paragraph re-renders on each token of
 * the reply, which is wasted work for the lines that are already finished.
 */
const Line = memo(function Line({ text, animate }: { text: string; animate: boolean }) {
  return (
    <motion.p
      initial={animate ? LINE_HIDDEN : false}
      animate={LINE_SHOWN}
      transition={LINE_TRANSITION}
      className="text-body-regular break-words text-text-primary"
    >
      {text}
    </motion.p>
  );
});

function MessageActions({ text, at, hidden }: { text: string; at?: number; hidden: boolean }) {
  const localize = useTemplateCopy();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  // Speech keeps running if the component goes away mid-sentence, so it is
  // cancelled on unmount rather than left talking over the next screen.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // Silently leaving the icon unchanged is better than a thrown error.
    }
  };

  const toggleSpeech = () => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return localize((
    <div
      className={cx(
        "flex items-center gap-1",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <ActionButton label={copied ? "Copied" : "Copy message"} onClick={copy}>
        {copied ? <RiCheckLine className="size-4" aria-hidden /> : <RiFileCopyLine className="size-4" aria-hidden />}
      </ActionButton>

      <ActionButton label={speaking ? "Stop reading aloud" : "Read aloud"} onClick={toggleSpeech}>
        {speaking ? (
          <RiVolumeMuteLine className="size-4" aria-hidden />
        ) : (
          <RiVolumeUpLine className="size-4" aria-hidden />
        )}
      </ActionButton>

      {at ? (
        <time
          dateTime={new Date(at).toISOString()}
          suppressHydrationWarning
          className="ms-1 text-caption-1-regular text-text-tertiary"
        >
          {formatAgo(at)}
        </time>
      ) : null}
    </div>
  ));
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const localize = useTemplateCopy();
  return localize((
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-icon-tertiary transition-colors hover:bg-background-primary-default hover:text-foreground-icon-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
    >
      {children}
    </button>
  ));
}

/** "just now", "3 minutes ago", "2 hours ago" — matching how the rail reads. */
function formatAgo(at: number) {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isMealLogToolType(type: string) {
  return type === "tool-logMeal" || type === "tool-updateMeal";
}

function isMealApprovalUiState(state: string) {
  return (
    state === "approval-requested" ||
    state === "approval-responded" ||
    state === "input-available" ||
    state === "output-denied"
  );
}

export interface AgentChatTurnProps {
  message: ChatMessage;
  streaming?: boolean;
  at?: number;
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  guestMode?: boolean;
  onGuestMealBlocked?: () => void;
}

/** Renders one chat turn including nutrition tool cards. */
export function AgentChatTurn({
  message,
  streaming = false,
  at,
  addToolApprovalResponse,
  guestMode,
  onGuestMealBlocked,
}: AgentChatTurnProps) {
  const localize = useTemplateCopy();
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (message.role === "user") {
    return localize(<AgentMessage role="user" text={text} at={at} />);
  }

  const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"));

  const hasVisibleContent =
    Boolean(text) ||
    toolParts.some((part) => {
      const toolPart = part as { type: string; state: string };
      if (isMealLogToolType(toolPart.type) && toolPart.state === "output-available") {
        return true;
      }
      if (isMealLogToolType(toolPart.type) && isMealApprovalUiState(toolPart.state)) {
        return true;
      }
      if (toolPart.type === "tool-getProgress" && toolPart.state === "output-available") {
        return true;
      }
      return false;
    });

  if (!hasVisibleContent) {
    return null;
  }

  return localize((
    <div className="flex items-start gap-3 px-1">
      <AgentBlobAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
      {toolParts.map((part) => {
        const toolPart = part as {
          type: string;
          toolCallId: string;
          state: string;
          input?: unknown;
          output?: unknown;
        };

        if (
          isMealLogToolType(toolPart.type) &&
          toolPart.state === "output-available"
        ) {
          return (
            <MealLogCard
              key={toolPart.toolCallId}
              output={
                toolPart.output as Parameters<typeof MealLogCard>[0]["output"]
              }
            />
          );
        }

        if (
          isMealLogToolType(toolPart.type) &&
          isMealApprovalUiState(toolPart.state)
        ) {
          return (
            <MealLogConfirmation
              key={toolPart.toolCallId}
              addToolApprovalResponse={addToolApprovalResponse}
              guestMode={guestMode}
              onGuestMealBlocked={onGuestMealBlocked}
              toolPart={
                toolPart as Parameters<typeof MealLogConfirmation>[0]["toolPart"]
              }
            />
          );
        }

        if (
          toolPart.type === "tool-getProgress" &&
          toolPart.state === "output-available"
        ) {
          return (
            <ProgressCard
              key={toolPart.toolCallId}
              output={
                toolPart.output as Parameters<typeof ProgressCard>[0]["output"]
              }
            />
          );
        }

        return null;
      })}
      {text ? (
        <AgentMessage role="assistant" text={text} streaming={streaming} at={at} />
      ) : null}
      </div>
    </div>
  ));
}

export { AgentBlobAvatar };