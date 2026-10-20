import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProblemSummary } from "@/lib/problems";
import { buildCoachPlan } from "./plan";
import {
  fetchCoachPlan,
  isCoachNoteResponse,
  isCoachPlan,
  isCoachPlanResponse,
  requestCoachNote,
} from "./client";
import type { CoachNoteRequest } from "./types";

const problem: ProblemSummary = {
  slug: "easy-todo",
  number: 1,
  title: "Easy Todo",
  difficulty: "easy",
  topic: "Arrays & Hashing",
  tags: [],
};

const plan = buildCoachPlan({
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
  solvedToday: 0,
  reviewsRatedToday: 0,
});

const NOTE_REQUEST: CoachNoteRequest = {
  fingerprint: plan.fingerprint,
  state: "active",
  tone: "start",
  minutes: 30,
  items: [{ kind: "new", difficulty: "easy", minutes: 15 }],
  reviewsDone: 0,
  reviewsRemaining: 0,
  newDone: 0,
  newRemaining: 1,
  practicedToday: false,
  minimumKind: "new",
};

type FetchArgs = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function fakeFetch(
  responder: (args: FetchArgs) => Response | Promise<Response>,
): { fetch: typeof fetch; calls: FetchArgs[] } {
  const calls: FetchArgs[] = [];
  const fake = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return responder({ input, init });
  };
  return { fetch: fake as typeof fetch, calls };
}

describe("coach response guards", () => {
  it("accepts a consistent plan and response", () => {
    assert.equal(isCoachPlan(plan), true);
    assert.equal(isCoachPlanResponse({ plan, live: true }), true);
  });

  it("rejects inconsistent states, counts, and shapes", () => {
    const invalid = [
      { ...plan, state: "done" },
      { ...plan, state: "active", items: [] },
      { ...plan, fingerprint: "not-a-fingerprint" },
      { ...plan, counts: { ...plan.counts, newRemaining: 0 } },
      { ...plan, counts: { ...plan.counts, estimatedMinutes: 999 } },
      {
        ...plan,
        items: [{ ...plan.items[0]!, difficulty: "impossible" }],
      },
      { ...plan, defer: [1] },
      { ...plan, emptyReason: "caught-up" },
      { ...plan, minimum: null },
      { ...plan, defer: ["a", "b", "c", "d"] },
      null,
    ];
    for (const value of invalid) {
      assert.equal(isCoachPlan(value), false);
    }
    assert.equal(isCoachPlanResponse({ plan: {}, live: true }), false);
    assert.equal(isCoachPlanResponse({ plan, live: "yes" }), false);
  });

  it("accepts only a well-formed note response", () => {
    assert.equal(
      isCoachNoteResponse({
        status: "note",
        fingerprint: plan.fingerprint,
        note: "Start with the first problem.",
      }),
      true,
    );
    assert.equal(
      isCoachNoteResponse({
        status: "note",
        fingerprint: plan.fingerprint,
        note: "",
      }),
      false,
    );
    assert.equal(
      isCoachNoteResponse({
        status: "note",
        fingerprint: "nope",
        note: "Start.",
      }),
      false,
    );
    assert.equal(
      isCoachNoteResponse({
        status: "other",
        fingerprint: plan.fingerprint,
        note: "Start.",
      }),
      false,
    );
  });
});

describe("fetchCoachPlan", () => {
  it("requests the budget and offset and returns a validated plan", async () => {
    const { fetch, calls } = fakeFetch(() =>
      Response.json({ plan, live: true }),
    );
    const result = await fetchCoachPlan(
      { minutes: 30, utcOffsetMinutes: 330 },
      fetch,
    );

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0]?.input,
      "/api/coach/plan?minutes=30&utcOffsetMinutes=330",
    );
    assert.equal(calls[0]?.init?.cache, "no-store");
    assert.equal(result.plan.fingerprint, plan.fingerprint);
    assert.equal(result.live, true);
  });

  it("surfaces the server error and rejects malformed success bodies", async () => {
    const errorFetch = fakeFetch(() =>
      Response.json({ error: "Plan unavailable" }, { status: 500 }),
    ).fetch;
    await assert.rejects(
      fetchCoachPlan({ minutes: 30, utcOffsetMinutes: 330 }, errorFetch),
      /Plan unavailable/,
    );

    const malformed = fakeFetch(() =>
      Response.json({ plan: {}, live: true }),
    ).fetch;
    await assert.rejects(
      fetchCoachPlan({ minutes: 30, utcOffsetMinutes: 330 }, malformed),
      /expected shape/,
    );
  });
});

describe("requestCoachNote", () => {
  it("posts the structured request and validates the note", async () => {
    const note = "Start with the first problem.";
    const { fetch, calls } = fakeFetch(() =>
      Response.json({
        status: "note",
        fingerprint: plan.fingerprint,
        note,
      }),
    );
    const result = await requestCoachNote(NOTE_REQUEST, undefined, fetch);

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, "/api/coach/note");
    assert.equal(calls[0]?.init?.method, "POST");
    assert.equal(calls[0]?.init?.cache, "no-store");
    assert.equal(result.note, note);
    assert.doesNotMatch(String(calls[0]?.init?.body), /Easy Todo|easy-todo/);
  });

  it("throws on a failed or malformed note response", async () => {
    const failed = fakeFetch(() =>
      Response.json({ error: "No key" }, { status: 503 }),
    ).fetch;
    await assert.rejects(
      requestCoachNote(NOTE_REQUEST, undefined, failed),
      /No key/,
    );

    const malformed = fakeFetch(() =>
      Response.json({ status: "note", fingerprint: plan.fingerprint, note: "" }),
    ).fetch;
    await assert.rejects(
      requestCoachNote(NOTE_REQUEST, undefined, malformed),
      /expected shape/,
    );
  });
});
