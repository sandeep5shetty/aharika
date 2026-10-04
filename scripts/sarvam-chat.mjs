import dotenv from "dotenv";
import { SarvamAIClient } from "sarvamai";

dotenv.config({ path: ".env.local" });

if (!process.env.SARVAM_API_KEY) {
  throw new Error("Missing SARVAM_API_KEY in .env.local");
}

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

const result = await client.chat.completions({
  messages: [{ content: "Reply with a short greeting.", role: "user" }],
  model: "sarvam-105b-conversations",
});

console.log(result.choices[0].message.content);
