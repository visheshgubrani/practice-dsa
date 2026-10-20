import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { it } from "node:test";
import { runInNewContext } from "node:vm";

import ts from "typescript";

import type { ProblemSummary } from "@/lib/problems";

import { buildCoachPlan } from "./plan";
import type { CoachPlan, CoachPlanResponse } from "./types";

/**
 * Execute the real `useCoachPlan` hook with only React storage, the fetch seam,
 * and timers replaced. This pins the parts that are easy to regress: the URL
 * parameters, latest-wins after a budget change, and keeping the last plan
 * when a same-budget refresh fails.
 */

function loadSource<T>(
  path: string,
  imports: Record<string, unknown>,
  globals: Record<string, unknown> = {},
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
    AbortController,
    URLSearchParams,
    Promise,
    require(name: string) {
      assert.ok(name in imports, `Unexpected test import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports as T;
}

function hookStorage() {
  const slots: unknown[] = [];
  let cursor = 0;
  return {
    render<T>(callback: () => T): T {
      cursor = 0;
      return callback();
    },
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) {
          slots[index] = typeof initial === "function" ? initial() : initial;
        }
        return [
          slots[index],
          (value: unknown) => {
            slots[index] =
              typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useCallback<T>(callback: T) {
        return callback;
      },
      useEffect() {},
    },
  };
}

const problem: ProblemSummary = {
  slug: "easy-todo",
  number: 1,
  title: "Easy Todo",
  difficulty: "easy",
  topic: "Arrays & Hashing",
  tags: [],
};

function planFor(
  minutes: 15 | 30,
  title = "Easy Todo",
): CoachPlan {
  return buildCoachPlan({
    day: "2026-10-18",
    offsetMinutes: 330,
    minutes,
    problems: [{ ...problem, title }],
    statuses: new Map(),
    due: [],
    upcomingSlugs: [],
    pausedCount: 0,
    nextReviewAt: null,
    activity: [],
    solvedToday: 0,
    reviewsRatedToday: 0,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

type FetchPlan = (input: {
  minutes: number;
  utcOffsetMinutes: number;
  signal?: AbortSignal;
}) => Promise<CoachPlanResponse>;

function loadHook(storage: ReturnType<typeof hookStorage>, fetchPlan: FetchPlan) {
  return loadSource<{
    useCoachPlan: (input: {
      minutes: 15 | 30;
      enabled: boolean;
      nextDueAt?: string | null;
    }) => {
      plan: CoachPlan | null;
      live: boolean;
      status: "loading" | "ready" | "error";
      error: string | null;
      refreshing: boolean;
      refresh: (silent?: boolean) => Promise<CoachPlan | null>;
    };
  }>("../hooks/use-coach-plan.ts", {
    react: storage.react,
    "@/lib/coach/boundary": { scheduleLocalMidnight: () => () => {} },
    "@/lib/coach/client": { fetchCoachPlan: fetchPlan },
    "@/lib/practice/days": { utcOffsetMinutesFor: () => 330 },
    "@/lib/reviews/boundary": { scheduleReviewBoundary: () => () => {} },
    "@/lib/reviews/client": { REVIEW_QUEUE_CHANGED_EVENT: "test-event" },
  });
}

it("loads a plan with the budget and offset, and refuses work while disabled", async () => {
  const storage = hookStorage();
  const calls: Array<{ minutes: number; utcOffsetMinutes: number }> = [];
  const plan = planFor(30);
  const hook = loadHook(storage, async (input) => {
    calls.push({
      minutes: input.minutes,
      utcOffsetMinutes: input.utcOffsetMinutes,
    });
    return { plan, live: true };
  });

  const disabled = storage.render(() =>
    hook.useCoachPlan({ minutes: 30, enabled: false, nextDueAt: null }),
  );
  assert.equal(await disabled.refresh(), null);
  assert.equal(calls.length, 0);

  const initial = storage.render(() =>
    hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
  );
  assert.equal(initial.status, "loading");
  const loaded = await initial.refresh();

  assert.equal(loaded?.fingerprint, plan.fingerprint);
  assert.deepEqual(calls, [{ minutes: 30, utcOffsetMinutes: 330 }]);
  const after = storage.render(() =>
    hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
  );
  assert.equal(after.status, "ready");
  assert.equal(after.plan?.fingerprint, plan.fingerprint);
  assert.equal(after.live, true);
});

it("keeps the last plan when a same-budget refresh fails", async () => {
  const storage = hookStorage();
  const plan = planFor(30);
  let shouldFail = false;
  const hook = loadHook(storage, async () => {
    if (shouldFail) throw new Error("Plan unavailable");
    return { plan, live: true };
  });
  const render = () =>
    storage.render(() =>
      hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
    );

  await render().refresh();
  shouldFail = true;
  await render().refresh(true);
  const after = render();

  assert.equal(after.plan?.fingerprint, plan.fingerprint);
  assert.equal(after.status, "ready");
  assert.equal(after.error, "Plan unavailable");
});

it("reports a first-load failure as an error rather than an empty plan", async () => {
  const storage = hookStorage();
  const hook = loadHook(storage, async () => {
    throw new Error("Plan unavailable");
  });
  const render = () =>
    storage.render(() =>
      hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
    );

  assert.equal(await render().refresh(), null);
  const after = render();
  assert.equal(after.plan, null);
  assert.equal(after.status, "error");
  assert.equal(after.error, "Plan unavailable");
});

it("clears the old plan on a budget change and applies the new one", async () => {
  const storage = hookStorage();
  const oldPlan = planFor(30, "Old Plan");
  const newPlan = planFor(15, "New Plan");
  const pending = deferred<CoachPlanResponse>();
  let reads = 0;
  const hook = loadHook(storage, async () => {
    reads++;
    if (reads === 1) return { plan: oldPlan, live: true };
    return pending.promise;
  });

  const at30 = () =>
    storage.render(() =>
      hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
    );
  await at30().refresh();
  assert.equal(at30().plan?.minutes, 30);

  const at15 = () =>
    storage.render(() =>
      hook.useCoachPlan({ minutes: 15, enabled: true, nextDueAt: null }),
    );
  const request = at15().refresh();
  const clearing = at15();
  assert.equal(clearing.plan, null);
  assert.equal(clearing.status, "loading");

  pending.resolve({ plan: newPlan, live: true });
  await request;
  assert.equal(at15().plan?.minutes, 15);
  assert.equal(at15().plan?.items[0]?.slug, newPlan.items[0]?.slug);
});

it("applies only the latest response when a refresh is superseded", async () => {
  const storage = hookStorage();
  const first = deferred<CoachPlanResponse>();
  const second = deferred<CoachPlanResponse>();
  const firstPlan = planFor(30, "First Plan");
  const secondPlan = planFor(30, "Second Plan");
  let reads = 0;
  const hook = loadHook(storage, () => {
    reads++;
    return reads === 1 ? first.promise : second.promise;
  });
  const render = () =>
    storage.render(() =>
      hook.useCoachPlan({ minutes: 30, enabled: true, nextDueAt: null }),
    );

  const firstRequest = render().refresh();
  const secondRequest = render().refresh();

  first.resolve({ plan: firstPlan, live: true });
  await firstRequest;
  await setImmediate();
  assert.equal(render().plan, null);

  second.resolve({ plan: secondPlan, live: true });
  await secondRequest;
  assert.equal(render().plan?.items[0]?.title, "Second Plan");
});
