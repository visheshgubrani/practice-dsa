import {
  generateText,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { z } from "zod";

import {
  buildCoachNotePrompt,
} from "@/lib/ai/coach-prompt";
import {
  coachProviderOptions,
  tutorIsLive,
  tutorLanguageModel,
} from "@/lib/ai/model";
import type { CoachNoteRequest } from "@/lib/coach/types";

/**
 * The one LLM call in the coach feature.
 *
 * Its output is only prose. The request is already structured facts, the note
 * is validated against the plan's constraints, and a failure always leaves the
 * deterministic fallback in place. Nothing here writes to the database.
 */

export const COACH_NOTE_TIMEOUT_MS = 30_000;

export const coachNoteOutputSchema = z
  .object({
    note: z
      .string()
      .min(1)
      .max(400)
      .describe(
        "Two or three short sentences of plain text. No digits, titles, markdown, emoji, or questions.",
      ),
  })
  .strict();

export type CoachNoteResult =
  | { ok: true; note: string }
  | { ok: false; status: number; error: string };

export type CoachNoteGenerator = (input: {
  prompt: string;
  signal?: AbortSignal;
}) => Promise<{ output: unknown }>;

async function generateWithModel(input: {
  prompt: string;
  signal?: AbortSignal;
}): Promise<{ output: unknown }> {
  const result = await generateText({
    model: tutorLanguageModel(),
    providerOptions: coachProviderOptions,
    output: Output.object({ schema: coachNoteOutputSchema }),
    prompt: input.prompt,
    abortSignal: input.signal,
    timeout: COACH_NOTE_TIMEOUT_MS,
  });
  return { output: result.output };
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function failureText(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return "The coach note could not be written.";
}

/**
 * Collapse whitespace, then enforce the contract the prompt promised: no
 * numerals (the app shows the facts), no markdown, no questions. Rejecting is
 * preferable to displaying a note that contradicts the plan.
 */
export function normalizeCoachNote(value: unknown): string | null {
  const parsed = coachNoteOutputSchema.safeParse(value);
  if (!parsed.success) return null;
  const note = parsed.data.note.trim().replace(/\s+/g, " ");
  if (note.length === 0 || note.length > 400) return null;
  if (/\d/.test(note)) return null;
  if (/[?#*`_[\]<>]/.test(note)) return null;
  return note;
}

export async function generateCoachNote(input: {
  request: CoachNoteRequest;
  signal?: AbortSignal;
  live?: boolean;
  generate?: CoachNoteGenerator;
}): Promise<CoachNoteResult> {
  const live = input.live ?? tutorIsLive();
  if (!live) {
    return {
      ok: false,
      status: 503,
      error: "Set OPENAI_API_KEY to write a coach note. The plan note is still available.",
    };
  }

  const generate = input.generate ?? generateWithModel;
  const prompt = buildCoachNotePrompt(input.request);
  try {
    const result = await generate({ prompt, signal: input.signal });
    const note = normalizeCoachNote(result.output);
    if (note === null) {
      return {
        ok: false,
        status: 502,
        error: "The coach note came back outside its contract. The plan note is still available.",
      };
    }
    return { ok: true, note };
  } catch (error) {
    if (input.signal?.aborted) {
      return { ok: false, status: 499, error: "Coach note cancelled." };
    }
    if (isTimeout(error)) {
      return {
        ok: false,
        status: 504,
        error: "The coach note took too long. The plan note is still available.",
      };
    }
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        ok: false,
        status: 502,
        error: "The coach note came back incomplete. The plan note is still available.",
      };
    }
    return {
      ok: false,
      status: 502,
      error: `${failureText(error)} The plan note is still available.`,
    };
  }
}
