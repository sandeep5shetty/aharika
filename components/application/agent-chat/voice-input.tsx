"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  RiArrowUpLine,
  RiCloseLine,
  RiMicLine,
  RiStopFill,
} from "@remixicon/react";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { showToast } from "@/lib/notification-toast/show-toast";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { withBasePath } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { getVoiceTranscriptionFormFields } from "@/components/application/agent-chat/voice-stt-language-select";

const MAX_RECORDING_DURATION_MS = 25_000;
const WAVEFORM_BAR_COUNT = 52;

type VoicePhase = "idle" | "recording" | "transcribing";

type VoiceInputContextValue = {
  phase: VoicePhase;
  levels: number[];
  startRecording: () => void;
  cancelRecording: () => void;
  finishRecording: () => void;
  disabled: boolean;
};

const VoiceInputContext = createContext<VoiceInputContextValue | null>(null);

function useVoiceInputContext() {
  const context = useContext(VoiceInputContext);
  if (!context) {
    throw new Error("VoiceInput components must be used within VoiceInputProvider");
  }
  return context;
}

function normalizeRecordingMime(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base.startsWith("audio/") || base === "video/webm") {
    return base;
  }
  return "audio/webm";
}

function useAudioLevels(stream: MediaStream | null, active: boolean) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.15),
  );

  useEffect(() => {
    if (!stream || !active) {
      setLevels(Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.15));
      return;
    }

    let raf = 0;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(frequencyData);
      const sliceWidth = Math.floor(frequencyData.length / WAVEFORM_BAR_COUNT);
      const next = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
        const start = index * sliceWidth;
        let sum = 0;
        for (let i = 0; i < sliceWidth; i += 1) {
          sum += frequencyData[start + i] ?? 0;
        }
        const average = sum / sliceWidth / 255;
        return Math.max(0.12, Math.min(1, average * 2.4 + 0.08));
      });
      setLevels(next);
      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => undefined);
    };
  }, [active, stream]);

  return levels;
}

function VoiceWaveform({
  active,
  levels,
}: {
  active: boolean;
  levels: number[];
}) {
  return (
    <div
      aria-hidden
      className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[3px] px-1"
    >
      {levels.map((level, index) => (
        <span
          className={cx(
            "w-[3px] shrink-0 rounded-full transition-[height,opacity] duration-100 ease-out",
            active
              ? "bg-text-primary opacity-80"
              : "animate-pulse bg-text-tertiary opacity-40",
          )}
          key={`wave-${index}`}
          style={{ height: `${Math.round(level * 100)}%`, maxHeight: "2rem" }}
        />
      ))}
    </div>
  );
}

function PureVoiceRecordingBar() {
  const { cancelRecording, finishRecording, levels, phase } = useVoiceInputContext();
  const isTranscribing = phase === "transcribing";

  return (
    <div
      className={cx(
        "flex w-full min-w-0 flex-1 items-center gap-2 rounded-full border px-2 py-1.5 shadow-xs backdrop-blur-md",
        phase === "recording"
          ? "border-accent-400 bg-background-primary-default ring-1 ring-accent-200"
          : "border-border-button-default bg-background-primary-default",
      )}
      data-testid="voice-recording-bar"
    >
      <IconButton
        aria-label="Cancel recording"
        className="shrink-0"
        disabled={isTranscribing}
        icon={RiCloseLine}
        onClick={cancelRecording}
        size="small"
        type="button"
      />

      <VoiceWaveform active={phase === "recording"} levels={levels} />

      <IconButton
        aria-label="Stop recording"
        className="shrink-0"
        disabled={isTranscribing}
        icon={RiStopFill}
        onClick={finishRecording}
        size="small"
        type="button"
      />

      <button
        aria-label="Send recording for transcription"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-button-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isTranscribing}
        onClick={finishRecording}
        type="button"
      >
        <RiArrowUpLine className="size-5" aria-hidden />
      </button>
    </div>
  );
}

export const VoiceRecordingBar = memo(PureVoiceRecordingBar);

function PureVoiceInputMicTrigger() {
  const { disabled, phase, startRecording } = useVoiceInputContext();
  const isBusy = phase === "transcribing";

  if (phase === "recording") {
    return null;
  }

  return (
    <TooltipTrigger delay={200}>
      <IconButton
        aria-label={isBusy ? "Transcribing" : "Record voice message"}
        className="bg-ai-chat-composer-add-background hover:bg-ai-chat-composer-add-hover-background"
        data-testid="voice-input-button"
        disabled={disabled || isBusy}
        icon={RiMicLine}
        onClick={startRecording}
        size="small"
        type="button"
      />
      <Tooltip size="sm">
        {isBusy
          ? "Transcribing…"
          : `Voice input (max ${MAX_RECORDING_DURATION_MS / 1000}s)`}
      </Tooltip>
    </TooltipTrigger>
  );
}

export const VoiceInputMicTrigger = memo(PureVoiceInputMicTrigger);

export function VoiceInputProvider({
  children,
  disabled,
  onTranscript,
  status,
}: {
  children: ReactNode;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [analysisStream, setAnalysisStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldTranscribeRef = useRef(true);
  const recordingMimeRef = useRef("audio/webm");

  const levels = useAudioLevels(analysisStream, phase === "recording");

  const stopStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    setAnalysisStream(null);
  }, []);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      setPhase("transcribing");

      const uploadForTranscript = async () => {
        const mimeType = normalizeRecordingMime(blob.type || "audio/webm");
        const formData = new FormData();
        formData.append(
          "audio",
          new File(
            [blob],
            `recording.${mimeType.includes("mp4") ? "m4a" : "webm"}`,
            { type: mimeType },
          ),
        );
        const { languageCode, languageHints } = getVoiceTranscriptionFormFields();
        formData.append("language_code", languageCode);
        formData.append("language_hints", languageHints);
        const response = await fetchWithErrorHandlers(
          withBasePath("/api/audio/transcribe"),
          {
            body: formData,
            credentials: "include",
            method: "POST",
          },
        );
        return (await response.json()) as { text?: string };
      };

      const isTransientFetchFailure = (error: unknown) =>
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("NetworkError") ||
            error.message.includes("Failed to fetch")));

      try {
        let data: { text?: string };
        try {
          data = await uploadForTranscript();
        } catch (firstError) {
          if (!isTransientFetchFailure(firstError)) {
            throw firstError;
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 600);
          });
          data = await uploadForTranscript();
        }

        const text = data.text?.trim();
        if (!text) {
          throw new Error("Empty transcript");
        }
        onTranscript(text);
      } catch (error) {
        if (error instanceof ChatbotError) {
          const detail =
            typeof error.cause === "string" && error.cause.length > 0
              ? error.cause
              : error.message;
          showToast({ title: "Voice input failed", description: detail, status: "error" });
        } else if (isTransientFetchFailure(error)) {
          showToast({
            title: "Could not reach the server",
            description: "Check your connection and try recording again.",
            status: "error",
          });
        } else {
          showToast({
            title: "Could not transcribe audio",
            description: "Try typing your meal instead.",
            status: "error",
          });
        }
      } finally {
        setPhase("idle");
      }
    },
    [onTranscript],
  );

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      if (typeof recorder.requestData === "function") {
        recorder.requestData();
      }
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || status !== "ready" || phase !== "idle") {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      showToast({
        title: "Voice not supported",
        description: "This browser cannot record audio. Type your message instead.",
        status: "error",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setAnalysisStream(stream);
      chunksRef.current = [];
      shouldTranscribeRef.current = true;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      const mimeType =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

      if (!mimeType) {
        showToast({
          title: "Recording not supported",
          description: "Try a different browser or type your message.",
          status: "error",
        });
        clearMaxDurationTimer();
        stopStream();
        return;
      }

      recordingMimeRef.current = normalizeRecordingMime(mimeType);
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearMaxDurationTimer();
        stopStream();
        if (!shouldTranscribeRef.current) {
          shouldTranscribeRef.current = true;
          chunksRef.current = [];
          setPhase("idle");
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recordingMimeRef.current,
        });
        if (blob.size === 0) {
          setPhase("idle");
          showToast({
            title: "No audio captured",
            description: "Hold the mic a little longer and try again.",
            status: "error",
          });
          return;
        }
        lastBlobRef.current = blob;
        transcribeBlob(blob);
      };

      recorder.start(250);
      maxDurationTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          showToast({
            title: "Recording limit reached",
            description: "Transcribing what we captured.",
            status: "information",
          });
          stopRecorder();
        }
      }, MAX_RECORDING_DURATION_MS);
      setPhase("recording");
    } catch {
      clearMaxDurationTimer();
      stopStream();
      setPhase("idle");
      showToast({
        title: "Microphone blocked",
        description: "Allow microphone access in your browser to use voice input.",
        status: "error",
      });
    }
  }, [
    clearMaxDurationTimer,
    disabled,
    phase,
    status,
    stopRecorder,
    stopStream,
    transcribeBlob,
  ]);

  const cancelRecording = useCallback(() => {
    shouldTranscribeRef.current = false;
    stopRecorder();
  }, [stopRecorder]);

  const finishRecording = useCallback(() => {
    shouldTranscribeRef.current = true;
    stopRecorder();
  }, [stopRecorder]);

  useEffect(
    () => () => {
      shouldTranscribeRef.current = false;
      clearMaxDurationTimer();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      stopStream();
    },
    [clearMaxDurationTimer, stopStream],
  );

  const value = useMemo<VoiceInputContextValue>(
    () => ({
      cancelRecording,
      disabled: Boolean(disabled) || status !== "ready",
      finishRecording,
      levels,
      phase,
      startRecording,
    }),
    [
      cancelRecording,
      disabled,
      finishRecording,
      levels,
      phase,
      startRecording,
      status,
    ],
  );

  return (
    <VoiceInputContext.Provider value={value}>{children}</VoiceInputContext.Provider>
  );
}

export function useVoiceInputPhase() {
  return useVoiceInputContext().phase;
}
