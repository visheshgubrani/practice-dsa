import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import { tutorIsLive, tutorLanguageModel, tutorProviderOptions } from "@/lib/ai/model";
import { normalizePersonalNotes, type PersonalNotes } from "@/lib/practice/notes";

/**
 * Structured notes draft. This module does not write practice state. A missing
 * key, a timeout, a cancellation, a provider failure, or a response that does
 * not match the schema all leave the user's notes untouched.
 */

/**
 * A memory aid is a small structured answer, but it still reasons. The ceiling
 * stops a hung provider call from holding the request open forever; a timeout
 * is a failed preview, never a partial write.
 */
export const NOTES_DRAFT_TIMEOUT_MS = 120_000;

export const notesDraftSchema = z
  .object({
    approach: z
      .string()
      .max(20_000)
      .describe("The key idea, in one or two sentences. Blank if not supported."),
    steps: z
      .string()
      .max(20_000)
      .describe("The moves in order, as a short list. Blank if not supported."),
    pitfalls: z
      .string()
      .max(20_000)
      .describe(
        "A personal mistake the session supports. Blank unless the session shows one.",
      ),
    timeComplexity: z
      .string()
      .max(200)
      .describe(
        "Time cost of the approach actually discussed, such as O(n). Blank when unsure.",
      ),
    spaceComplexity: z
      .string()
      .max(200)
      .describe(
        "Extra space used by the approach actually discussed. Blank when unsure.",
      ),
  })
  .strict();

export type NotesGenerateResult =
  | { ok: true; notes: PersonalNotes }
  | { ok: false; status: number; error: string };

/**
 * The generation seam. The default implementation calls the configured model;
 * tests inject a stub so prompt and failure handling are checked deterministically.
 */
export type NotesDraftGenerator = (input: {
  prompt: string;
  signal?: AbortSignal;
}) => Promise<{ output: unknown }>;

async function generateWithModel(input: {
  prompt: string;
  signal?: AbortSignal;
}): Promise<{ output: unknown }> {
  const result = await generateText({
    model: tutorLanguageModel(),
    providerOptions: tutorProviderOptions,
    output: Output.object({ schema: notesDraftSchema }),
    prompt: input.prompt,
    abortSignal: input.signal,
    timeout: NOTES_DRAFT_TIMEOUT_MS,
  });
  return { output: result.output };
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/** Provider errors are reported with their own text so the cause is visible. */
function failureText(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return "The draft could not be generated.";
}

export async function generateNotesDraft(input: {
  prompt: string;
  signal?: AbortSignal;
  live?: boolean;
  generate?: NotesDraftGenerator;
}): Promise<NotesGenerateResult> {
  const live = input.live ?? tutorIsLive();
  if (!live) {
    return {
      ok: false,
      status: 503,
      error: "Set OPENAI_API_KEY to draft notes from a session. Your notes are unchanged.",
    };
  }

  const generate = input.generate ?? generateWithModel;
  try {
    const result = await generate({ prompt: input.prompt, signal: input.signal });
    // `Output.object` validates too; this keeps a stubbed or future generator
    // from handing the route something that is not a notes draft.
    const parsed = notesDraftSchema.safeParse(result.output);
    if (!parsed.success) {
      return {
        ok: false,
        status: 502,
        error: "The draft came back incomplete. Your notes are unchanged.",
      };
    }
    return { ok: true, notes: normalizePersonalNotes(parsed.data) };
  } catch (error) {
    // A cancelled request is the user's own doing: leaving the problem or
    // pressing Cancel. It is reported quietly, and nothing was written.
    if (input.signal?.aborted) {
      return { ok: false, status: 499, error: "Draft cancelled." };
    }
    if (isTimeout(error)) {
      return {
        ok: false,
        status: 504,
        error: "The draft took too long. Your notes are unchanged.",
      };
    }
    // A model that answered in prose, or in a shape the schema refuses, is the
    // same failure to the user: no draft, notes untouched.
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        ok: false,
        status: 502,
        error: "The draft came back incomplete. Your notes are unchanged.",
      };
    }
    return {
      ok: false,
      status: 502,
      error: `${failureText(error)} Your notes are unchanged.`,
    };
  }
}
