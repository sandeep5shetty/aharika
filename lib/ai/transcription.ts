export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const MIN_AUDIO_BYTES = 512;

export const VOICE_STT_LANGUAGE_STORAGE_KEY = "nutrition-voice-stt-language";

export const SARVAM_STT_LANGUAGE_CODES = [
  "unknown",
  "hi-IN",
  "en-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "bn-IN",
  "gu-IN",
] as const;

export type SarvamSttLanguageCode = (typeof SARVAM_STT_LANGUAGE_CODES)[number];

export const VOICE_STT_LANGUAGE_OPTIONS: {
  value: SarvamSttLanguageCode;
  label: string;
}[] = [
  { label: "Auto", value: "unknown" },
  { label: "Hindi", value: "hi-IN" },
  { label: "English", value: "en-IN" },
  { label: "Tamil", value: "ta-IN" },
  { label: "Telugu", value: "te-IN" },
  { label: "Kannada", value: "kn-IN" },
  { label: "Malayalam", value: "ml-IN" },
  { label: "Marathi", value: "mr-IN" },
  { label: "Bengali", value: "bn-IN" },
  { label: "Gujarati", value: "gu-IN" },
];

export function parseSarvamLanguageCode(
  value: FormDataEntryValue | null | undefined
): SarvamSttLanguageCode {
  if (typeof value !== "string") {
    return "unknown";
  }
  const trimmed = value.trim();
  if (SARVAM_STT_LANGUAGE_CODES.includes(trimmed as SarvamSttLanguageCode)) {
    return trimmed as SarvamSttLanguageCode;
  }
  return "unknown";
}

export function parseLanguageHints(
  value: FormDataEntryValue | null | undefined
): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

const BROWSER_LANG_TO_SARVAM: Record<string, SarvamSttLanguageCode> = {
  bn: "bn-IN",
  en: "en-IN",
  gu: "gu-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export function mapBrowserLanguageToSarvam(
  browserLang: string
): SarvamSttLanguageCode | null {
  const base = browserLang.split("-")[0]?.toLowerCase() ?? "";
  return BROWSER_LANG_TO_SARVAM[base] ?? null;
}

export function pickHintedLanguage(
  browserHints: string[]
): SarvamSttLanguageCode | null {
  for (const hint of browserHints) {
    const mapped = mapBrowserLanguageToSarvam(hint);
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

function countCharsMatching(
  text: string,
  predicate: (code: number) => boolean
) {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code !== undefined && predicate(code)) {
      count += 1;
    }
  }
  return count;
}

function isDevanagari(code: number) {
  return code >= 0x09_00 && code <= 0x09_7f;
}

function isTamil(code: number) {
  return code >= 0x0b_80 && code <= 0x0b_ff;
}

function isTelugu(code: number) {
  return code >= 0x0c_00 && code <= 0x0c_7f;
}

function isKannada(code: number) {
  return code >= 0x0c_80 && code <= 0x0c_ff;
}

function isMalayalam(code: number) {
  return code >= 0x0d_00 && code <= 0x0d_7f;
}

function isBengali(code: number) {
  return code >= 0x09_80 && code <= 0x09_ff;
}

function isGujarati(code: number) {
  return code >= 0x0a_80 && code <= 0x0a_ff;
}

const SCRIPT_CHECK_BY_LANG: Partial<
  Record<SarvamSttLanguageCode, (code: number) => boolean>
> = {
  "bn-IN": isBengali,
  "gu-IN": isGujarati,
  "hi-IN": isDevanagari,
  "kn-IN": isKannada,
  "ml-IN": isMalayalam,
  "mr-IN": isDevanagari,
  "ta-IN": isTamil,
  "te-IN": isTelugu,
};

export function scriptMatchesLanguage(
  text: string,
  language: SarvamSttLanguageCode
): boolean {
  const check = SCRIPT_CHECK_BY_LANG[language];
  if (!check) {
    return true;
  }
  const scriptChars = countCharsMatching(text, check);
  const letters = countCharsMatching(
    text,
    (code) =>
      (code >= 0x09_00 && code <= 0x0d_7f) ||
      (code >= 0x09_80 && code <= 0x09_ff) ||
      (code >= 0x0a_80 && code <= 0x0a_ff)
  );
  if (letters === 0) {
    return true;
  }
  return scriptChars / letters >= 0.5;
}

export function readStoredVoiceLanguage(): SarvamSttLanguageCode {
  if (typeof window === "undefined") {
    return "unknown";
  }
  const stored = window.localStorage.getItem(VOICE_STT_LANGUAGE_STORAGE_KEY);
  return parseSarvamLanguageCode(stored);
}

export function storeVoiceLanguage(code: SarvamSttLanguageCode) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(VOICE_STT_LANGUAGE_STORAGE_KEY, code);
}

export type SttTranscriptResult = {
  text: string;
  language_code?: string;
  language_probability?: number;
};
