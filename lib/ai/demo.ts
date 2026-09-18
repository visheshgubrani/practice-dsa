import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

/**
 * Demo transport used when DEEPSEEK_API_KEY is not configured.
 *
 * It streams a scripted tutor answer through the same UI message protocol as
 * the real route, so the chat pane, streaming state, and Stop button all
 * behave identically with or without a key.
 */

const CHUNK_DELAY_MS = 22;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Split into word-sized chunks so the stream visibly types out. */
function toChunks(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

export function demoChatResponse(answer: string, { signal }: { signal?: AbortSignal } = {}) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = "demo-text";
      writer.write({ type: "text-start", id: textId });

      for (const chunk of toChunks(answer)) {
        if (signal?.aborted) break;
        await sleep(CHUNK_DELAY_MS);
        writer.write({ type: "text-delta", id: textId, delta: chunk });
      }

      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
