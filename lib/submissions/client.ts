import type {
  SubmissionDetail,
  SubmissionList,
  SubmissionSummary,
} from "@/lib/submissions/types";

export type {
  SubmissionDetail,
  SubmissionList,
  SubmissionSummary,
} from "@/lib/submissions/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSubmissionSummary(value: unknown): value is SubmissionSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.verdict === "string" &&
    typeof value.createdAt === "string"
  );
}

export function isSubmissionList(value: unknown): value is SubmissionList {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.items) &&
    value.items.every(isSubmissionSummary) &&
    typeof value.total === "number"
  );
}

export function isSubmissionDetail(value: unknown): value is SubmissionDetail {
  return isSubmissionSummary(value) && Array.isArray((value as SubmissionDetail).cases);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

export async function fetchSubmissions(
  slug: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal },
): Promise<SubmissionList> {
  const params = new URLSearchParams({ slug });
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  const response = await fetch(`/api/submissions?${params}`, {
    signal: options?.signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Could not load history (${response.status}).`),
    );
  }
  if (!isSubmissionList(payload)) {
    throw new Error("History was not in the expected shape.");
  }
  return payload;
}

export async function fetchSubmission(
  id: string,
  signal?: AbortSignal,
): Promise<SubmissionDetail> {
  const response = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Could not load submission (${response.status}).`),
    );
  }
  if (!isSubmissionDetail(payload)) {
    throw new Error("Submission was not in the expected shape.");
  }
  return payload;
}
