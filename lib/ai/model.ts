import {
  openai,
  type OpenAILanguageModelResponsesOptions,
} from "@ai-sdk/openai";

/** Stored on new chat threads. Older rows keep the model they were created with. */
export const LIVE_MODEL = "gpt-6-luna";

/**
 * Medium effort is the balanced step on OpenAI's scale. The summary is omitted
 * so the model still reasons, but the scratchpad is not streamed or stored.
 */
const tutorReasoning = {
  reasoningEffort: "medium",
  reasoningSummary: null,
} satisfies OpenAILanguageModelResponsesOptions;

export function tutorLanguageModel() {
  return openai(LIVE_MODEL);
}

export const tutorProviderOptions = {
  openai: tutorReasoning,
};

/** Live tutoring when the OpenAI key is set; otherwise the scripted demo tutor. */
export function tutorIsLive(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
