import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

import type { ProblemSummary } from "@/lib/problems";
import type { ReviewSummary } from "@/lib/reviews/types";

import { buildCoachPlan } from "./plan";
import type { CoachPlan } from "./types";

/**
 * Render the actual plan card with its data hooks replaced. No browser is
 * needed for the state hierarchy: active, done, caught-up, no-fit, loading,
 * first-load error, and a stale refresh. The real state machine and copy come
 * from the planner; only the hook boundaries and UI primitives are stubs.
 */

type PlanState = {
  plan: CoachPlan | null;
  live: boolean;
  status: "loading" | "ready" | "error";
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<CoachPlan | null>;
};

let currentState: PlanState = {
  plan: null,
  live: false,
  status: "loading",
  error: null,
  refreshing: false,
  refresh: async () => null,
};
let currentMinutes = 30;

function loadSource<T>(
  path: string,
  imports: Record<string, unknown>,
): T {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const exports = {};
  runInNewContext(outputText, {
    exports,
    Error,
    Promise,
    URLSearchParams,
    require(name: string) {
      assert.ok(name in imports, `Unexpected test import: ${name}`);
      return imports[name];
    },
  });
  return exports as T;
}

const Box = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) =>
  React.createElement(
    "div",
    {
      className: props.className,
      "aria-label": props["aria-label"],
      id: props.id,
    },
    children,
  );

const Link = ({
  href,
  children,
  ...props
}: {
  href?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}) =>
  React.createElement(
    "a",
    { href, className: props.className },
    children,
  );

function Button({
  render,
  children,
  ...props
}: {
  render?: React.ReactElement<{ children?: React.ReactNode }>;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  if (render) {
    return React.cloneElement(render, {}, children);
  }
  return React.createElement(
    "button",
    { type: props.type, disabled: props.disabled },
    children,
  );
}

const ToggleGroup = ({
  children,
}: {
  children?: React.ReactNode;
}) => React.createElement("div", null, children);
const ToggleGroupItem = ({
  children,
}: {
  children?: React.ReactNode;
}) => React.createElement("button", null, children);

const DifficultyBadge = ({ difficulty }: { difficulty: string }) =>
  React.createElement("span", null, difficulty);
const ReviewQueueSummary = () =>
  React.createElement("span", null, "Review queue");

const ui = {
  "react/jsx-runtime": jsxRuntime,
  "next/link": { default: Link },
  "lucide-react": {
    ArrowRightIcon: "i",
    CalendarDaysIcon: "i",
    CheckIcon: "i",
    ClockIcon: "i",
    FootprintsIcon: "i",
    MinusIcon: "i",
    RefreshCwIcon: "i",
    SparklesIcon: "i",
  },
  "@/components/problems/difficulty-badge": { DifficultyBadge },
  "@/components/reviews/review-queue-summary": { ReviewQueueSummary },
  "@/components/ui/alert": {
    Alert: Box,
    AlertTitle: Box,
    AlertDescription: Box,
  },
  "@/components/ui/badge": { Badge: Box },
  "@/components/ui/button": { Button },
  "@/components/ui/card": {
    Card: Box,
    CardContent: Box,
    CardDescription: Box,
    CardFooter: Box,
    CardHeader: Box,
    CardTitle: Box,
  },
  "@/components/ui/empty": {
    Empty: Box,
    EmptyContent: Box,
    EmptyDescription: Box,
    EmptyHeader: Box,
    EmptyMedia: Box,
    EmptyTitle: Box,
  },
  "@/components/ui/skeleton": { Skeleton: Box },
  "@/components/ui/spinner": { Spinner: Box },
  "@/components/ui/toggle-group": { ToggleGroup, ToggleGroupItem },
  "@/lib/coach/cache": {
    COACH_MINUTES_KEY: "dsa.coach.minutes",
    isCoachMinutesValue: (value: unknown) =>
      value === 15 || value === 30 || value === 60,
  },
  "@/lib/coach/plan": {
    coachItemHref: (item: { slug: string; kind: string }) =>
      item.kind === "review"
        ? `/problems/${item.slug}?review=1`
        : `/problems/${item.slug}`,
  },
  "@/lib/coach/types": {
    COACH_MINUTE_OPTIONS: [15, 30, 60],
    DEFAULT_COACH_MINUTES: 30,
    isCoachMinutes: (value: unknown) =>
      value === 15 || value === 30 || value === 60,
  },
  "@/lib/hooks/use-coach-note": {
    useCoachNote: () => ({
      note: currentState.plan?.fallbackNote ?? null,
      source: "fallback" as const,
    }),
  },
  "@/lib/hooks/use-coach-plan": { useCoachPlan: () => currentState },
  "@/lib/hooks/use-persisted-state": {
    usePersistedState: () => ({
      value: currentMinutes,
      setValue: (next: number) => {
        currentMinutes = next;
      },
      hydrated: true,
      reset: () => {},
    }),
  },
  "@/lib/hooks/use-review-queue": {
    useReviewQueue: () => ({ queue: null }),
  },
  "@/lib/practice/days": {
    describeDay: () => "Sunday 18 Oct 2026",
    todayKey: () => "2026-10-18",
  },
  "@/lib/reviews/date": {
    reviewDueLabel: () => "Due 20 Oct 2026, 18:30",
  },
  "@/lib/utils": { cn: (...values: unknown[]) => values.join(" ") },
};

const component = loadSource<{ TodayPlanCard: () => React.ReactElement }>(
  "../../components/dashboard/today-plan.tsx",
  ui,
);

function render(state: PlanState, minutes = 30): string {
  currentState = state;
  currentMinutes = minutes;
  return renderToStaticMarkup(React.createElement(component.TodayPlanCard));
}

const solvedEasy: ProblemSummary = {
  slug: "solved-easy",
  number: 1,
  title: "Solved Easy",
  difficulty: "easy",
  topic: "Arrays & Hashing",
  tags: [],
};
const newEasy: ProblemSummary = {
  slug: "new-easy",
  number: 2,
  title: "New Easy",
  difficulty: "easy",
  topic: "Two Pointers",
  tags: [],
};
const mediumTodo: ProblemSummary = {
  slug: "medium-todo",
  number: 3,
  title: "Medium Todo",
  difficulty: "medium",
  topic: "Stack",
  tags: [],
};
const hardTodo: ProblemSummary = {
  slug: "hard-todo",
  number: 4,
  title: "Hard Todo",
  difficulty: "hard",
  topic: "Graphs",
  tags: [],
};

function review(
  slug: string,
  title: string,
  dueAt: string,
): ReviewSummary {
  return {
    slug,
    number: 1,
    title,
    difficulty: "easy",
    topic: "Arrays & Hashing",
    dueAt,
    revision: 1,
  };
}

const yesterday = { day: "2026-10-17", submits: 1, accepted: 1 };

function plan(overrides: {
  minutes?: 15 | 30 | 60;
  due?: ReviewSummary[];
  problems?: ProblemSummary[];
  statuses?: Map<string, "todo" | "attempted" | "solved">;
  solvedToday?: number;
  reviewsRatedToday?: number;
}): CoachPlan {
  return buildCoachPlan({
    day: "2026-10-18",
    offsetMinutes: 330,
    minutes: overrides.minutes ?? 30,
    problems: overrides.problems ?? [solvedEasy, newEasy, mediumTodo, hardTodo],
    statuses:
      overrides.statuses ??
      new Map<string, "todo" | "attempted" | "solved">([
        [solvedEasy.slug, "solved"],
      ]),
    due: overrides.due ?? [],
    upcomingSlugs: [],
    pausedCount: 0,
    nextReviewAt: null,
    activity: [yesterday],
    solvedToday: overrides.solvedToday ?? 0,
    reviewsRatedToday: overrides.reviewsRatedToday ?? 0,
  });
}

const activePlan = plan({
  due: [review(solvedEasy.slug, solvedEasy.title, "2026-10-16T12:00:00.000Z")],
});

function ready(statePlan: CoachPlan): PlanState {
  return {
    plan: statePlan,
    live: true,
    status: "ready",
    error: null,
    refreshing: false,
    refresh: async () => statePlan,
  };
}

it("renders the active plan with one first action, items, note, and not-today list", () => {
  const html = render(ready(activePlan));

  assert.match(html, /Today/);
  assert.match(html, /1 review \+ 1 new problem/);
  assert.match(html, /About 19 minutes/);
  assert.match(html, /Start review: Solved Easy/);
  assert.match(html, /href="\/problems\/solved-easy\?review=1"/);
  assert.match(html, /Start here/);
  assert.match(html, /Overdue by 2 days/);
  assert.match(html, /One item is enough: start with the first review/);
  assert.match(html, /Plan note/);
  assert.match(html, /Start with the first review/);
  assert.match(html, /Not today/);
  assert.match(html, /Hard problems are not picked automatically/);
  assert.match(html, /15 min/);
  assert.match(html, /30 min/);
  assert.match(html, /60 min/);
  assert.match(html, /Problem list/);
  assert.match(html, /Review queue/);
});

it("renders a done plan as a stop signal rather than new work", () => {
  const done = plan({
    due: [review(solvedEasy.slug, solvedEasy.title, "2026-10-18T06:00:00.000Z")],
    reviewsRatedToday: 1,
    solvedToday: 1,
  });
  const html = render(ready(done));

  assert.equal(done.state, "done");
  assert.match(html, /Done for today/);
  assert.match(html, /Done today: 1 review · 1 new problem/);
  assert.match(html, /Anything else is optional/);
  assert.doesNotMatch(html, /Start here/);
  assert.doesNotMatch(html, /Start review:/);
});

it("renders caught-up and no-fit empty states with the right action", () => {
  const caughtUp = plan({
    problems: [solvedEasy],
  });
  const caughtUpHtml = render(ready(caughtUp));
  assert.equal(caughtUp.state, "empty");
  assert.equal(caughtUp.emptyReason, "caught-up");
  assert.match(caughtUpHtml, /Nothing scheduled today/);
  assert.match(caughtUpHtml, /Problem list/);
  assert.match(caughtUpHtml, /All reviews/);
  assert.doesNotMatch(caughtUpHtml, /Try 30 minutes/);

  const noFit = plan({
    minutes: 15,
    problems: [solvedEasy, mediumTodo],
  });
  const noFitHtml = render(ready(noFit), 15);
  assert.equal(noFit.state, "empty");
  assert.equal(noFit.emptyReason, "no-fit");
  assert.match(noFitHtml, /No easy problem fits 15 minutes/);
  assert.match(noFitHtml, /Try 30 minutes/);
});

it("renders loading, first-load error, and stale-refresh states distinctly", () => {
  const loading = render({
    plan: null,
    live: false,
    status: "loading",
    error: null,
    refreshing: false,
    refresh: async () => null,
  });
  assert.match(loading, /Loading today&#x27;s plan/);

  const failed = render({
    plan: null,
    live: false,
    status: "error",
    error: "Plan unavailable",
    refreshing: false,
    refresh: async () => null,
  });
  assert.match(failed, /Today&#x27;s plan couldn&#x27;t load/);
  assert.match(failed, /Plan unavailable/);
  assert.match(failed, /Retry/);
  assert.match(failed, /All reviews/);

  const stale = render({
    ...ready(activePlan),
    error: "Refresh failed",
  });
  assert.match(stale, /Couldn&#x27;t refresh the plan/);
  assert.match(stale, /Plan note/);
  assert.match(stale, /1 review \+ 1 new problem/);
});
