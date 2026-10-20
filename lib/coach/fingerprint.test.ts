import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coachPlanFingerprint, hashFingerprint } from "./fingerprint";

const FACTS = {
  day: "2026-10-18",
  minutes: 30,
  tone: "steady",
  state: "active",
  practicedToday: false,
  items: [
    { kind: "review", slug: "solved-easy", difficulty: "easy", minutes: 4 },
    { kind: "new", slug: "easy-todo", difficulty: "easy", minutes: 15 },
  ],
  reviewsTarget: 1,
  reviewsDone: 0,
  newTarget: 1,
  newDone: 0,
};

describe("coachPlanFingerprint", () => {
  it("is stable for identical facts and short enough for a cache key", () => {
    const one = coachPlanFingerprint(FACTS);
    const two = coachPlanFingerprint(FACTS);

    assert.equal(one, two);
    assert.match(one, /^[0-9a-f]{8}$/);
  });

  it("changes when the day, budget, item, or completed work changes", () => {
    const base = coachPlanFingerprint(FACTS);

    assert.notEqual(
      base,
      coachPlanFingerprint({ ...FACTS, day: "2026-10-19" }),
    );
    assert.notEqual(
      base,
      coachPlanFingerprint({ ...FACTS, minutes: 60 }),
    );
    assert.notEqual(
      base,
      coachPlanFingerprint({
        ...FACTS,
        items: [
          { kind: "new", slug: "easy-todo", difficulty: "easy", minutes: 15 },
        ],
      }),
    );
    assert.notEqual(
      base,
      coachPlanFingerprint({ ...FACTS, reviewsDone: 1 }),
    );
    assert.notEqual(
      base,
      coachPlanFingerprint({ ...FACTS, practicedToday: true }),
    );
  });

  it("handles long strings without throwing", () => {
    assert.equal(hashFingerprint("x".repeat(10_000)).length, 8);
  });
});
