"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import type { UseChatHelpers } from "@ai-sdk/react";
import { RiArrowUpLine, RiStopFill } from "@remixicon/react";
import { type FormEvent, type KeyboardEvent, useRef } from "react";

import { ComposerLoader } from "@/components/application/composer-loader/composer-loader";
import {
  useVoiceInputPhase,
  VoiceInputMicTrigger,
  VoiceInputProvider,
  VoiceRecordingBar,
} from "@/components/application/agent-chat/voice-input";
import { VoiceSttLanguageSelect } from "@/components/application/agent-chat/voice-stt-language-select";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";

/** Mint gradient aligned with Aharika / feral-jelly theme (see theme.css accent ramp). */
const AHARIKA_COMPOSER_LOADER_COLORS: [string, string, string, string] = [
  "#c9f7e8",
  "#5ee0b0",
  "#00bc7d",
  "#7ccf00",
];

const COMPOSER_PILL_HEIGHT_PX = 52;
const COMPOSER_PILL_RADIUS_PX = COMPOSER_PILL_HEIGHT_PX / 2;

export interface AgentComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onVoiceTranscript: (text: string) => void;
  busy: boolean;
  chatStatus: UseChatHelpers<ChatMessage>["status"];
  voiceEnabled?: boolean;
  className?: string;
}

export function AgentComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  onVoiceTranscript,
  busy,
  chatStatus,
  voiceEnabled = true,
  className,
}: AgentComposerProps) {
  const localize = useTemplateCopy();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const formProps = {
    busy,
    onKeyDown,
    onStop,
    onSubmit: submit,
    onValueChange,
    inputRef,
    value,
    voiceEnabled,
  };

  return localize((
    <div className={cx("flex w-full flex-col gap-2.5", className)}>
      {voiceEnabled ? (
        <VoiceInputProvider
          disabled={busy}
          onTranscript={onVoiceTranscript}
          status={chatStatus}
        >
          <ComposerWithLoaderVoice {...formProps} />
        </VoiceInputProvider>
      ) : (
        <ComposerWithLoaderIdle {...formProps} />
      )}

      {voiceEnabled ? (
        <div className="flex h-[26px] w-full items-center justify-end">
          <VoiceSttLanguageSelect />
        </div>
      ) : null}
    </div>
  ));
}

type ComposerFormCoreProps = Omit<AgentComposerFormProps, "phase">;

function ComposerWithLoaderVoice(formProps: ComposerFormCoreProps) {
  const phase = useVoiceInputPhase();
  return <ComposerLoaderShell {...formProps} phase={phase} />;
}

function ComposerWithLoaderIdle(formProps: ComposerFormCoreProps) {
  return <ComposerLoaderShell {...formProps} phase="idle" />;
}

function ComposerLoaderShell({
  phase,
  ...formProps
}: ComposerFormCoreProps & {
  phase: AgentComposerFormProps["phase"];
}) {
  return (
    <ComposerLoader
      active
      className="w-full"
      radius={COMPOSER_PILL_RADIUS_PX}
      colors={AHARIKA_COMPOSER_LOADER_COLORS}
      intensity={0.72}
      bloom={14}
      bloomStrength={0.28}
      arc={110}
      speed={4.2}
    >
      <AgentComposerForm {...formProps} phase={phase} />
    </ComposerLoader>
  );
}

type AgentComposerFormProps = {
  busy: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent) => void;
  onValueChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  voiceEnabled: boolean;
  phase: "idle" | "recording" | "transcribing";
};

function AgentComposerForm({
  busy,
  onKeyDown,
  onStop,
  onSubmit,
  onValueChange,
  inputRef,
  value,
  voiceEnabled,
  phase,
}: AgentComposerFormProps) {
  const showRecordingBar = phase === "recording" || phase === "transcribing";

  return (
    <form
      onSubmit={onSubmit}
      className={cx(
        "flex w-full flex-col gap-1 rounded-full p-2",
        showRecordingBar ? "min-h-[52px]" : "h-[52px]",
        "bg-transparent shadow-none",
        !showRecordingBar && "flex-row items-center gap-2.5",
      )}
    >
      {showRecordingBar ? (
        <div className="flex w-full flex-col justify-center gap-1 px-0.5 py-0.5">
          <VoiceRecordingBar />
          <p className="text-center text-caption-1-semibold text-text-tertiary">
            {phase === "transcribing"
              ? "Transcribing your meal…"
              : "Listening… tap send or stop when finished"}
          </p>
        </div>
      ) : (
        <>
          {voiceEnabled ? <VoiceInputMicTrigger /> : null}

          <label className="sr-only" htmlFor="agent-composer-input">
            Message
          </label>
          <input
            id="agent-composer-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What did you eat?"
            autoComplete="off"
            disabled={busy}
            className="h-5 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary caret-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="flex shrink-0 items-center ps-1.5">
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-secondary transition-colors hover:bg-background-secondary-hover"
              >
                <RiStopFill className="size-5" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send message"
                disabled={value.trim().length === 0}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-button-primary text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RiArrowUpLine className="size-5" aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
    </form>
  );
}
