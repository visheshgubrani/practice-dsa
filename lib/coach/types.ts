import type { Difficulty } from "@/lib/problems";

/**
 * Client-safe shapes for today's plan.
 *
 * The plan is a snapshot built from Postgres on the server. It contains only
 * public catalog metadata (title, number, difficulty, topic) and the day's
 * derived schedule — never statements, testcases, source, or reference
 * solutions. The LLM note request is deliberately narrower: kinds, difficulties,
 * and counts, with no titles or free text.
 */

export const COACH_PLAN_VERSION = 1 as const;

export const COACH_MINUTE_OPTIONS = [15, 30, 60] as const;

export type CoachMinutes = (typeof COACH_MINUTE_OPTIONS)[number];

export const DEFAULT_COACH_MINUTES: CoachMinutes = 30;

export const COACH_TONES = ["start", "comeback", "steady", "push"] as const;

export type CoachTone = (typeof COACH_TONES)[number];

export const COACH_STATES = ["active", "done", "empty"] as const;

export type CoachPlanState = (typeof COACH_STATES)[number];

export const COACH_EMPTY_REASONS = ["caught-up", "no-fit"] as const;

export type CoachEmptyReason = (typeof COACH_EMPTY_REASONS)[number];

export const COACH_ITEM_KINDS = ["review", "continue", "new"] as const;

export type CoachItemKind = (typeof COACH_ITEM_KINDS)[number];

export function isCoachMinutes(value: unknown): value is CoachMinutes {
  return (
    typeof value === "number" &&
    (COACH_MINUTE_OPTIONS as readonly number[]).includes(value)
  );
}

export function isCoachItemKind(value: unknown): value is CoachItemKind {
  return (
    typeof value === "string" &&
    (COACH_ITEM_KINDS as readonly string[]).includes(value)
  );
}

export type CoachPlanItem = {
  kind: CoachItemKind;
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
  minutes: number;
  reason: string;
  /** Review only: the card's due instant, for a local label. */
  dueAt?: string;
};

export type CoachPlanCounts = {
  reviewsTarget: number;
  reviewsDone: number;
  reviewsRemaining: number;
  reviewsDueNow: number;
  newTarget: number;
  newDone: number;
  newRemaining: number;
  upcomingCount: number;
  pausedCount: number;
  estimatedMinutes: number;
  solved: number;
  total: number;
  unsolved: number;
};

export type CoachPlan = {
  version: typeof COACH_PLAN_VERSION;
  /** Browser-local YYYY-MM-DD. */
  day: string;
  minutes: CoachMinutes;
  state: CoachPlanState;
  emptyReason: CoachEmptyReason | null;
  tone: CoachTone;
  headline: string;
  summary: string;
  /** Present only when something has already been done today. */
  progressLine: string | null;
  /** Deterministic note shown immediately and whenever the LLM is unavailable. */
  fallbackNote: string;
  practicedToday: boolean;
  items: CoachPlanItem[];
  counts: CoachPlanCounts;
  /** 0..3 constraints: what is deliberately not in today's plan. */
  defer: string[];
  minimum: string | null;
  nextReviewAt: string | null;
  fingerprint: string;
};

export type CoachPlanResponse = {
  plan: CoachPlan;
  /** True when an OpenAI key is configured; the client may request a note. */
  live: boolean;
};

/**
 * The note request carries facts, not copy. No title, slug, statement, source,
 * chat, or note text can reach the model through this contract.
 */
export type CoachNoteRequest = {
  fingerprint: string;
  state: CoachPlanState;
  tone: CoachTone;
  minutes: CoachMinutes;
  items: Array<{
    kind: CoachItemKind;
    difficulty: Difficulty;
    minutes: number;
  }>;
  reviewsDone: number;
  reviewsRemaining: number;
  newDone: number;
  newRemaining: number;
  practicedToday: boolean;
  minimumKind: CoachItemKind | null;
};

export type CoachNoteResponse = {
  status: "note";
  fingerprint: string;
  note: string;
};
