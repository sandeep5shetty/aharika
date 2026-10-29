import { SarvamAI, SarvamAIClient } from "sarvamai";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { SARVAM_STT_LANGUAGE_CODES } from "@/lib/ai/transcription";
import { BULBUL_MODEL, resolveSpeechVoice, splitSpeechText } from "@/lib/ai/speech";
import { ChatbotError } from "@/lib/errors";

export const maxDuration = 60;

const speechSchema = z.object({
  text: z.string().trim().min(1).max(20_000),
  speaker: z.string().trim().min(1).max(80).optional(),
  language: z.enum(SARVAM_STT_LANGUAGE_CODES).optional(),
});

function sarvamErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Could not read that aloud. Please try again.";
  }
  const { message } = error;
  if (message.includes("invalid_api_key") || message.includes("403")) {
    return "Invalid Sarvam API key. Check SARVAM_API_KEY in .env.local.";
  }
  if (message.length > 0 && message.length < 200) {
    return message;
  }
  return "Could not read that aloud. Please try again.";
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
      "Voice readout is not configured. Add SARVAM_API_KEY to .env.local.",
    ).toResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new ChatbotError("bad_request:api", "Could not read the readout request.").toResponse();
  }

  const parsed = speechSchema.safeParse(body);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api", "There is nothing to read aloud.").toResponse();
  }

  const parts = splitSpeechText(parsed.data.text);
  if (parts.length === 0) {
    return new ChatbotError("bad_request:api", "There is nothing to read aloud.").toResponse();
  }

  const voice = resolveSpeechVoice(parsed.data.language ?? "unknown", parsed.data.speaker);
  const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
  const audios: string[] = [];

  try {
    for (const text of parts) {
      const result = await client.textToSpeech.convert({
        text,
        model: BULBUL_MODEL,
        language_code: voice.languageCode as SarvamAI.TextToSpeechLanguage,
        speaker: voice.speaker as SarvamAI.TextToSpeechSpeaker,
        output_audio_codec: "mp3",
      });
      const audio = result.audios.find((entry) => entry.length > 0);
      if (!audio) {
        return new ChatbotError(
          "bad_request:api",
          "Sarvam did not return any audio. Please try again.",
        ).toResponse();
      }
      audios.push(audio);
    }
  } catch (error) {
    return new ChatbotError("bad_request:api", sarvamErrorMessage(error)).toResponse();
  }

  return Response.json({ parts: audios });
}
