import {
  type SarvamSttLanguageCode,
  readStoredVoiceLanguage,
} from "@/lib/ai/transcription";

export const BULBUL_MODEL = "bulbul:v4-flash" as const;
export const BULBUL_MAX_CHARS = 2500;
export const VOICE_SPEAKER_STORAGE_KEY = "nutrition-voice-tts-speaker";

export type SpeechVoice = {
  id: string;
  label: string;
};

type SpeechCatalog = {
  languageCode: "bn-IN" | "en-IN" | "gu-IN" | "hi-IN" | "kn-IN" | "mr-IN" | "ta-IN" | "te-IN";
  voices: SpeechVoice[];
};

const CODE_MIXED: SpeechCatalog = {
  languageCode: "en-IN",
  voices: [
    { id: "shubh_enhi_companion", label: "Shubh" },
    { id: "simran_enhi_customer", label: "Simran" },
    { id: "ishita_enhi_companion", label: "Ishita" },
    { id: "shalini_enhi_companion", label: "Shalini" },
    { id: "sunny_enhi_customer", label: "Sunny" },
  ],
};

const BY_LANGUAGE: Partial<Record<SarvamSttLanguageCode, SpeechCatalog>> = {
  "hi-IN": {
    languageCode: "hi-IN",
    voices: [
      { id: "shubh_hi_customer", label: "Shubh" },
      { id: "simran_hi_conversation", label: "Simran" },
      { id: "ritu_hi_conversation", label: "Ritu" },
      { id: "roopa_hi_conversational", label: "Roopa" },
      { id: "kavya_hi_conversational", label: "Kavya" },
    ],
  },
  "bn-IN": {
    languageCode: "bn-IN",
    voices: [
      { id: "bappa_bn_conversation", label: "Bappa" },
      { id: "roopa_bn_conversational", label: "Roopa" },
      { id: "bimal_bn_suspense", label: "Bimal" },
    ],
  },
  "gu-IN": {
    languageCode: "gu-IN",
    voices: [
      { id: "bhavik_gu_conversation", label: "Bhavik" },
      { id: "pooja_gu_conversational", label: "Pooja" },
      { id: "pooja_gu_customer", label: "Pooja (customer)" },
    ],
  },
  "kn-IN": {
    languageCode: "kn-IN",
    voices: [
      { id: "chaitra_kn_conversation", label: "Chaitra" },
      { id: "chetan_kn_conversation", label: "Chetan" },
      { id: "suchitra_kn_narration", label: "Suchitra" },
    ],
  },
  "mr-IN": {
    languageCode: "mr-IN",
    voices: [
      { id: "ishita_mr_conversational", label: "Ishita" },
      { id: "nilesh_mr_conversation", label: "Nilesh" },
      { id: "ritu_mr_narration", label: "Ritu" },
    ],
  },
  "ta-IN": {
    languageCode: "ta-IN",
    voices: [
      { id: "gokul_ta_narration", label: "Gokul" },
      { id: "vijay_ta_narration", label: "Vijay" },
      { id: "vetri_ta_ads", label: "Vetri" },
    ],
  },
  "te-IN": {
    languageCode: "te-IN",
    voices: [
      { id: "kavitha_te_conversation", label: "Kavitha" },
      { id: "pooja_te_conversation", label: "Pooja" },
      { id: "tarun_te_narration", label: "Tarun" },
    ],
  },
};

export function speechCatalogFor(language: SarvamSttLanguageCode): SpeechCatalog {
  return BY_LANGUAGE[language] ?? CODE_MIXED;
}

export function resolveSpeechVoice(
  language: SarvamSttLanguageCode,
  speaker: string | null | undefined,
): { languageCode: SpeechCatalog["languageCode"]; speaker: string } {
  const catalog = speechCatalogFor(language);
  const match = catalog.voices.find((voice) => voice.id === speaker);
  return {
    languageCode: catalog.languageCode,
    speaker: match?.id ?? catalog.voices[0]?.id ?? CODE_MIXED.voices[0].id,
  };
}

export function splitSpeechText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }
  if (cleaned.length <= BULBUL_MAX_CHARS) {
    return [cleaned];
  }

  const sentences = cleaned.split(/(?<=[.!?।])\s+/);
  const parts: string[] = [];
  let current = "";

  const pushLong = (value: string) => {
    for (let index = 0; index < value.length; index += BULBUL_MAX_CHARS) {
      parts.push(value.slice(index, index + BULBUL_MAX_CHARS));
    }
  };

  for (const sentence of sentences) {
    if (sentence.length > BULBUL_MAX_CHARS) {
      if (current) {
        parts.push(current);
        current = "";
      }
      pushLong(sentence);
      continue;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > BULBUL_MAX_CHARS) {
      parts.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) {
    parts.push(current);
  }
  return parts;
}

export function readStoredSpeechVoice(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(VOICE_SPEAKER_STORAGE_KEY);
}

export function storeSpeechVoice(speaker: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(VOICE_SPEAKER_STORAGE_KEY, speaker);
}

export function currentSpeechRequest(): {
  language: SarvamSttLanguageCode;
  speaker: string;
  languageCode: SpeechCatalog["languageCode"];
} {
  const language = readStoredVoiceLanguage();
  const resolved = resolveSpeechVoice(language, readStoredSpeechVoice());
  return { language, speaker: resolved.speaker, languageCode: resolved.languageCode };
}
