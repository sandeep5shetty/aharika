"use client";

import { useDirection } from "@/components/foundations/direction/direction";
import { useEffect, useRef, useState, type Key } from "react";
import { createPortal } from "react-dom";
import { RiChatSmile2Line, RiCheckLine } from "@remixicon/react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Select, SelectItem } from "@/components/base/select/select";
import { HintText } from "@/components/base/input/hint-text";
import { Textarea } from "@/components/base/textarea/textarea";
import { guestRegex, withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

const MIN_MESSAGE_LENGTH = 10;

const CATEGORIES = [
  { id: "general", label: "General feedback" },
  { id: "bug", label: "Something isn’t working" },
  { id: "idea", label: "Feature idea" },
] as const;

type FeedbackCategory = (typeof CATEGORIES)[number]["id"];

export function FeedbackModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const direction = useDirection();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const email = session?.user?.email ?? "";
  const isGuest =
    session?.user?.type === "guest" || guestRegex.test(email);
  const fromLine = isGuest
    ? "Sending as Guest (trial)"
    : email
      ? `We’ll tie this to ${email}`
      : "Signed in";

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      unmountTimer.current = setTimeout(() => {
        setMounted(false);
        setPhase("form");
        setMessage("");
        setCategory("general");
        setError(null);
        setSubmitting(false);
        setMessageTouched(false);
      }, 320);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const trimmedLength = message.trim().length;
  const belowMinimum = trimmedLength < MIN_MESSAGE_LENGTH;
  const showMinimumHint =
    belowMinimum && (messageTouched || message.length > 0);
  const charactersRemaining = MIN_MESSAGE_LENGTH - trimmedLength;

  const canSubmit = trimmedLength >= MIN_MESSAGE_LENGTH && !submitting;

  const handleSubmit = async () => {
    if (belowMinimum) {
      setMessageTouched(true);
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(withBasePath("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setPhase("success");
    } catch {
      setError("Could not send feedback. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      dir={direction}
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close feedback"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          "absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cx(
          "relative w-full max-w-[440px] transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.92] opacity-0 blur-[4px]",
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          tabIndex={-1}
          className="flex flex-col gap-5 rounded-3xl border border-border-button-default bg-background-full p-6 shadow-dropdown outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background-secondary-default"
                aria-hidden
              >
                <RiChatSmile2Line className="size-5 text-foreground-icon-secondary" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="feedback-modal-title" className="text-title-3-semibold text-text-primary">
                  Send feedback
                </h2>
                <p className="text-body-regular text-text-secondary">
                  Tell us what’s working, what’s confusing, or what you’d like Aharika to do next.
                </p>
              </div>
            </div>
            <CloseButton size="sm" aria-label="Close" onClick={onClose} />
          </div>

          {phase === "success" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span
                className="flex size-12 items-center justify-center rounded-full bg-accent-100 text-accent-700"
                aria-hidden
              >
                <RiCheckLine className="size-6" />
              </span>
              <p className="text-body-medium text-text-primary">Thanks — we got your note.</p>
              <p className="text-body-regular text-text-secondary">
                Your feedback helps us improve the coach for everyone.
              </p>
              <Button variant="primary" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <p className="text-body-2-regular text-text-tertiary">{fromLine}</p>

              <div className="flex flex-col gap-2">
                <span className="text-body-medium text-text-primary">Topic</span>
                <Select
                  aria-label="Feedback topic"
                  selectedKey={category}
                  onSelectionChange={(key: Key | null) => {
                    if (key === null) return;
                    setCategory(String(key) as FeedbackCategory);
                  }}
                  className="w-full"
                >
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item.id} id={item.id} textValue={item.label}>
                      {item.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Textarea
                  label="Your message"
                  placeholder="Share as much detail as you can — what you expected, what happened, and anything we should know."
                  value={message}
                  onChange={setMessage}
                  onBlur={() => setMessageTouched(true)}
                  rows={4}
                  autoResize
                  maxRows={12}
                  maxLength={2000}
                  showCount
                  isRequired
                />
                {showMinimumHint ? (
                  <HintText isInvalid slot="errorMessage">
                    {trimmedLength === 0
                      ? `Please enter at least ${MIN_MESSAGE_LENGTH} characters.`
                      : `${charactersRemaining} more character${charactersRemaining === 1 ? "" : "s"} needed (minimum ${MIN_MESSAGE_LENGTH}).`}
                  </HintText>
                ) : belowMinimum ? (
                  <p className="text-body-2-regular text-text-tertiary">
                    Minimum {MIN_MESSAGE_LENGTH} characters.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="text-body-regular text-text-error-primary" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {submitting ? "Sending…" : "Send feedback"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
