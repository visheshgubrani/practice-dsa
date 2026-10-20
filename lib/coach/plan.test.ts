import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProblemSummary } from "@/lib/problems";
import type { ActivityDay } from "@/lib/progress/calendar";
import type { ProgressLookup } from "@/lib/progress/summary";
import type { ReviewSummary } from "@/lib/reviews/types";

import {
  buildCoachPlan,
  coachItemHref,
  coachNoteRequestForPlan,
  type CoachPlanInput,
} from "./plan";

const DAY = "2026-10-18";

function problem(
  overrides: Pick<ProblemSummary, "slug" | "number" | "title" | "difficulty"> &
    Partial<ProblemSummary>,
): ProblemSummary {
  return {
    topic: "Arrays & Hashing",
    tags: [],
    ...overrides,
  };
}

const solvedEasy = problem({
  slug: "solved-easy",
  number: 1,
  title: "Solved Easy",
  difficulty: "easy",
});
const solvedTwo = problem({
  slug: "solved-two",
  number: 2,
  title: "Solved Two",
  difficulty: "easy",
});
const easyTodo = problem({
  slug: "easy-todo",
  number: 3,
  title: "Easy Todo",
  difficulty: "easy",
});
const easyTodoTwo = problem({
  slug: "easy-todo-two",
  number: 4,
  title: "Easy Todo Two",
  difficulty: "easy",
  topic: "Two Pointers",
});
const mediumTodo = problem({
  slug: "medium-todo",
  number: 5,
  title: "Medium Todo",
  difficulty: "medium",
});
const mediumTodoTwo = problem({
  slug: "medium-todo-two",
  number: 6,
  title: "Medium Todo Two",
  difficulty: "medium",
});
const hardTodo = problem({
  slug: "hard-todo",
  number: 7,
  title: "Hard Todo",
  difficulty: "hard",
});

const allProblems = [
  solvedEasy,
  solvedTwo,
  easyTodo,
  easyTodoTwo,
  mediumTodo,
  mediumTodoTwo,
  hardTodo,
];

const solvedStatuses: ProgressLookup = new Map([
  [solvedEasy.slug, "solved"],
  [solvedTwo.slug, "solved"],
]);

const yesterday: ActivityDay = { day: "2026-10-17", submits: 1, accepted: 1 };
const fourActiveDays: ActivityDay[] = [
  { day: "2026-10-14", submits: 1, accepted: 1 },
  { day: "2026-10-15", submits: 1, accepted: 1 },
  { day: "2026-10-16", submits: 1, accepted: 1 },
  { day: "2026-10-17", submits: 1, accepted: 1 },
];

function review(
  input: Pick<
    ReviewSummary,
    "slug" | "number" | "title" | "difficulty" | "topic" | "dueAt"
  >,
): ReviewSummary {
  return { ...input, revision: 1 };
}

const overdueReview = review({
  slug: solvedEasy.slug,
  number: solvedEasy.number,
  title: solvedEasy.title,
  difficulty: "easy",
  topic: solvedEasy.topic,
  dueAt: "2026-10-16T12:00:00.000Z",
});
const todayReview = review({
  slug: solvedTwo.slug,
  number: solvedTwo.number,
  title: solvedTwo.title,
  difficulty: "easy",
  topic: solvedTwo.topic,
  dueAt: "2026-10-18T06:00:00.000Z",
});

function sixReviews(): ReviewSummary[] {
  return [
    overdueReview,
    todayReview,
    review({
      slug: "review-three",
      number: 8,
      title: "Review Three",
      difficulty: "medium",
      topic: "Stack",
      dueAt: "2026-10-17T12:00:00.000Z",
    }),
    review({
      slug: "review-four",
      number: 9,
      title: "Review Four",
      difficulty: "easy",
      topic: "Stack",
      dueAt: "2026-10-17T13:00:00.000Z",
    }),
    review({
      slug: "review-five",
      number: 10,
      title: "Review Five",
      difficulty: "medium",
      topic: "Graphs",
      dueAt: "2026-10-17T14:00:00.000Z",
    }),
    review({
      slug: "review-six",
      number: 11,
      title: "Review Six",
      difficulty: "easy",
      topic: "Graphs",
      dueAt: "2026-10-17T15:00:00.000Z",
    }),
  ];
}

function input(overrides: Partial<CoachPlanInput> = {}): CoachPlanInput {
  return {
    day: DAY,
    offsetMinutes: 330,
    minutes: 30,
    problems: allProblems,
    statuses: solvedStatuses,
    due: [],
    upcomingSlugs: [],
    pausedCount: 0,
    nextReviewAt: null,
    activity: [yesterday],
    solvedToday: 0,
    reviewsRatedToday: 0,
    ...overrides,
  };
}

function kinds(plan: ReturnType<typeof buildCoachPlan>): string[] {
  return plan.items.map((item) => `${item.kind}:${item.slug}`);
}

describe("buildCoachPlan", () => {
  it("starts a newcomer with one easy problem and no history assumptions", () => {
    const plan = buildCoachPlan(
      input({
        statuses: new Map(),
        activity: [],
        problems: [easyTodo, mediumTodo, hardTodo],
      }),
    );

    assert.equal(plan.tone, "start");
    assert.equal(plan.state, "active");
    assert.deepEqual(kinds(plan), ["new:easy-todo"]);
    assert.equal(plan.headline, "1 new problem");
    assert.equal(plan.counts.newDone, 0);
    assert.equal(plan.counts.newRemaining, 1);
    assert.equal(plan.counts.reviewsRemaining, 0);
    assert.match(plan.summary, /start small/i);
    assert.match(plan.minimum ?? "", /first problem/i);
    assert.doesNotMatch(plan.fallbackNote, /\d/);
  });

  it("puts due reviews first, preserves FSRS order, and fits 15 minutes", () => {
    const plan = buildCoachPlan(
      input({ minutes: 15, due: [overdueReview, todayReview] }),
    );

    assert.deepEqual(kinds(plan), [
      "review:solved-easy",
      "review:solved-two",
    ]);
    assert.equal(plan.tone, "steady");
    assert.equal(plan.counts.reviewsRemaining, 2);
    assert.equal(plan.counts.newRemaining, 0);
    assert.equal(plan.counts.estimatedMinutes, 8);
    assert.match(plan.items[0]?.reason ?? "", /Overdue by 2 days/);
    assert.match(plan.items[1]?.reason ?? "", /Due today/);
    assert.equal(plan.items[0]?.dueAt, overdueReview.dueAt);
  });

  it("keeps a 30-minute steady day to one review plus one new problem", () => {
    const plan = buildCoachPlan(
      input({ due: [overdueReview, todayReview] }),
    );

    assert.deepEqual(kinds(plan), ["review:solved-easy", "new:easy-todo"]);
    assert.equal(plan.headline, "1 review + 1 new problem");
    assert.equal(plan.counts.reviewsDueNow, 2);
    assert.equal(plan.counts.reviewsRemaining, 1);
    assert.equal(plan.counts.newRemaining, 1);
    assert.match(plan.summary, /About 19 minutes/);
  });

  it("does not add work once the day's targets are met", () => {
    const plan = buildCoachPlan(
      input({
        due: [todayReview],
        reviewsRatedToday: 1,
        solvedToday: 1,
      }),
    );

    assert.equal(plan.state, "done");
    assert.deepEqual(plan.items, []);
    assert.equal(plan.counts.reviewsDueNow, 1);
    assert.match(plan.progressLine ?? "", /1 review/);
    assert.match(plan.defer[0] ?? "", /1 more review is due/);
    assert.equal(plan.minimum, null);
  });

  it("keeps a review-only day active until the rating is saved", () => {
    const plan = buildCoachPlan(
      input({
        due: [todayReview],
        solvedToday: 1,
        minutes: 15,
      }),
    );

    // The new target is met, but the due review was never rated.
    assert.equal(plan.state, "active");
    assert.deepEqual(kinds(plan), ["review:solved-two"]);
    assert.match(plan.summary, /underway/i);
  });

  it("reserves the day's new capacity on a push 60-minute plan", () => {
    const push = input({
      activity: fourActiveDays,
      minutes: 60,
      due: [overdueReview, todayReview],
    });

    const start = buildCoachPlan(push);
    assert.equal(start.tone, "push");
    assert.equal(start.counts.reviewsRemaining, 2);
    assert.equal(start.counts.newRemaining, 2);
    assert.deepEqual(kinds(start), [
      "review:solved-easy",
      "review:solved-two",
      "new:easy-todo",
      "new:easy-todo-two",
    ]);

    // One new problem done must not free review slots or shrink the reserve.
    const oneNewDone = buildCoachPlan({ ...push, solvedToday: 1 });
    assert.equal(oneNewDone.counts.reviewsRemaining, 2);
    assert.equal(oneNewDone.counts.newRemaining, 1);
    assert.deepEqual(kinds(oneNewDone), [
      "review:solved-easy",
      "review:solved-two",
      "new:easy-todo",
    ]);

    const bothNewDone = buildCoachPlan({ ...push, solvedToday: 2 });
    assert.equal(bothNewDone.counts.reviewsRemaining, 2);
    assert.equal(bothNewDone.counts.newRemaining, 0);
    assert.equal(bothNewDone.state, "active");
  });

  it("caps a heavy review day and defers the backlog", () => {
    const plan = buildCoachPlan(input({ due: sixReviews() }));

    assert.equal(plan.state, "active");
    assert.equal(plan.counts.reviewsRemaining, 3);
    assert.equal(plan.counts.newRemaining, 0);
    assert.ok(plan.items.every((item) => item.kind === "review"));
    assert.ok(plan.defer.some((line) => /3 more reviews/.test(line)));
    assert.ok(plan.defer.some((line) => /No new problem today/.test(line)));
  });

  it("goes gently on a comeback day even with a long budget", () => {
    const plan = buildCoachPlan(
      input({
        activity: [],
        minutes: 60,
        due: sixReviews().slice(0, 3),
      }),
    );

    assert.equal(plan.tone, "comeback");
    assert.equal(plan.counts.reviewsRemaining, 2);
    assert.equal(plan.counts.newRemaining, 1);
    assert.equal(plan.items.at(-1)?.difficulty, "easy");
  });

  it("never auto-picks a hard problem", () => {
    const plan = buildCoachPlan(
      input({
        problems: [solvedEasy, hardTodo],
        statuses: new Map([[solvedEasy.slug, "solved"]]),
        minutes: 60,
      }),
    );

    assert.equal(plan.state, "empty");
    assert.equal(plan.emptyReason, "no-fit");
    assert.deepEqual(plan.items, []);
    assert.match(plan.summary, /No easy or medium problem/);
  });

  it("prefers an attempted problem over a fresh one", () => {
    const plan = buildCoachPlan(
      input({
        statuses: new Map([
          ...solvedStatuses,
          [mediumTodo.slug, "attempted"],
        ]),
      }),
    );

    assert.equal(plan.items[0]?.kind, "continue");
    assert.equal(plan.items[0]?.slug, "medium-todo");
    assert.match(plan.items[0]?.reason ?? "", /already started/);
  });

  it("does not pick a problem that is already scheduled for review", () => {
    const plan = buildCoachPlan(
      input({ upcomingSlugs: [easyTodo.slug] }),
    );

    assert.equal(plan.items[0]?.slug, "easy-todo-two");
    assert.ok(
      plan.items.every((item) => item.slug !== easyTodo.slug),
    );
  });

  it("explains that the remaining unsolved problems are already scheduled", () => {
    const plan = buildCoachPlan(
      input({
        problems: [solvedEasy, easyTodo, mediumTodo],
        statuses: new Map([[solvedEasy.slug, "solved"]]),
        upcomingSlugs: [easyTodo.slug, mediumTodo.slug],
      }),
    );

    assert.equal(plan.state, "empty");
    assert.equal(plan.emptyReason, "no-fit");
    assert.match(plan.summary, /already have reviews scheduled/);
  });

  it("keeps the fingerprint stable for the same plan and changes it with the day's work", () => {
    const one = buildCoachPlan(input({ due: [overdueReview] }));
    const two = buildCoachPlan(input({ due: [overdueReview] }));
    const differentBudget = buildCoachPlan(
      input({ due: [overdueReview], minutes: 60 }),
    );
    const doneReview = buildCoachPlan(
      input({ due: [todayReview], reviewsRatedToday: 1 }),
    );

    assert.equal(one.fingerprint, two.fingerprint);
    assert.notEqual(one.fingerprint, differentBudget.fingerprint);
    assert.notEqual(one.fingerprint, doneReview.fingerprint);
  });

  it("builds a note request with kinds and difficulties but no titles or slugs", () => {
    const plan = buildCoachPlan(input({ due: [overdueReview] }));
    const request = coachNoteRequestForPlan(plan);
    const serialized = JSON.stringify(request);

    assert.equal(request.fingerprint, plan.fingerprint);
    assert.equal(request.minimumKind, "review");
    assert.equal(request.items[0]?.kind, "review");
    assert.equal(request.items[0]?.difficulty, "easy");
    assert.equal(request.items[0]?.minutes, 4);
    assert.doesNotMatch(serialized, /Solved Easy/);
    assert.doesNotMatch(serialized, /solved-easy/);
  });

  it("links reviews to recall and new work to the workspace", () => {
    const plan = buildCoachPlan(input({ due: [overdueReview] }));
    assert.equal(
      coachItemHref(plan.items[0]!),
      `/problems/solved-easy?review=1`,
    );
    assert.equal(coachItemHref(plan.items[1]!), "/problems/easy-todo");
  });
});
