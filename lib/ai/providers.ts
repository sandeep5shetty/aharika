import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const OPENAI_MODEL_PREFIX = "openai/";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

function toOpenAiModelId(modelId: string) {
  if (modelId.startsWith(OPENAI_MODEL_PREFIX)) {
    return modelId.slice(OPENAI_MODEL_PREFIX.length);
  }
  return modelId;
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return openai(toOpenAiModelId(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  return openai(toOpenAiModelId(titleModel.id));
}
