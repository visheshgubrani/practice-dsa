import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { it } from "node:test";
import { runInNewContext } from "node:vm";

import ts from "typescript";

import type { ProblemSummary } from "@/lib/problems";

import { buildCoachPlan } from "./plan";
import type { CoachNoteRequest, CoachPlan } from "./types";

/**
 * Execute the real `useCoachNote` hook with React storage and effects replaced.
 * The effect runner lets the test verify the parts a static render cannot:
 * fallback-first, no request without a key, the one-second settle, the cache,
 * the abort on plan change, and the silent failure path.
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
      },
    },
  );
  const exports = {};
  runInNewContext(outputText, {
    exports,
    Error,
    AbortController,
    Promise,
    require(name: string) {
      assert.ok(name in imports, `Unexpected test import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports as T;
}

function hookHarness() {
  const slots: unknown[] = [];
  const effectSlots: Array<{ deps?: readonly unknown[]; cleanup?: () => void }> = [];
  let stateCursor = 0;
  let effectCursor = 0;
  const pending = new Map<
    number,
    { deps?: readonly unknown[]; callback: () => void | (() => void) }
  >();
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let nextTimer = 1;

  function sameDeps(
    left: readonly unknown[] | undefined,
    right: readonly unknown[] | undefined,
  ): boolean {
    if (left === undefined || right === undefined) return left === right;
    return (
      left.length === right.length &&
      left.every((value, index) => Object.is(value, right[index]))
    );
  }

  const react = {
    useState(initial: unknown) {
      const index = stateCursor++;
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
      const index = stateCursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(
      callback: () => void | (() => void),
      deps?: readonly unknown[],
    ) {
      const index = effectCursor++;
      if (!sameDeps(effectSlots[index]?.deps, deps)) {
        pending.set(index, { callback, deps });
      }
    },
  };

  function flushEffects() {
    for (const [index, entry] of [...pending.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      effectSlots[index]?.cleanup?.();
      const cleanup = entry.callback();
      effectSlots[index] = {
        deps: entry.deps,
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
      };
    }
    pending.clear();
  }

  function render<T>(callback: () => T): T {
    stateCursor = 0;
    effectCursor = 0;
    const value = callback();
    flushEffects();
    return value;
  }

  const window = {
    setTimeout(callback: () => void, delay = 0) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  };

  function flushTimers() {
    const scheduled = [...timers.values()];
    timers.clear();
    for (const entry of scheduled) entry.callback();
  }

  function dispose() {
    for (const slot of effectSlots) slot.cleanup?.();
    pending.clear();
    timers.clear();
  }

  return {
    react,
    window,
    render,
    flushTimers,
    dispose,
    timers,
  };
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

const problem: ProblemSummary = {
  slug: "easy-todo",
  number: 1,
  title: "Easy Todo",
  difficulty: "easy",
  topic: "Arrays & Hashing",
  tags: [],
};

function planFor(minutes: 30 | 60): CoachPlan {
  return buildCoachPlan({
    day: "2026-10-18",
    offsetMinutes: 330,
    minutes,
    problems: [problem],
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

type Request = {
  request: CoachNoteRequest;
  signal?: AbortSignal;
};

function loadNoteHook(input: {
  harness: ReturnType<typeof hookHarness>;
  requestNote: (request: CoachNoteRequest, options?: { signal?: AbortSignal }) => Promise<{
    status: "note";
    fingerprint: string;
    note: string;
  }>;
  cached?: string | null;
  writes?: Array<{ fingerprint: string; note: string }>;
}) {
  return loadSource<{
    useCoachNote: (input: { plan: CoachPlan | null; live: boolean }) => {
      note: string | null;
      source: "fallback" | "llm";
    };
  }>("../hooks/use-coach-note.ts", {
    react: input.harness.react,
    "@/lib/coach/cache": {
      readCachedNote: () => input.cached ?? null,
      writeCachedNote: (fingerprint: string, note: string) => {
        input.writes?.push({ fingerprint, note });
      },
    },
    "@/lib/coach/client": { requestCoachNote: input.requestNote },
    "@/lib/coach/plan": {
      coachNoteRequestForPlan: (plan: CoachPlan) => ({
        fingerprint: plan.fingerprint,
        state: plan.state,
        tone: plan.tone,
        minutes: plan.minutes,
        items: plan.items,
        reviewsDone: plan.counts.reviewsDone,
        reviewsRemaining: plan.counts.reviewsRemaining,
        newDone: plan.counts.newDone,
        newRemaining: plan.counts.newRemaining,
        practicedToday: plan.practicedToday,
        minimumKind: plan.items[0]?.kind ?? null,
      }),
    },
  }, {
    window: input.harness.window,
  });
}

it("shows the fallback first, waits, then upgrades to the validated note and caches it", async () => {
  const harness = hookHarness();
  const note = "Start with the first problem; the rest can wait.";
  const pending = deferred<{
    status: "note";
    fingerprint: string;
    note: string;
  }>();
  const requests: Request[] = [];
  const writes: Array<{ fingerprint: string; note: string }> = [];
  const hook = loadNoteHook({
    harness,
    cached: null,
    writes,
    requestNote: (request, options) => {
      requests.push({ request, signal: options?.signal });
      return pending.promise;
    },
  });
  const plan = planFor(30);
  const render = () =>
    harness.render(() => hook.useCoachNote({ plan, live: true }));

  const first = render();
  assert.equal(first.source, "fallback");
  assert.equal(first.note, plan.fallbackNote);
  assert.equal(requests.length, 0);
  assert.equal([...harness.timers.values()][0]?.delay, 1_000);

  // The request waits for the settle delay; no work is done on the first paint.
  harness.flushTimers();
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.request.fingerprint, plan.fingerprint);
  assert.equal(requests[0]?.request.items[0]?.kind, "new");

  pending.resolve({ status: "note", fingerprint: plan.fingerprint, note });
  await setImmediate();
  const upgraded = render();
  assert.equal(upgraded.note, note);
  assert.equal(upgraded.source, "llm");
  assert.deepEqual(writes, [{ fingerprint: plan.fingerprint, note }]);
});

it("does not call the model without a key, for a finished plan, or when cached", () => {
  const finished = buildCoachPlan({
    day: "2026-10-18",
    offsetMinutes: 330,
    minutes: 30,
    problems: [problem],
    statuses: new Map(),
    due: [],
    upcomingSlugs: [],
    pausedCount: 0,
    nextReviewAt: null,
    activity: [],
    solvedToday: 1,
    reviewsRatedToday: 0,
  });
  for (const scenario of [
    { live: false, plan: planFor(30) },
    { live: true, plan: finished },
  ]) {
    const harness = hookHarness();
    let calls = 0;
    const hook = loadNoteHook({
      harness,
      requestNote: async () => {
        calls++;
        return { status: "note", fingerprint: scenario.plan.fingerprint, note: "Note." };
      },
    });
    const render = () =>
      harness.render(() =>
        hook.useCoachNote({ plan: scenario.plan, live: scenario.live }),
      );
    render();
    harness.flushTimers();
    assert.equal(calls, 0);
    assert.equal(render().source, "fallback");
    harness.dispose();
  }

  const harness = hookHarness();
  let cachedCalls = 0;
  const cachedPlan = planFor(30);
  const hook = loadNoteHook({
    harness,
    cached: "Cached note for this plan.",
    requestNote: async () => {
      cachedCalls++;
      return { status: "note", fingerprint: cachedPlan.fingerprint, note: "New." };
    },
  });
  harness.render(() => hook.useCoachNote({ plan: cachedPlan, live: true }));
  harness.flushTimers();
  assert.equal(cachedCalls, 0);
  assert.equal(harness.render(() => hook.useCoachNote({ plan: cachedPlan, live: true })).source, "llm");
});

it("ignores a mismatched fingerprint and a failed request without losing the fallback", async () => {
  const harness = hookHarness();
  const plan = planFor(30);
  let call = 0;
  const hook = loadNoteHook({
    harness,
    requestNote: async () => {
      call++;
      if (call === 1) {
        return { status: "note", fingerprint: "ffffffff", note: "Wrong plan." };
      }
      throw new Error("provider unavailable");
    },
  });
  const renderPlan = (next: CoachPlan) =>
    harness.render(() => hook.useCoachNote({ plan: next, live: true }));

  renderPlan(plan);
  harness.flushTimers();
  await setImmediate();
  assert.equal(renderPlan(plan).source, "fallback");
  assert.equal(renderPlan(plan).note, plan.fallbackNote);

  // A different plan can try again; the fallback is still the first paint.
  const second = planFor(60);
  renderPlan(second);
  harness.flushTimers();
  await setImmediate();
  const shown = renderPlan(second);
  assert.equal(shown.source, "fallback");
  assert.equal(shown.note, second.fallbackNote);
});

it("aborts the scheduled request when the plan changes before the settle delay", () => {
  const harness = hookHarness();
  let calls = 0;
  let observedSignal: AbortSignal | undefined;
  const hook = loadNoteHook({
    harness,
    requestNote: async (_request, options) => {
      calls++;
      observedSignal = options?.signal;
      return { status: "note", fingerprint: "unused", note: "Unused." };
    },
  });
  const firstPlan = planFor(30);
  const secondPlan = planFor(60);

  harness.render(() => hook.useCoachNote({ plan: firstPlan, live: true }));
  assert.equal(calls, 0);
  assert.equal(harness.timers.size, 1);
  // Change the plan before the timer fires; the old timer is cleared and its
  // controller aborted, so only the new plan's request is made.
  harness.render(() => hook.useCoachNote({ plan: secondPlan, live: true }));
  assert.equal(harness.timers.size, 1);
  harness.flushTimers();

  assert.equal(calls, 1);
  assert.equal(observedSignal?.aborted, false);
  harness.dispose();
});
