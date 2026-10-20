import type { Difficulty } from "@/lib/problems";

import type { CoachMinutes, CoachTone } from "./types";

/**
 * The daily coach's tuning surface. These are starting heuristics, kept in one
 * place so the product rules are reviewable and the planner tests can pin them.
 *
 * The budget is a ceiling, not a target: the planner deliberately leaves slack.
 * A 30-minute plan is often one review plus one new problem; a 60-minute plan
 * is at most four reviews plus one new problem (or two on a push day).
 */

/** A review is a short recall pass, not a full solve. */
export const REVIEW_MINUTES = 4;

/** Typical time to finish a new problem, by difficulty. Hard is never auto-picked. */
export const NEW_MINUTES: Record<Difficulty, number> = {
  easy: 15,
  medium: 25,
  hard: 40,
};

/** Time reserved for one planned new problem when allocating reviews. */
export const NEW_RESERVE_MINUTES = 25;

export const REVIEW_CAP: Record<CoachMinutes, number> = {
  15: 2,
  30: 3,
  60: 4,
};

export const NEW_CAP: Record<CoachMinutes, number> = {
  15: 1,
  30: 1,
  60: 2,
};

export const HEAVY_DUE = 6;
export const MAX_ITEMS = 6;
export const HISTORY_WINDOW_DAYS = 366;

/** A comeback day stays gentle regardless of the clock. */
export function reviewCapFor(tone: CoachTone, minutes: CoachMinutes): number {
  return tone === "comeback" ? 2 : REVIEW_CAP[minutes];
}

/** Two new problems only on a high-momentum long session. */
export function newCapBaseFor(input: {
  tone: CoachTone;
  minutes: CoachMinutes;
  dueAtStart: number;
}): number {
  if (input.dueAtStart >= HEAVY_DUE) return 0;
  // In 15 minutes there is room for either a couple of reviews or one easy
  // problem, not both. Reviews win because they are already scheduled.
  if (input.minutes === 15 && input.dueAtStart > 0) return 0;
  return input.tone === "push" && input.minutes >= 60 ? 2 : 1;
}

export function allowedDifficulties(
  tone: CoachTone,
  minutes: CoachMinutes,
): readonly Difficulty[] {
  return tone === "comeback" || minutes === 15
    ? (["easy"] as const)
    : (["easy", "medium"] as const);
}

export function estimatedItemMinutes(
  kind: "review" | "continue" | "new",
  difficulty: Difficulty,
): number {
  return kind === "review" ? REVIEW_MINUTES : NEW_MINUTES[difficulty];
}
