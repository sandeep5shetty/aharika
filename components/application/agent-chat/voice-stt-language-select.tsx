"use client";

import { useCallback, useEffect, useState, type Key } from "react";
import { Select, SelectItem } from "@/components/base/select/select";
import {
  readStoredVoiceLanguage,
  type SarvamSttLanguageCode,
  storeVoiceLanguage,
  VOICE_STT_LANGUAGE_OPTIONS,
} from "@/lib/ai/transcription";
import { cx } from "@/utils/cx";

export function VoiceSttLanguageSelect({ className }: { className?: string }) {
  const [language, setLanguage] = useState<SarvamSttLanguageCode>("unknown");

  useEffect(() => {
    setLanguage(readStoredVoiceLanguage());
  }, []);

  const handleChange = useCallback((key: Key | null) => {
    if (key === null) {
      return;
    }
    const next = String(key) as SarvamSttLanguageCode;
    setLanguage(next);
    storeVoiceLanguage(next);
  }, []);

  return (
    <Select
      aria-label="Voice recognition language"
      className={cx("w-[5.5rem]", className)}
      selectedKey={language}
      onSelectionChange={handleChange}
      size="sm"
      triggerClassName="text-caption-1-semibold"
    >
      {VOICE_STT_LANGUAGE_OPTIONS.map((option) => (
        <SelectItem id={option.value} key={option.value} textValue={option.label}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}

export function getVoiceTranscriptionFormFields() {
  const languageCode = readStoredVoiceLanguage();
  const languageHints = JSON.stringify(
    typeof navigator === "undefined"
      ? []
      : Array.from(navigator.languages ?? [navigator.language]),
  );
  return { languageCode, languageHints };
}
