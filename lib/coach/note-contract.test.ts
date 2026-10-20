import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coachNoteRequestSchema } from "./note-contract";
import type { CoachNoteRequest } from "./types";

const VALID = {
  fingerprint: "a1b2c3d4",
  state: "active",
  tone: "steady",
  minutes: 30,
  items: [
    { kind: "review", difficulty: "easy", minutes: 4 },
    { kind: "new", difficulty: "medium", minutes: 25 },
  ],
  reviewsDone: 0,
  reviewsRemaining: 1,
  newDone: 0,
  newRemaining: 1,
  practicedToday: false,
  minimumKind: "review",
};

describe("coachNoteRequestSchema", () => {
  it("accepts the structured planner contract", () => {
    const parsed = coachNoteRequestSchema.parse(VALID);
    const typed: CoachNoteRequest = parsed;
    assert.equal(typed.items.length, 2);
    assert.equal(typed.minimumKind, "review");
  });

  it("rejects free text and extra fields", () => {
    for (const extra of [
      { title: "Two Sum" },
      { slug: "two-sum" },
      { note: "Start here" },
      { statement: "Given an array..." },
      { source: "class Solution:" },
    ]) {
      assert.equal(
        coachNoteRequestSchema.safeParse({ ...VALID, ...extra }).success,
        false,
      );
    }
  });

  it("rejects malformed values and oversized item lists", () => {
    const invalid = [
      { ...VALID, fingerprint: "NOT-HEX" },
      { ...VALID, minutes: 45 },
      { ...VALID, state: "resting" },
      { ...VALID, tone: "fast" },
      { ...VALID, reviewsDone: -1 },
      { ...VALID, newRemaining: 1.5 },
      { ...VALID, items: Array.from({ length: 7 }, () => VALID.items[0]) },
      { ...VALID, items: [{ kind: "review", difficulty: "easy", minutes: 0 }] },
      { ...VALID, minimumKind: "lesson" },
    ];

    for (const value of invalid) {
      assert.equal(coachNoteRequestSchema.safeParse(value).success, false);
    }
  });

  it("allows the minimum to be absent for done and empty plans", () => {
    const done = coachNoteRequestSchema.safeParse({
      ...VALID,
      state: "done",
      items: [],
      reviewsRemaining: 0,
      newRemaining: 0,
      minimumKind: null,
    });
    assert.equal(done.success, true);
  });
});
