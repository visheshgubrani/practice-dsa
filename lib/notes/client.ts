import {
  isNotesDraftResult,
  type NotesDraftRequest,
  type NotesDraftResult,
} from "@/lib/notes/types";

/**
 * The browser's side of one notes-draft request.
 *
 * Nothing is written here: the caller receives preview text and applies it
 * through the ordinary notes save path. An abort (leaving the problem, or
 * pressing Cancel) is reported rather than thrown, because cancelling is a
 * normal outcome and must leave the notes untouched.
 */

export type NotesDraftOutcome =
  | { ok: true; result: NotesDraftResult }
  | { ok: false; error: string; aborted: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function requestNotesDraft(
  request: NotesDraftRequest,
  signal?: AbortSignal,
): Promise<NotesDraftOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/notes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "Draft cancelled.", aborted: true };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach the app.",
      aborted: false,
    };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      error:
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : `The draft request failed (${response.status}).`,
      aborted: false,
    };
  }

  if (!isNotesDraftResult(payload)) {
    return {
      ok: false,
      error: "The draft endpoint returned an unexpected response.",
      aborted: false,
    };
  }

  return { ok: true, result: payload };
}
