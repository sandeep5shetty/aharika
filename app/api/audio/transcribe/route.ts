import { SarvamAIClient } from "sarvamai";
import { auth } from "@/lib/auth";
import {
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  parseLanguageHints,
  parseSarvamLanguageCode,
  pickHintedLanguage,
  type SarvamSttLanguageCode,
  type SttTranscriptResult,
  scriptMatchesLanguage,
} from "@/lib/ai/transcription";
import { ChatbotError } from "@/lib/errors";

export const maxDuration = 60;

function normalizeAudioType(type: string): string {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!base || base === "application/octet-stream") {
    return "audio/webm";
  }
  return base;
}

function isAllowedAudioType(type: string): boolean {
  const base = normalizeAudioType(type);
  if (base.startsWith("audio/")) {
    return true;
  }
  return base === "video/webm";
}

function extensionForType(type: string): string {
  const base = normalizeAudioType(type);
  if (base.includes("webm")) {
    return "webm";
  }
  if (base.includes("mp4") || base.includes("m4a")) {
    return "m4a";
  }
  if (base.includes("mpeg") || base.includes("mp3")) {
    return "mp3";
  }
  if (base.includes("wav")) {
    return "wav";
  }
  if (base.includes("ogg")) {
    return "ogg";
  }
  if (base.includes("aac")) {
    return "aac";
  }
  return "webm";
}

function sarvamErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Speech recognition failed. Please try again.";
  }
  const { message } = error;
  if (message.includes("invalid_api_key") || message.includes("403")) {
    return "Invalid Sarvam API key. Check SARVAM_API_KEY in .env.local.";
  }
  if (message.includes("Failed to read the file")) {
    return "Could not read the recording. Hold the mic button a little longer and try again.";
  }
  if (message.length > 0 && message.length < 200) {
    return message;
  }
  return "Speech recognition failed. Please try again.";
}

async function runTranscription(
  client: SarvamAIClient,
  file: File,
  languageCode: SarvamSttLanguageCode
): Promise<SttTranscriptResult> {
  const result = await client.speechToText.transcribe({
    file,
    language_code: languageCode,
    model: "saaras:v4",
  });
  return {
    language_code: result.language_code,
    language_probability: result.language_probability,
    text: (result.transcript ?? "").trim(),
  };
}

async function transcribeWithAutoCorrection(
  client: SarvamAIClient,
  file: File,
  browserHints: string[]
): Promise<string> {
  const auto = await runTranscription(client, file, "unknown");
  if (!auto.text) {
    return "";
  }

  const hinted = pickHintedLanguage(browserHints);
  if (!hinted) {
    return auto.text;
  }

  const detected = auto.language_code;
  const probability = auto.language_probability ?? 1;
  const detectionMismatch =
    detected !== undefined && detected !== hinted && detected !== "unknown";
  const scriptMismatch = !scriptMatchesLanguage(auto.text, hinted);

  if (!detectionMismatch && !scriptMismatch) {
    return auto.text;
  }

  if (probability >= 0.92 && !scriptMismatch) {
    return auto.text;
  }

  const hintedResult = await runTranscription(client, file, hinted);
  if (!hintedResult.text) {
    return auto.text;
  }

  if (scriptMatchesLanguage(hintedResult.text, hinted)) {
    return hintedResult.text;
  }

  return auto.text;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    return new ChatbotError(
      "bad_request:api",
      "Voice input is not configured. Add SARVAM_API_KEY to .env.local."
    ).toResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Could not read the audio upload. Please try recording again."
    ).toResponse();
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return new ChatbotError(
      "bad_request:api",
      "No audio was recorded. Hold the microphone button and speak, then release."
    ).toResponse();
  }

  if (audio.size < MIN_AUDIO_BYTES) {
    return new ChatbotError(
      "bad_request:api",
      "Recording was too short. Speak for at least one second and try again."
    ).toResponse();
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return new ChatbotError(
      "bad_request:api",
      "Recording is too long. Use a shorter clip (under 25 MB)."
    ).toResponse();
  }

  const uploadType = normalizeAudioType(audio.type);
  if (!isAllowedAudioType(audio.type)) {
    return new ChatbotError(
      "bad_request:api",
      `Unsupported audio format (${audio.type || "unknown"}). Try Chrome or Edge.`
    ).toResponse();
  }

  const extension = extensionForType(uploadType);
  const uploadFile = new File([audio], `recording.${extension}`, {
    type: uploadType,
  });

  const requestedLanguage = parseSarvamLanguageCode(
    formData.get("language_code")
  );
  const browserHints = parseLanguageHints(formData.get("language_hints"));

  let text: string;
  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    if (requestedLanguage === "unknown") {
      text = await transcribeWithAutoCorrection(
        client,
        uploadFile,
        browserHints
      );
    } else {
      ({ text } = await runTranscription(
        client,
        uploadFile,
        requestedLanguage
      ));
    }
  } catch (error) {
    return new ChatbotError(
      "bad_request:api",
      sarvamErrorMessage(error)
    ).toResponse();
  }

  if (!text) {
    return new ChatbotError(
      "bad_request:api",
      "No speech detected. Speak clearly, closer to the mic, and try again."
    ).toResponse();
  }

  return Response.json({ text });
}
