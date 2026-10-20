import {
  COACH_EMPTY_REASONS,
  COACH_ITEM_KINDS,
  COACH_MINUTE_OPTIONS,
  COACH_STATES,
  COACH_TONES,
  isCoachMinutes,
  type CoachNoteRequest,
  type CoachNoteResponse,
  type CoachPlan,
  type CoachPlanCounts,
  type CoachPlanItem,
  type CoachPlanResponse,
} from "./types";
import type { Difficulty } from "@/lib/problems";

/**
 * The browser's side of the coach endpoints. The guards are intentionally
 * stricter than a type assertion: an active plan must have items, a done or
 * empty plan must have none, and the counts must agree with the list. A bad
 * response is an error state, never "nothing to do".
 */

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDifficulty(value: unknown): value is Difficulty {
  return isString(value) && DIFFICULTIES.includes(value as Difficulty);
}

function isPlanItem(value: unknown): value is CoachPlanItem {
  if (!isRecord(value)) return false;
  return (
    COACH_ITEM_KINDS.includes(value.kind as (typeof COACH_ITEM_KINDS)[number]) &&
    isString(value.slug) &&
    value.slug.length > 0 &&
    isNonNegativeInt(value.number) &&
    isString(value.title) &&
    isDifficulty(value.difficulty) &&
    isString(value.topic) &&
    isNonNegativeInt(value.minutes) &&
    isString(value.reason) &&
    (value.dueAt === undefined || isString(value.dueAt))
  );
}

function isPlanCounts(value: unknown): value is CoachPlanCounts {
  if (!isRecord(value)) return false;
  const keys: Array<keyof CoachPlanCounts> = [
    "reviewsTarget",
    "reviewsDone",
    "reviewsRemaining",
    "reviewsDueNow",
    "newTarget",
    "newDone",
    "newRemaining",
    "upcomingCount",
    "pausedCount",
    "estimatedMinutes",
    "solved",
    "total",
    "unsolved",
  ];
  return keys.every((key) => isNonNegativeInt(value[key]));
}

export function isCoachPlan(value: unknown): value is CoachPlan {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (
    !isString(value.day) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
    !isCoachMinutes(value.minutes) ||
    !COACH_STATES.includes(value.state as (typeof COACH_STATES)[number]) ||
    !COACH_TONES.includes(value.tone as (typeof COACH_TONES)[number]) ||
    !(
      value.emptyReason === null ||
      COACH_EMPTY_REASONS.includes(
        value.emptyReason as (typeof COACH_EMPTY_REASONS)[number],
      )
    ) ||
    !isString(value.headline) ||
    !isString(value.summary) ||
    !(value.progressLine === null || isString(value.progressLine)) ||
    !isString(value.fallbackNote) ||
    typeof value.practicedToday !== "boolean" ||
    !Array.isArray(value.items) ||
    !value.items.every(isPlanItem) ||
    !isPlanCounts(value.counts) ||
    !Array.isArray(value.defer) ||
    !value.defer.every(isString) ||
    !(value.minimum === null || isString(value.minimum)) ||
    !(value.nextReviewAt === null || isString(value.nextReviewAt)) ||
    !isString(value.fingerprint) ||
    !/^[0-9a-f]{8}$/.test(value.fingerprint)
  ) {
    return false;
  }

  if (value.state === "active" && value.items.length === 0) return false;
  if (value.state !== "active" && value.items.length > 0) return false;
  if (value.items.length > 6) return false;
  if (value.state === "empty" && value.emptyReason === null) return false;
  if (value.state !== "empty" && value.emptyReason !== null) return false;
  if (value.state === "active" && value.minimum === null) return false;
  if (value.state !== "active" && value.minimum !== null) return false;
  if (value.defer.length > 3) return false;

  const reviews = value.items.filter((item) => item.kind === "review").length;
  const newItems = value.items.length - reviews;
  if (value.counts.reviewsRemaining !== reviews) return false;
  if (value.counts.newRemaining !== newItems) return false;
  if (
    value.counts.estimatedMinutes !==
    value.items.reduce((total, item) => total + item.minutes, 0)
  ) {
    return false;
  }
  if (value.state === "active" && value.counts.reviewsRemaining + value.counts.newRemaining === 0) {
    return false;
  }
  return true;
}

export function isCoachPlanResponse(value: unknown): value is CoachPlanResponse {
  return (
    isRecord(value) &&
    typeof value.live === "boolean" &&
    isCoachPlan(value.plan)
  );
}

export function isCoachNoteResponse(
  value: unknown,
): value is CoachNoteResponse {
  return (
    isRecord(value) &&
    value.status === "note" &&
    isString(value.fingerprint) &&
    /^[0-9a-f]{8}$/.test(value.fingerprint) &&
    isString(value.note) &&
    value.note.length > 0 &&
    value.note.length <= 400
  );
}

function errorMessage(payload: unknown, fallback: string): string {
  if (
    isRecord(payload) &&
    typeof payload.error === "string" &&
    payload.error.length > 0
  ) {
    return payload.error;
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchCoachPlan(
  input: {
    minutes: number;
    utcOffsetMinutes: number;
    signal?: AbortSignal;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<CoachPlanResponse> {
  const params = new URLSearchParams({
    minutes: String(input.minutes),
    utcOffsetMinutes: String(input.utcOffsetMinutes),
  });
  const response = await fetchImpl(`/api/coach/plan?${params}`, {
    cache: "no-store",
    signal: input.signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Today's plan could not be loaded (${response.status}).`),
    );
  }
  if (!isCoachPlanResponse(payload)) {
    throw new Error("Today's plan was not in the expected shape.");
  }
  return payload;
}

export async function requestCoachNote(
  request: CoachNoteRequest,
  input?: { signal?: AbortSignal },
  fetchImpl: typeof fetch = fetch,
): Promise<CoachNoteResponse> {
  const response = await fetchImpl("/api/coach/note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
    signal: input?.signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `The coach note could not be written (${response.status}).`),
    );
  }
  if (!isCoachNoteResponse(payload)) {
    throw new Error("The coach note was not in the expected shape.");
  }
  return payload;
}

/** The note request must never carry a title, slug, or free text. */
export function assertStructuredNoteRequest(request: CoachNoteRequest): void {
  if (!COACH_MINUTE_OPTIONS.includes(request.minutes)) {
    throw new Error("Coach note request has an invalid budget.");
  }
  for (const item of request.items) {
    if (!COACH_ITEM_KINDS.includes(item.kind)) {
      throw new Error("Coach note request has an invalid item kind.");
    }
    if (!DIFFICULTIES.includes(item.difficulty)) {
      throw new Error("Coach note request has an invalid difficulty.");
    }
  }
}
