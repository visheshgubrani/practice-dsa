import type { StoredLanguageId } from "@/lib/languages";
import type {
  PracticeConflictBody,
  PracticeImportPayload,
  PracticeImportResult,
  PracticePatchBody,
  PracticeState,
} from "@/lib/practice/types";

export class PracticeConflict extends Error {
  readonly resource: "draft" | "progress";
  readonly revision: number;
  readonly updatedAt: string | null;

  constructor(body: PracticeConflictBody) {
    super(body.error);
    this.name = "PracticeConflict";
    this.resource = body.resource;
    this.revision = body.revision;
    this.updatedAt = body.updatedAt;
  }
}

export function isPracticeConflictBody(
  value: unknown,
): value is PracticeConflictBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<PracticeConflictBody>;
  return (
    (body.resource === "draft" || body.resource === "progress") &&
    typeof body.revision === "number"
  );
}

export function isPracticeState(value: unknown): value is PracticeState {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<PracticeState>;
  return typeof body.slug === "string" && typeof body.progress === "object";
}

export function isPracticeImportResult(
  value: unknown,
): value is PracticeImportResult {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<PracticeImportResult>;
  return (
    typeof body.draftsInserted === "number" &&
    typeof body.legacyInserted === "number"
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export async function fetchPractice(
  slug: string,
  language: StoredLanguageId,
  signal?: AbortSignal,
): Promise<PracticeState> {
  const params = new URLSearchParams({ language });
  const response = await fetch(`/api/practice/${encodeURIComponent(slug)}?${params}`, {
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Could not load practice state (${response.status}).`),
    );
  }
  if (!isPracticeState(payload)) {
    throw new Error("Practice state was not in the expected shape.");
  }
  return payload;
}

export async function patchPractice(
  slug: string,
  body: PracticePatchBody,
  options?: { keepalive?: boolean; signal?: AbortSignal },
): Promise<PracticeState> {
  const response = await fetch(`/api/practice/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: options?.keepalive,
    signal: options?.signal,
  });
  const payload = await readJson(response);
  if (response.status === 409 && isPracticeConflictBody(payload)) {
    throw new PracticeConflict(payload);
  }
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Could not save practice state (${response.status}).`),
    );
  }
  if (!isPracticeState(payload)) {
    throw new Error("Practice state was not in the expected shape.");
  }
  return payload;
}

export async function importPractice(
  body: PracticeImportPayload,
  signal?: AbortSignal,
): Promise<PracticeImportResult> {
  const response = await fetch("/api/practice/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(
        payload,
        `Could not import practice data (${response.status}).`,
      ),
    );
  }
  if (!isPracticeImportResult(payload)) {
    throw new Error("Import result was not in the expected shape.");
  }
  return payload;
}
