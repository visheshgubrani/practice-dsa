import {
  EMPTY_REVIEW_CARD,
  REVIEW_RATINGS,
  type ReviewCardState,
  type ReviewQueue,
  type ReviewRateResult,
  type ReviewRating,
  type ReviewSummary,
} from "@/lib/reviews/types";

export const REVIEW_QUEUE_CHANGED_EVENT = "dsa:review-queue-changed";

export function notifyReviewQueueChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REVIEW_QUEUE_CHANGED_EVENT));
  }
}

export function isReviewCardState(value: unknown): value is ReviewCardState {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<ReviewCardState>;
  return (
    typeof body.enrolled === "boolean" &&
    typeof body.active === "boolean" &&
    (body.dueAt === null || typeof body.dueAt === "string") &&
    (body.lastRating === null ||
      (typeof body.lastRating === "string" &&
        REVIEW_RATINGS.includes(body.lastRating as ReviewRating))) &&
    typeof body.revision === "number"
  );
}

export function isReviewRateResult(value: unknown): value is ReviewRateResult {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<ReviewRateResult>;
  const validInstant = (instant: unknown) => {
    if (typeof instant !== "string") return false;
    const date = new Date(instant);
    return !Number.isNaN(date.getTime()) && date.toISOString() === instant;
  };
  return (
    validInstant(body.dueAt) &&
    typeof body.revision === "number" &&
    Number.isInteger(body.revision) &&
    body.revision >= 2 &&
    typeof body.requestId === "string" &&
    validInstant(body.reviewedAt) &&
    typeof body.rating === "string" &&
    REVIEW_RATINGS.includes(body.rating as ReviewRating) &&
    (body.next === null ||
      (typeof body.next === "object" &&
        typeof body.next.slug === "string" &&
        typeof body.next.number === "number" &&
        Number.isInteger(body.next.number) &&
        body.next.number > 0 &&
        typeof body.next.title === "string"))
  );
}

function isReviewSummary(value: unknown): value is ReviewSummary {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<ReviewSummary>;
  return (
    typeof body.slug === "string" &&
    typeof body.number === "number" &&
    typeof body.title === "string" &&
    (body.difficulty === "easy" ||
      body.difficulty === "medium" ||
      body.difficulty === "hard") &&
    typeof body.topic === "string" &&
    typeof body.dueAt === "string" &&
    typeof body.revision === "number"
  );
}

export function isReviewQueue(value: unknown): value is ReviewQueue {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<ReviewQueue>;
  return (
    typeof body.dueCount === "number" &&
    Array.isArray(body.due) &&
    body.due.every(isReviewSummary) &&
    Array.isArray(body.upcoming) &&
    body.upcoming.every(isReviewSummary) &&
    (body.nextDueAt === null || typeof body.nextDueAt === "string") &&
    body.dueCount === body.due.length
  );
}

export { EMPTY_REVIEW_CARD };
