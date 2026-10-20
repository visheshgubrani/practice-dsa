import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPlanCopy, type PlanCopyInput } from "./copy";
import type { CoachPlanItem } from "./types";

function reviewItem(overrides: Partial<CoachPlanItem> = {}): CoachPlanItem {
  return {
    kind: "review",
    slug: "solved-easy",
    number: 1,
    title: "Solved Easy",
    difficulty: "easy",
    topic: "Arrays & Hashing",
    minutes: 4,
    reason: "Due today",
    dueAt: "2026-10-18T06:00:00.000Z",
    ...overrides,
  };
}

function newItem(overrides: Partial<CoachPlanItem> = {}): CoachPlanItem {
  return {
    kind: "new",
    slug: "easy-todo",
    number: 2,
    title: "Easy Todo",
    difficulty: "easy",
    topic: "Two Pointers",
    minutes: 15,
    reason: "Next unsolved in Two Pointers.",
    ...overrides,
  };
}

function copyInput(overrides: Partial<PlanCopyInput> = {}): PlanCopyInput {
  return {
    state: "active",
    emptyReason: null,
    tone: "steady",
    minutes: 30,
    practicedToday: false,
    currentStreak: 1,
    items: [reviewItem(), newItem()],
    reviewsDueNow: 2,
    reviewsDone: 0,
    reviewsRemaining: 1,
    newDone: 0,
    newRemaining: 1,
    estimatedMinutes: 19,
    pausedCount: 0,
    upcomingCount: 0,
    nextReviewAt: null,
    unsolved: 10,
    newBlockedBy: "none",
    hardSkipped: false,
    ...overrides,
  };
}

describe("buildPlanCopy", () => {
  it("states the remaining counts and the estimate", () => {
    const copy = buildPlanCopy(copyInput());

    assert.equal(copy.headline, "1 review + 1 new problem");
    assert.match(copy.summary, /About 19 minutes/);
    assert.match(copy.summary, /rest of the 30 is yours/i);
    assert.match(copy.summary, /Reviews first/);
    assert.equal(copy.minimum, "One item is enough: start with the first review.");
    assert.equal(copy.progressLine, null);
  });

  it("pluralizes counts and keeps the fallback note digit-free", () => {
    const copy = buildPlanCopy(
      copyInput({
        items: [reviewItem(), reviewItem({ slug: "solved-two" }), newItem()],
        reviewsRemaining: 2,
        newRemaining: 1,
      }),
    );

    assert.equal(copy.headline, "2 reviews + 1 new problem");
    assert.doesNotMatch(copy.fallbackNote, /\d/);
    assert.doesNotMatch(copy.fallbackNote, /should|must/i);
  });

  it("acknowledges work already done without adding more", () => {
    const copy = buildPlanCopy(
      copyInput({
        state: "done",
        items: [],
        reviewsDone: 2,
        newDone: 1,
        reviewsRemaining: 0,
        newRemaining: 0,
        estimatedMinutes: 0,
      }),
    );

    assert.equal(copy.headline, "Done for today");
    assert.match(copy.summary, /finished today's plan/i);
    assert.match(copy.progressLine ?? "", /2 reviews/);
    assert.match(copy.progressLine ?? "", /1 new problem/);
    assert.equal(copy.minimum, null);
    assert.doesNotMatch(copy.fallbackNote, /\d/);
    assert.match(copy.fallbackNote, /optional/i);
  });

  it("gives permission to rest when caught up", () => {
    const copy = buildPlanCopy(
      copyInput({
        state: "empty",
        emptyReason: "caught-up",
        items: [],
        reviewsRemaining: 0,
        newRemaining: 0,
      }),
    );

    assert.equal(copy.headline, "Nothing scheduled today");
    assert.match(copy.summary, /Nothing is due/i);
    assert.match(copy.fallbackNote, /Nothing is due/i);
    assert.doesNotMatch(copy.fallbackNote, /\d/);
  });

  it("names paused and upcoming work without inventing a task", () => {
    const paused = buildPlanCopy(
      copyInput({
        state: "empty",
        emptyReason: "caught-up",
        items: [],
        reviewsRemaining: 0,
        newRemaining: 0,
        pausedCount: 2,
      }),
    );
    const upcoming = buildPlanCopy(
      copyInput({
        state: "empty",
        emptyReason: "caught-up",
        items: [],
        reviewsRemaining: 0,
        newRemaining: 0,
        nextReviewAt: "2026-10-20T10:00:00.000Z",
      }),
    );

    assert.match(paused.summary, /paused reviews/i);
    assert.match(upcoming.summary, /next review is already scheduled/i);
    assert.doesNotMatch(paused.fallbackNote, /\d/);
    assert.doesNotMatch(upcoming.fallbackNote, /\d/);
  });

  it("points a no-fit day at more time or the problem list", () => {
    const short = buildPlanCopy(
      copyInput({
        state: "empty",
        emptyReason: "no-fit",
        items: [],
        minutes: 15,
        reviewsRemaining: 0,
        newRemaining: 0,
      }),
    );
    const long = buildPlanCopy(
      copyInput({
        state: "empty",
        emptyReason: "no-fit",
        items: [],
        minutes: 60,
        reviewsRemaining: 0,
        newRemaining: 0,
      }),
    );

    assert.match(short.summary, /No easy problem fits 15 minutes/);
    assert.match(long.summary, /No easy or medium problem fits/);
    assert.doesNotMatch(short.fallbackNote, /\d/);
  });

  it("marks a restored session as optional rather than a fresh start", () => {
    const practised = buildPlanCopy(copyInput({ practicedToday: true }));
    const underway = buildPlanCopy(copyInput({ reviewsDone: 1 }));

    assert.match(practised.summary, /already practised today/i);
    assert.match(practised.fallbackNote, /optional/i);
    assert.match(underway.summary, /already underway/i);
  });

  it("keeps the not-today list to three lines and orders the important ones", () => {
    const copy = buildPlanCopy(
      copyInput({
        reviewsDueNow: 9,
        reviewsRemaining: 2,
        newBlockedBy: "heavy-reviews",
        hardSkipped: true,
      }),
    );

    assert.equal(copy.defer.length, 3);
    assert.match(copy.defer[0] ?? "", /7 more reviews/);
    assert.match(copy.defer[1] ?? "", /not a practice day/i);
    assert.match(copy.defer[2] ?? "", /review load is high/i);
  });

  it("never claims a review keeps the streak", () => {
    const copy = buildPlanCopy(copyInput());
    assert.match(copy.defer.join(" "), /new problem's Submit keeps the streak/);
    assert.doesNotMatch(
      copy.defer.join(" "),
      /review(?:s)? keeps the streak/i,
    );
  });

  it("gives a reviewer a minimum and a new problem a first-line minimum", () => {
    const review = buildPlanCopy(copyInput({ items: [reviewItem()], newRemaining: 0 }));
    const fresh = buildPlanCopy(copyInput({ items: [newItem()], reviewsRemaining: 0 }));

    assert.match(review.minimum ?? "", /first review/);
    assert.match(fresh.minimum ?? "", /first problem/);
    assert.doesNotMatch(review.fallbackNote, /\d/);
    assert.doesNotMatch(fresh.fallbackNote, /\d/);
  });
});
