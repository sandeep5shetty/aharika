export const DEFAULT_CHAT_MODEL = "openai/gpt-4.1-mini";

export const titleModel = {
  description: "Fast model for title generation",
  id: "openai/gpt-4.1-mini",
  name: "GPT-4.1 mini",
  provider: "openai",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: ModelCapabilities;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    capabilities: { reasoning: false, tools: true, vision: true },
    description: "Fast default model for chat, tools, and images",
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 mini",
    provider: "openai",
  },
  {
    capabilities: { reasoning: false, tools: true, vision: true },
    description: "Stronger general-purpose model",
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
  },
  {
    capabilities: { reasoning: false, tools: true, vision: true },
    description: "Multimodal model with tool use",
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: true },
    description: "Small reasoning model",
    id: "openai/o4-mini",
    name: "o4-mini",
    provider: "openai",
    reasoningEffort: "low",
  },
];

export function getCapabilities(): Record<string, ModelCapabilities> {
  return Object.fromEntries(
    chatModels.map((model) => [model.id, model.capabilities])
  );
}

export const isDemo = process.env.IS_DEMO === "1";

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((model) => model.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

export function getModelAvailability(modelId: string): ModelAvailability {
  return chatModels.some((model) => model.id === modelId)
    ? "healthy"
    : "unknown";
}
