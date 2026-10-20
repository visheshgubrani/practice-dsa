import type { ProblemSummary } from "@/lib/problems";
import { addDays, dayKey, daysBetween } from "@/lib/practice/days";
import { summarizeStreak, type ActivityDay } from "@/lib/progress/calendar";
import {
  summarizeProgress,
  UNCATEGORIZED,
  type ProgressLookup,
} from "@/lib/progress/summary";
import type { ReviewSummary } from "@/lib/reviews/types";

import { buildPlanCopy, type NewBlockedBy, type PlanCopyInput } from "./copy";
import { coachPlanFingerprint } from "./fingerprint";
import {
  allowedDifficulties,
  estimatedItemMinutes,
  HEAVY_DUE,
  NEW_MINUTES,
  NEW_RESERVE_MINUTES,
  newCapBaseFor,
  REVIEW_MINUTES,
  reviewCapFor,
} from "./rules";
import {
  COACH_PLAN_VERSION,
  type CoachMinutes,
  type CoachNoteRequest,
  type CoachPlan,
  type CoachPlanCounts,
  type CoachPlanItem,
  type CoachPlanState,
  type CoachTone,
} from "./types";

/**
 * The deterministic day planner. Pure: it reads the supplied snapshot and
 * returns the plan, with no database, model, network, or clock access. The
 * route supplies `day`, `solvedToday`, and `reviewsRatedToday`; everything else
 * is derived here.
 */

export type CoachPlanInput = {
  /** Browser-local day key, YYYY-MM-DD. */
  day: string;
  /** The browser's UTC offset, used only to read review due days. */
  offsetMinutes: number;
  minutes: CoachMinutes;
  problems: readonly ProblemSummary[];
  statuses: ProgressLookup;
  due: readonly ReviewSummary[];
  /** Already scheduled reviews, excluded from new candidates. */
  upcomingSlugs: readonly string[];
  pausedCount: number;
  nextReviewAt: string | null;
  activity: readonly ActivityDay[];
  /** Distinct first solves whose solved_at is inside the local day. */
  solvedToday: number;
  /** Distinct review cards rated inside the local day. */
  reviewsRatedToday: number;
};

type Candidate = {
  problem: ProblemSummary;
  attempted: boolean;
};

function statusOf(statuses: ProgressLookup, slug: string) {
  return statuses.get(slug) ?? "todo";
}

function topicOf(topic: string): string {
  return topic.trim() || UNCATEGORIZED;
}

function deriveTone(input: {
  day: string;
  activity: readonly ActivityDay[];
  hasHistory: boolean;
  practicedToday: boolean;
}): CoachTone {
  if (!input.hasHistory) return "start";

  const { current } = summarizeStreak(
    input.activity.map((entry) => entry.day),
    input.day,
  );
  // A lapse wins over momentum: a zero streak is a comeback day even if the
  // previous week was busy.
  if (!input.practicedToday && current === 0) return "comeback";

  const weekStart = addDays(input.day, -7);
  const prior = input.activity.filter(
    (entry) => entry.day >= weekStart && entry.day < input.day,
  );
  const activeDays = prior.filter((entry) => entry.submits > 0).length;
  const submits = prior.reduce((total, entry) => total + entry.submits, 0);
  const accepts = prior.reduce((total, entry) => total + entry.accepted, 0);

  if (
    activeDays >= 4 &&
    accepts >= 2 &&
    submits > 0 &&
    accepts / submits >= 0.5
  ) {
    return "push";
  }
  return "steady";
}

function reviewItem(
  review: ReviewSummary,
  input: CoachPlanInput,
): CoachPlanItem {
  const dueDay = dayKey(review.dueAt, input.offsetMinutes);
  const overdue = Math.max(0, daysBetween(dueDay, input.day));
  const reason =
    overdue === 0
      ? "Due today"
      : overdue === 1
        ? "Overdue by a day"
        : `Overdue by ${overdue} days`;

  return {
    kind: "review",
    slug: review.slug,
    number: review.number,
    title: review.title,
    difficulty: review.difficulty,
    topic: topicOf(review.topic),
    minutes: REVIEW_MINUTES,
    reason,
    dueAt: review.dueAt,
  };
}

function newItem(candidate: Candidate): CoachPlanItem {
  const topic = topicOf(candidate.problem.topic);
  return {
    kind: candidate.attempted ? "continue" : "new",
    slug: candidate.problem.slug,
    number: candidate.problem.number,
    title: candidate.problem.title,
    difficulty: candidate.problem.difficulty,
    topic,
    minutes: NEW_MINUTES[candidate.problem.difficulty],
    reason: candidate.attempted
      ? "You already started this one."
      : candidate.problem.topic.trim().length > 0
        ? `Next unsolved in ${topic}.`
        : "Next unsolved problem.",
  };
}

function findCandidates(input: {
  problems: readonly ProblemSummary[];
  statuses: ProgressLookup;
  due: readonly ReviewSummary[];
  upcomingSlugs: readonly string[];
  tone: CoachTone;
  minutes: CoachMinutes;
}): Candidate[] {
  const reserved = new Set([
    ...input.due.map((review) => review.slug),
    ...input.upcomingSlugs,
  ]);
  const allowed = new Set(allowedDifficulties(input.tone, input.minutes));

  const pool: Candidate[] = [];
  for (const problem of input.problems) {
    if (statusOf(input.statuses, problem.slug) === "solved") continue;
    if (reserved.has(problem.slug)) continue;
    if (!allowed.has(problem.difficulty)) continue;
    pool.push({
      problem,
      attempted: statusOf(input.statuses, problem.slug) === "attempted",
    });
  }

  // Finish what was started before opening a fresh problem. Both groups stay in
  // roadmap order because `problems` arrives in authored order.
  return [
    ...pool.filter((candidate) => candidate.attempted),
    ...pool.filter((candidate) => !candidate.attempted),
  ];
}

function blockedBy(input: {
  heavy: boolean;
  minutes: CoachMinutes;
  dueAtStart: number;
  newTarget: number;
  newDone: number;
  newRemaining: number;
  candidates: readonly Candidate[];
  unsolved: number;
  upcomingUnsolved: boolean;
}): NewBlockedBy {
  if (input.heavy) return "heavy-reviews";
  if (input.minutes === 15 && input.dueAtStart > 0) return "time";
  if (
    input.newTarget > 0 &&
    input.newDone >= input.newTarget &&
    input.newRemaining === 0
  ) {
    return "quota";
  }
  if (
    input.candidates.length === 0 &&
    input.unsolved > 0 &&
    input.upcomingUnsolved
  ) {
    return "scheduled";
  }
  return "none";
}

export function buildCoachPlan(input: CoachPlanInput): CoachPlan {
  const summary = summarizeProgress(input.problems, input.statuses);
  const solved = summary.overall.solved;
  const total = summary.overall.total;
  const unsolved = Math.max(0, total - solved);
  const hasHistory = solved > 0 || summary.overall.attempted > 0;
  const practicedToday = input.activity.some(
    (entry) => entry.day === input.day && entry.submits > 0,
  );
  const tone = deriveTone({
    day: input.day,
    activity: input.activity,
    hasHistory,
    practicedToday,
  });

  const candidates = findCandidates({
    problems: input.problems,
    statuses: input.statuses,
    due: input.due,
    upcomingSlugs: input.upcomingSlugs,
    tone,
    minutes: input.minutes,
  });

  const reviewsDone = input.reviewsRatedToday;
  const newDone = input.solvedToday;
  const dueAtStart = input.due.length + reviewsDone;
  const heavy = dueAtStart >= HEAVY_DUE;

  const newCapBase = newCapBaseFor({
    tone,
    minutes: input.minutes,
    dueAtStart,
  });
  const hasNewWork = candidates.length > 0 || newDone > 0;
  const newTarget = hasNewWork ? newCapBase : 0;
  const newRemaining = Math.min(
    candidates.length,
    Math.max(0, newTarget - newDone),
  );

  const reviewCapBase = reviewCapFor(tone, input.minutes);
  const reserve = newTarget * NEW_RESERVE_MINUTES;
  const timeCap = Math.max(
    0,
    Math.floor((input.minutes - reserve) / REVIEW_MINUTES),
  );
  const reviewsTarget = Math.min(dueAtStart, reviewCapBase, timeCap);
  const reviewsRemaining = Math.min(
    input.due.length,
    Math.max(0, reviewsTarget - reviewsDone),
  );

  const reviewItems = input.due
    .slice(0, reviewsRemaining)
    .map((review) => reviewItem(review, input));
  const newItems = candidates
    .slice(0, newRemaining)
    .map((candidate) => newItem(candidate));
  const items = [...reviewItems, ...newItems];

  let state: CoachPlanState;
  if (items.length > 0) state = "active";
  else if (reviewsDone + newDone > 0) state = "done";
  else state = "empty";

  const emptyReason =
    state === "empty" ? (unsolved > 0 ? "no-fit" : "caught-up") : null;

  const hardUnsolved = input.problems.some(
    (problem) =>
      problem.difficulty === "hard" &&
      statusOf(input.statuses, problem.slug) !== "solved",
  );
  const hardSkipped =
    hardUnsolved && newItems.length > 0 && newItems.every((item) => item.difficulty !== "hard");

  const upcomingUnsolved = input.upcomingSlugs.some(
    (slug) => statusOf(input.statuses, slug) !== "solved",
  );

  const newBlockedBy = blockedBy({
    heavy,
    minutes: input.minutes,
    dueAtStart,
    newTarget,
    newDone,
    newRemaining,
    candidates,
    unsolved,
    upcomingUnsolved,
  });

  const estimatedMinutes = items.reduce(
    (totalMinutes, item) =>
      totalMinutes + estimatedItemMinutes(item.kind, item.difficulty),
    0,
  );

  const counts: CoachPlanCounts = {
    reviewsTarget,
    reviewsDone,
    reviewsRemaining: reviewItems.length,
    reviewsDueNow: input.due.length,
    newTarget,
    newDone,
    newRemaining: newItems.length,
    upcomingCount: input.upcomingSlugs.length,
    pausedCount: input.pausedCount,
    estimatedMinutes,
    solved,
    total,
    unsolved,
  };

  const copyInput: PlanCopyInput = {
    state,
    emptyReason,
    tone,
    minutes: input.minutes,
    practicedToday,
    currentStreak: summarizeStreak(
      input.activity.map((entry) => entry.day),
      input.day,
    ).current,
    items,
    reviewsDueNow: input.due.length,
    reviewsDone,
    reviewsRemaining: reviewItems.length,
    newDone,
    newRemaining: newItems.length,
    estimatedMinutes,
    pausedCount: input.pausedCount,
    upcomingCount: input.upcomingSlugs.length,
    nextReviewAt: input.nextReviewAt,
    unsolved,
    newBlockedBy,
    hardSkipped,
  };
  const copy = buildPlanCopy(copyInput);

  return {
    version: COACH_PLAN_VERSION,
    day: input.day,
    minutes: input.minutes,
    state,
    emptyReason,
    tone,
    headline: copy.headline,
    summary: copy.summary,
    progressLine: copy.progressLine,
    fallbackNote: copy.fallbackNote,
    practicedToday,
    items,
    counts,
    defer: copy.defer,
    minimum: copy.minimum,
    nextReviewAt: input.nextReviewAt,
    fingerprint: coachPlanFingerprint({
      day: input.day,
      minutes: input.minutes,
      tone,
      state,
      practicedToday,
      items: items.map((item) => ({
        kind: item.kind,
        slug: item.slug,
        difficulty: item.difficulty,
        minutes: item.minutes,
      })),
      reviewsTarget,
      reviewsDone,
      newTarget,
      newDone,
    }),
  };
}

/** Build the structured note request; no titles, slugs, or free text. */
export function coachNoteRequestForPlan(plan: CoachPlan): CoachNoteRequest {
  return {
    fingerprint: plan.fingerprint,
    state: plan.state,
    tone: plan.tone,
    minutes: plan.minutes,
    items: plan.items.map((item) => ({
      kind: item.kind,
      difficulty: item.difficulty,
      minutes: item.minutes,
    })),
    reviewsDone: plan.counts.reviewsDone,
    reviewsRemaining: plan.counts.reviewsRemaining,
    newDone: plan.counts.newDone,
    newRemaining: plan.counts.newRemaining,
    practicedToday: plan.practicedToday,
    minimumKind:
      plan.state === "active" ? (plan.items[0]?.kind ?? null) : null,
  };
}

export function coachItemHref(item: CoachPlanItem): string {
  const base = `/problems/${encodeURIComponent(item.slug)}`;
  return item.kind === "review" ? `${base}?review=1` : base;
}
