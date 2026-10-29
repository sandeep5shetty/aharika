"use client";

import { useCallback, useEffect, useState, type Key } from "react";
import { RiVoiceprintLine } from "@remixicon/react";

import { Select, SelectItem } from "@/components/base/select/select";
import {
  readStoredSpeechVoice,
  resolveSpeechVoice,
  speechCatalogFor,
  storeSpeechVoice,
  type SpeechVoice,
} from "@/lib/ai/speech";
import {
  readStoredVoiceLanguage,
  VOICE_LANGUAGE_EVENT,
  type SarvamSttLanguageCode,
} from "@/lib/ai/transcription";
import { cx } from "@/utils/cx";

export function VoiceSpeakerSelect({ className }: { className?: string }) {
  const [language, setLanguage] = useState<SarvamSttLanguageCode>("unknown");
  const [speaker, setSpeaker] = useState<string>("");

  const sync = useCallback(() => {
    const nextLanguage = readStoredVoiceLanguage();
    const catalog = speechCatalogFor(nextLanguage);
    const resolved = resolveSpeechVoice(nextLanguage, readStoredSpeechVoice());
    setLanguage(nextLanguage);
    setSpeaker(resolved.speaker);
    if (!catalog.voices.some((voice) => voice.id === readStoredSpeechVoice())) {
      storeSpeechVoice(resolved.speaker);
    }
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(VOICE_LANGUAGE_EVENT, sync);
    return () => window.removeEventListener(VOICE_LANGUAGE_EVENT, sync);
  }, [sync]);

  const voices: SpeechVoice[] = speechCatalogFor(language).voices;

  const handleChange = useCallback((key: Key | null) => {
    if (key === null) {
      return;
    }
    const next = String(key);
    setSpeaker(next);
    storeSpeechVoice(next);
  }, []);

  return (
    <Select
      aria-label="Readout voice"
      className={cx("w-[7.25rem]", className)}
      selectedKey={speaker || voices[0]?.id}
      onSelectionChange={handleChange}
      size="sm"
      triggerClassName="text-caption-1-semibold"
      renderValue={(state) => (
        <>
          <RiVoiceprintLine
            className="size-3.5 shrink-0 text-foreground-icon-secondary"
            aria-hidden
          />
          <span className="truncate">{state.selectedText}</span>
        </>
      )}
    >
      {voices.map((voice) => (
        <SelectItem id={voice.id} key={voice.id} textValue={voice.label}>
          {voice.label}
        </SelectItem>
      ))}
    </Select>
  );
}
