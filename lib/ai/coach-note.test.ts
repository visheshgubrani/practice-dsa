import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NoObjectGeneratedError } from "ai";

import { generateCoachNote, normalizeCoachNote } from "./coach-note";
import type { CoachNoteRequest } from "@/lib/coach/types";

const REQUEST: CoachNoteRequest = {
  fingerprint: "a1b2c3d4",
  state: "active",
  tone: "steady",
  minutes: 30,
  items: [
    { kind: "review", difficulty: "easy", minutes: 4 },
    { kind: "new", difficulty: "easy", minutes: 15 },
  ],
  reviewsDone: 0,
  reviewsRemaining: 1,
  newDone: 0,
  newRemaining: 1,
  practicedToday: false,
  minimumKind: "review",
};

function valid(overrides: Partial<{ note: string }> = {}) {
  return {
    note: "Start with the first review. It is short, and it makes the next step easier to begin.",
    ...overrides,
  };
}

function stub(output: unknown, calls: string[] = []) {
  return async (input: { prompt: string }) => {
    calls.push(input.prompt);
    return { output };
  };
}

function noObjectError(): NoObjectGeneratedError {
  return new NoObjectGeneratedError({
    message: "No object generated: could not parse the response.",
    text: "not a json object at all",
    response: { id: "resp", timestamp: new Date(), modelId: "gpt-6-luna" },
    usage: {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    },
    finishReason: "stop",
  });
}

describe("normalizeCoachNote", () => {
  it("collapses whitespace and accepts a plain, digit-free note", () => {
    assert.equal(
      normalizeCoachNote({
        note: "  Start with the first review.\nIt is enough to begin.  ",
      }),
      "Start with the first review. It is enough to begin.",
    );
  });

  it("rejects digits, markdown, questions, and stray fields", () => {
    for (const output of [
      { note: "Start with 2 reviews." },
      { note: "**Start** with the review." },
      { note: "Ready to start?" },
      { note: "Use `the review` first." },
      { note: "a".repeat(401) },
      { note: "   " },
      { note: "" },
      { note: "Fine", title: "Two Sum" },
      null,
      "plain text",
    ]) {
      assert.equal(normalizeCoachNote(output), null);
    }
  });
});

describe("generateCoachNote", () => {
  it("refuses to call the model without a key and keeps the fallback", async () => {
    let called = false;
    const result = await generateCoachNote({
      request: REQUEST,
      live: false,
      generate: async () => {
        called = true;
        return { output: valid() };
      },
    });

    assert.equal(called, false);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 503);
    assert.match(result.error, /OPENAI_API_KEY/);
    assert.match(result.error, /plan note/i);
  });

  it("returns validated prose and sends the deterministic prompt", async () => {
    const calls: string[] = [];
    const result = await generateCoachNote({
      request: REQUEST,
      live: true,
      generate: stub(valid(), calls),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.note, /first review/);
    assert.doesNotMatch(result.note, /\d/);
    assert.equal(calls.length, 1);
    assert.match(calls[0] ?? "", /already decided the plan/i);
    assert.match(calls[0] ?? "", /a review/);
  });

  it("normalizes a note with line breaks instead of failing it", async () => {
    const result = await generateCoachNote({
      request: REQUEST,
      live: true,
      generate: stub({
        note: "Start with the first review.\nIt is enough.",
      }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.note, "Start with the first review. It is enough.");
  });

  it("rejects output that leaves the note contract", async () => {
    for (const output of [
      valid({ note: "Start with 2 reviews." }),
      valid({ note: "Start with **the review**." }),
      valid({ note: "Ready?" }),
      valid({ note: "a".repeat(401) }),
      { note: "" },
      { note: "Fine", extra: true },
      null,
    ]) {
      const result = await generateCoachNote({
        request: REQUEST,
        live: true,
        generate: stub(output),
      });
      assert.equal(result.ok, false);
      if (result.ok) continue;
      assert.equal(result.status, 502);
      assert.match(result.error, /plan note/i);
    }
  });

  it("reports provider failures as a missing preview, never a broken plan", async () => {
    const result = await generateCoachNote({
      request: REQUEST,
      live: true,
      generate: async () => {
        throw new Error("provider unavailable");
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 502);
    assert.match(result.error, /provider unavailable/);
    assert.match(result.error, /plan note/i);
  });

  it("maps an unparseable structured response to 502", async () => {
    const result = await generateCoachNote({
      request: REQUEST,
      live: true,
      generate: async () => {
        throw noObjectError();
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 502);
    assert.match(result.error, /incomplete/i);
  });

  it("maps a timeout to 504 and an abort to 499", async () => {
    const timeout = await generateCoachNote({
      request: REQUEST,
      live: true,
      generate: async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
    });
    assert.equal(timeout.ok, false);
    if (!timeout.ok) assert.equal(timeout.status, 504);

    const controller = new AbortController();
    controller.abort();
    const aborted = await generateCoachNote({
      request: REQUEST,
      live: true,
      signal: controller.signal,
      generate: async () => {
        throw new Error("aborted");
      },
    });
    assert.equal(aborted.ok, false);
    if (!aborted.ok) assert.equal(aborted.status, 499);
  });
});
