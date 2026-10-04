import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import type { NutritionTools } from "@/lib/ai/tools/nutrition";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatTools = InferUITools<NutritionTools>;
export type WaitingStatusData = {
  phase: "waiting" | "still-waiting" | "health" | "thinking";
  message: string;
  modelId: string;
  modelName: string;
};

export type CustomUIDataTypes = {
  "chat-title": string;
  "waiting-status": WaitingStatusData;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type MealItemBreakdown = {
  name: string;
  foodId?: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: ConfidenceLevel;
  matchSource: "indb" | "ifct" | "alias" | "fuzzy" | "estimated";
};
