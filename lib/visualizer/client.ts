import { isVisualizeResponse, type VisualizeResponse } from "@/lib/visualizer/types";
import type { LanguageId } from "@/lib/languages";

/**
 * The browser's side of one trace request.
 *
 * Nothing is cached here on purpose: a trace is a megabyte, and the case, the
 * buffer, or the engine version can change under it. Re-visualizing is a
 * deliberate click, and the server does the work in a couple of hundred
 * milliseconds.
 */

export type TraceRequest = {
  slug: string;
  language: LanguageId;
  /** The editor buffer, exactly as it stands. */
  source: string;
  /** The visible case selected in the console. */
  testcaseIndex: number;
};

export type TraceOutcome =
  | { ok: true; result: VisualizeResponse }
  | { ok: false; error: string; aborted: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function requestTrace(
  request: TraceRequest,
  signal?: AbortSignal,
): Promise<TraceOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "Cancelled.", aborted: true };
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
          : `The trace request failed (${response.status}).`,
      aborted: false,
    };
  }

  if (!isVisualizeResponse(payload)) {
    return {
      ok: false,
      error: "The trace endpoint returned an unexpected response.",
      aborted: false,
    };
  }

  return { ok: true, result: payload };
}
