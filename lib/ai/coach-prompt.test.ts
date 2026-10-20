import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCoachNotePrompt,
  COACH_NOTE_PROMPT_VERSION,
} from "./coach-prompt";
import type { CoachNoteRequest } from "@/lib/coach/types";

const REQUEST: CoachNoteRequest = {
  fingerprint: "a1b2c3d4",
  state: "active",
  tone: "comeback",
  minutes: 30,
  items: [
    { kind: "review", difficulty: "easy", minutes: 4 },
    { kind: "new", difficulty: "medium", minutes: 25 },
  ],
  reviewsDone: 1,
  reviewsRemaining: 1,
  newDone: 0,
  newRemaining: 1,
  practicedToday: false,
  minimumKind: "review",
};

describe("buildCoachNotePrompt", () => {
  it("is deterministic and carries only the structured plan facts", () => {
    const first = buildCoachNotePrompt(REQUEST);
    const second = buildCoachNotePrompt(REQUEST);

    assert.equal(first, second);
    assert.equal(COACH_NOTE_PROMPT_VERSION, 1);
    assert.match(first, /already decided the plan/i);
    assert.match(first, /Do not change it, reorder it/);
    assert.match(first, /Two or three short sentences/);
    assert.match(first, /No numerals or counts/);
    assert.match(first, /returning after a gap/i);
    assert.match(first, /a review/);
    assert.match(first, /a problem/);
    assert.match(first, /Low-energy minimum: a review/);
  });

  it("never contains a title, slug, statement, source, or hidden suite", () => {
    const prompt = buildCoachNotePrompt(REQUEST);
    for (const forbidden of [
      "Two Sum",
      "solved-easy",
      "class Solution",
      "statement",
      "reference solution",
      "hidden suite",
      "testcase",
    ]) {
      assert.doesNotMatch(prompt, new RegExp(forbidden, "i"));
    }
  });

  it("changes instructions for done and empty plans", () => {
    const done = buildCoachNotePrompt({
      ...REQUEST,
      state: "done",
      items: [],
      reviewsRemaining: 0,
      newRemaining: 0,
      minimumKind: null,
    });
    const empty = buildCoachNotePrompt({
      ...REQUEST,
      state: "empty",
      items: [],
      reviewsRemaining: 0,
      newRemaining: 0,
      minimumKind: null,
    });

    assert.match(done, /plan is finished/i);
    assert.match(done, /permission to close the session/i);
    assert.match(empty, /Nothing is scheduled/i);
    assert.match(empty, /do not invent work/i);
    assert.match(done, /No minimum item/);
  });
});
