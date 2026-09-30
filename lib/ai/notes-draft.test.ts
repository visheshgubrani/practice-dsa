import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { NoObjectGeneratedError } from "ai";

import { NOTES_DRAFT_TIMEOUT_MS, generateNotesDraft } from "./notes-draft";

/**
 * Generation with a stubbed model.
 *
 * Every failure path must leave the user's notes alone, and the success path
 * must hand back validated text without writing anything. `live: true` stands in
 * for a configured provider key so none of this touches the network.
 */

const PROMPT = "PROMPT_SENTINEL";

const VALID = {
  approach: "Remember each value in a dict keyed by the number itself.",
  steps: "scan once\ncheck the complement\nstore the index",
  pitfalls: "",
  timeComplexity: "O(n)",
  spaceComplexity: "O(n)",
};

function stub(output: unknown, calls: string[] = []) {
  return async (input: { prompt: string }) => {
    calls.push(input.prompt);
    return { output };
  };
}

describe("generateNotesDraft", () => {
  it("refuses to invent a draft without a configured key", async () => {
    let called = false;
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: false,
      generate: async () => {
        called = true;
        return { output: VALID };
      },
    });

    assert.equal(called, false);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 503);
    assert.match(result.error, /OPENAI_API_KEY/);
    assert.match(result.error, /unchanged/);
  });

  it("returns validated notes from the model output", async () => {
    const calls: string[] = [];
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: true,
      generate: stub(VALID, calls),
    });

    assert.deepEqual(calls, [PROMPT]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.notes, VALID);
  });

  it("keeps a deliberately blank field blank", async () => {
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: true,
      generate: stub({ ...VALID, pitfalls: "", steps: "s".repeat(20_000) }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.notes.pitfalls, "");
    assert.equal(result.notes.steps.length, 20_000);
  });

  it("rejects output that is not a notes draft", async () => {
    for (const output of [
      null,
      "a memory aid in prose",
      { ...VALID, approach: undefined },
      { ...VALID, extra: "unexpected" },
      { ...VALID, approach: "a".repeat(20_001) },
    ]) {
      const result = await generateNotesDraft({
        prompt: PROMPT,
        live: true,
        generate: stub(output),
      });
      assert.equal(result.ok, false);
      if (result.ok) continue;
      assert.equal(result.status, 502);
      assert.match(result.error, /unchanged/);
    }
  });

  it("reports output the schema refuses as an incomplete draft", async () => {
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: true,
      generate: async () => {
        throw new NoObjectGeneratedError({
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
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 502);
    assert.match(result.error, /came back incomplete/);
    assert.match(result.error, /unchanged/);
  });

  it("reports a provider failure and writes nothing", async () => {
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: true,
      generate: async () => {
        throw new Error("provider exploded");
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 502);
    assert.match(result.error, /provider exploded/);
    assert.match(result.error, /unchanged/);
  });

  it("reports a timeout differently from a provider failure", async () => {
    const result = await generateNotesDraft({
      prompt: PROMPT,
      live: true,
      generate: async () => {
        throw new DOMException("aborted", "TimeoutError");
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 504);
    assert.match(result.error, /took too long/);
    assert.ok(NOTES_DRAFT_TIMEOUT_MS > 0);
  });

  it("reports a cancelled request quietly", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await generateNotesDraft({
      prompt: PROMPT,
      signal: controller.signal,
      live: true,
      generate: async () => {
        throw new Error("aborted by the client");
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 499);
  });
});

describe("notes generation never writes", () => {
  it("imports no practice or submission write path", () => {
    // The strongest form of "generation alone writes neither personal notes nor
    // chat messages" available without a database: nothing on the path can
    // reach a write.
    for (const file of [
      "./notes-draft.ts",
      "./notes-prompt.ts",
      "../notes/client.ts",
      "../notes/types.ts",
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.doesNotMatch(source, /queries\/(submissions|practice|chat)/);
      assert.doesNotMatch(
        source,
        /persistRunResult|patchPractice|completeChatTurn|beginChatTurn|problem_progress/,
      );
    }
  });
});
