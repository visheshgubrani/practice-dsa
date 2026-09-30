import type { Difficulty } from "@/lib/problems";

/**
 * JSON shapes for `/api/reviews`. The FSRS card itself stays on the server.
 */

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const RATING_MEANING: Record<ReviewRating, string> = {
  again: "I went blank or needed the core approach explained",
  hard: "I recalled it, but with substantial effort",
  good: "I recalled the approach and could work through it",
  easy: "I recalled and applied it confidently",
};

export type ReviewCardState = {
  enrolled: boolean;
  active: boolean;
  dueAt: string | null;
  lastRating: ReviewRating | null;
  revision: number;
};

export type ReviewSummary = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
  dueAt: string;
  revision: number;
};

export type ReviewQueue = {
  dueCount: number;
  due: ReviewSummary[];
  upcoming: ReviewSummary[];
  /** Soonest active card that is not due yet, when there is one. */
  nextDueAt: string | null;
};

export type ReviewLink = {
  slug: string;
  number: number;
  title: string;
};

export type ReviewRateResult = {
  dueAt: string;
  revision: number;
  rating: ReviewRating;
  requestId: string;
  reviewedAt: string;
  next: ReviewLink | null;
};

export const EMPTY_REVIEW_CARD: ReviewCardState = {
  enrolled: false,
  active: false,
  dueAt: null,
  lastRating: null,
  revision: 0,
};
