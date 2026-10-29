"use client";

import { useEffect, useState } from "react";

import { currentSpeechRequest } from "@/lib/ai/speech";
import { withBasePath } from "@/lib/constants";
import { showToast } from "@/lib/notification-toast/show-toast";

let generation = 0;
let speakingId: string | null = null;
let generating = false;
let audio: HTMLAudioElement | null = null;
let objectUrls: string[] = [];
let abortController: AbortController | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function releaseAudio() {
  audio?.pause();
  audio = null;
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

export function stopReadoutIf(id: string) {
  if (speakingId === id) {
    stopReadout();
  }
}

export function stopReadout() {
  generation += 1;
  abortController?.abort();
  abortController = null;
  releaseAudio();
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
  speakingId = null;
  generating = false;
  notify();
}

function decodeMp3(part: string): string {
  const binary = atob(part);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
}

function playUrl(url: string, token: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (token !== generation) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const element = new Audio(url);
    audio = element;
    element.onended = finish;
    element.onpause = () => {
      if (token !== generation) finish();
    };
    element.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error("playback"));
    };
    void element.play().catch((error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

export function useReadoutActive(id: string): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(speakingId === id);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, [id]);

  return active;
}

export function useReadoutGenerating(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(generating);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return active;
}

export async function toggleReadout(id: string, text: string) {
  if (speakingId === id) {
    stopReadout();
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    showToast({
      title: "Nothing to read aloud",
      status: "information",
    });
    return;
  }

  stopReadout();
  const token = generation;
  speakingId = id;
  generating = true;
  notify();

  const controller = new AbortController();
  abortController = controller;
  const voice = currentSpeechRequest();

  try {
    const response = await fetch(withBasePath("/api/audio/speech"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        speaker: voice.speaker,
        language: voice.language,
      }),
      signal: controller.signal,
    });
    if (token !== generation) {
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        cause?: unknown;
        message?: string;
      } | null;
      const detail = typeof payload?.cause === "string" ? payload.cause : payload?.message;
      throw new Error(detail || "Could not read that aloud.");
    }
    const payload = (await response.json()) as { parts?: string[] };
    const parts = payload.parts?.filter((part) => part.length > 0) ?? [];
    if (parts.length === 0) {
      throw new Error("Sarvam did not return any audio.");
    }
    generating = false;
    notify();
    for (const part of parts) {
      if (token !== generation) {
        return;
      }
      const url = decodeMp3(part);
      objectUrls.push(url);
      await playUrl(url, token);
    }
  } catch (error) {
    if (token !== generation || (error instanceof DOMException && error.name === "AbortError")) {
      return;
    }
    generating = false;
    notify();
    showToast({
      title: "Could not read that aloud",
      description: error instanceof Error ? error.message : "Please try again.",
      status: "error",
    });
  } finally {
    if (token === generation) {
      generating = false;
      releaseAudio();
      speakingId = null;
      abortController = null;
      notify();
    }
  }
}
