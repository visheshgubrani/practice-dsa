import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import { z } from "zod";

import type { ReviewRating } from "./types";

/** Increment the config suffix whenever any scheduler parameter changes. */
export const SCHEDULER_CONFIG_ID = "dsa-fsrs-v1";
export const SCHEDULER_VERSION = "ts-fsrs@5.4.2/" + SCHEDULER_CONFIG_ID;

/**
 * Day-scale FSRS for one card per problem.
 *
 * Retention is 0.9. Short-term steps are off so a rating lands on a day, not
 * a minute. Fuzz is off so a fixed clock produces the same due date in tests.
 * Weights and the maximum interval stay the library defaults.
 */
const schedulerParameters = generatorParameters({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: false,
});
const scheduler = fsrs(schedulerParameters);

const GRADE: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const storedCardSchema = z
  .object({
    due: z.string().min(1),
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsed_days: z.number().nonnegative(),
    scheduled_days: z.number().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    state: z.number().int().min(0).max(3),
    last_review: z.string().nullable(),
  })
  .strict();

export type StoredCard = z.infer<typeof storedCardSchema>;

const storedLogSchema = z
  .object({
    rating: z.number().int(),
    state: z.number().int().min(0).max(3),
    due: z.string().min(1),
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsed_days: z.number().nonnegative(),
    last_elapsed_days: z.number(),
    scheduled_days: z.number().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    review: z.string().min(1),
  })
  .strict();

export type StoredReviewLog = z.infer<typeof storedLogSchema>;

function parseInstant(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error("Review card has an invalid " + label + ".");
  }
  return date;
}

export function emptyCard(now: Date): Card {
  return createEmptyCard(now);
}

export function serializeCard(card: Card): StoredCard {
  return storedCardSchema.parse({
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  });
}

export function restoreCard(value: unknown): Card {
  const parsed = storedCardSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Review card state is invalid.");
  }
  const stored = parsed.data;
  const due = parseInstant(stored.due, "due date");
  const last = stored.last_review
    ? parseInstant(stored.last_review, "last review")
    : undefined;
  return {
    due,
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: last,
  };
}

export function serializeLog(log: ReviewLog): StoredReviewLog {
  return storedLogSchema.parse({
    rating: log.rating,
    state: log.state,
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsed_days: log.elapsed_days,
    last_elapsed_days: log.last_elapsed_days,
    scheduled_days: log.scheduled_days,
    learning_steps: log.learning_steps,
    review: log.review.toISOString(),
  });
}

export function scheduleRating(
  card: Card,
  rating: ReviewRating,
  now: Date,
): { card: Card; log: ReviewLog } {
  return scheduler.next(card, now, GRADE[rating]);
}
