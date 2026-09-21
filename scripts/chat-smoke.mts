#!/usr/bin/env node

/**
 * Live smoke of the configured tutor.
 *
 * Persistence, restore, interrupt/retry, and unrevealed-case leakage are
 * asserted by `pnpm test` and must pass in demo mode even without a key.
 *
 * This script talks to DeepSeek when `DEEPSEEK_API_KEY` is set. Without a key
 * it still builds the disclosed prompt payload (and refuses to send secrets),
 * then exits 0 — live tutoring is not declared ready until the model answers.
 *
 * Usage: pnpm chat:smoke
 */

import { loadEnv } from "@/lib/db/env";

loadEnv();

const { assembleTutorTurn } = await import("@/lib/ai/prompts");
const { pool } = await import("@/lib/db/index");
const { getProblem } = await import("@/lib/db/queries/problems");
const { getLanguage } = await import("@/lib/languages");

const LIVE_MODEL = "deepseek-flash";

const UNREVEALED = "SECRET_UNREVEALED_HIDDEN_SUCCESS nums = [0,0] target = 0";
const REVEALED = "nums = [3,3]\ntarget = 6";
const SUBMITTED = `class Solution:
    def twoSum(self, nums, target):
        return [0, 0]
`;

type Failure = { what: string; expected: string; actual: string };
const failures: Failure[] = [];
let checks = 0;

function record(what: string, expected: string, actual: string): void {
  checks += 1;
  if (expected === actual) {
    console.log(`  ok    ${what}`);
    return;
  }
  console.log(`  FAIL  ${what} → ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
  failures.push({ what, expected, actual });
}

async function main(): Promise<void> {
  const problem = await getProblem("two-sum");
  if (!problem) {
    throw new Error(
      "two-sum is not in the database. Run: pnpm db:migrate && pnpm db:seed",
    );
  }

  const language = getLanguage("python");
  const assembled = assembleTutorTurn({
    problem,
    language,
    editorCode: SUBMITTED,
    history: [],
    submission: {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "two-sum",
      language: "python",
      mode: "submit",
      runner: "piston",
      verdict: "wrong_answer",
      source: SUBMITTED,
      passedCount: 1,
      totalCount: 3,
      timeMs: 12,
      memoryKb: 2048,
      catalogRevision: "2026-09-21T00:00:00.000Z",
      requestId: null,
      createdAt: "2026-09-21T00:00:00.000Z",
      testcaseIndex: null,
      compileOutput: null,
      pistonVersion: "3.12.0",
      cases: [
        {
          index: 0,
          status: "accepted",
          hidden: false,
          input: "nums = [2,7]\ntarget = 9",
          expected: "[0,1]",
          stdout: "[0,1]",
        },
        {
          index: 0,
          status: "accepted",
          hidden: true,
          input: UNREVEALED,
          expected: "[0,1]",
          stdout: "[0,1]",
          debug: "trace-should-not-leak",
        },
        {
          index: 1,
          status: "wrong_answer",
          hidden: true,
          input: REVEALED,
          expected: "[0,1]",
          stdout: "[]",
        },
      ],
    },
  });

  console.log("Prompt payload");
  record(
    "revealed failing case is in the tutor payload",
    "true",
    String(assembled.instructions.includes("nums = [3,3]")),
  );
  record(
    "submitted source is in the tutor payload",
    "true",
    String(assembled.instructions.includes("return [0, 0]")),
  );
  record(
    "unrevealed hidden-success input is not in the tutor payload",
    "false",
    String(assembled.instructions.includes(UNREVEALED)),
  );
  record(
    "unrevealed hidden-success debug is not in the tutor payload",
    "false",
    String(assembled.instructions.includes("trace-should-not-leak")),
  );

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.log("\nLive model");
    console.log(
      "  skip  DEEPSEEK_API_KEY is unset. Demo mode still has to pass `pnpm test`.",
    );
    console.log(
      "  skip  Live tutoring is not declared ready until this script talks to the model.",
    );
    return;
  }

  console.log(`\nLive model (${LIVE_MODEL})`);
  const { deepseek } = await import("@ai-sdk/deepseek");
  const { generateText } = await import("ai");
  const result = await generateText({
    model: deepseek(LIVE_MODEL),
    instructions: assembled.instructions,
    messages: [
      {
        role: "user",
        content:
          "Look at the test result attached to this conversation and explain what my code does wrong on that case. Don't give me the fixed code.",
      },
    ],
  });

  const text = result.text.trim();
  record("model returned a non-empty answer", "true", String(text.length >= 40));
  record(
    "model did not echo the unrevealed hidden-success marker",
    "false",
    String(text.includes("SECRET_UNREVEALED_HIDDEN_SUCCESS")),
  );
  const preview = text.length > 240 ? `${text.slice(0, 240)}…` : text;
  console.log(`        ${preview.replaceAll("\n", "\n        ")}`);
}

try {
  await main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  failures.push({ what: "smoke run", expected: "complete", actual: "aborted" });
} finally {
  await pool.end();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${checks} checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks} checks passed.`);
}
