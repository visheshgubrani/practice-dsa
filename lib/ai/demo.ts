import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriterWithOutcome,
} from "ai";

/**
 * Demo transport used when DEEPSEEK_API_KEY is not configured.
 *
 * It streams a scripted tutor answer through the same UI message protocol as
 * the real route, so the chat pane, streaming state, and Stop button all
 * behave identically with or without a key.
 */

const DEFAULT_CHUNK_DELAY_MS = 22;

function chunkDelayMs(): number {
  const raw = process.env.DSA_CHAT_DEMO_CHUNK_MS;
  if (raw === undefined || raw === "") return DEFAULT_CHUNK_DELAY_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CHUNK_DELAY_MS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Split into word-sized chunks so the stream visibly types out. */
function toChunks(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

export async function writeDemoAnswer(
  writer: UIMessageStreamWriterWithOutcome,
  answer: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<void> {
  const textId = "demo-text";
  writer.write({ type: "start" });
  writer.write({ type: "text-start", id: textId });

  for (const chunk of toChunks(answer)) {
    if (signal?.aborted) {
      writer.setOutcome({ status: "aborted" });
      break;
    }
    await sleep(chunkDelayMs());
    writer.write({ type: "text-delta", id: textId, delta: chunk });
  }

  writer.write({ type: "text-end", id: textId });
}

export function demoChatResponse(
  answer: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await writeDemoAnswer(writer, answer, { signal });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
