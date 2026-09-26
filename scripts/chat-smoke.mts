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

import type { AssembledTutorTurn } from "@/lib/ai/prompts";
import type { TutorUIMessage } from "@/lib/chat/types";
import { loadEnv } from "@/lib/db/env";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

loadEnv();

const { assembleTutorTurn, tutorPayloadText, QUICK_ACTIONS } = await import(
  "@/lib/ai/prompts"
);
const { pool } = await import("@/lib/db/index");
const { getProblem } = await import("@/lib/db/queries/problems");
const { getLanguage } = await import("@/lib/languages");

const LIVE_MODEL = "deepseek-flash";

const UNREVEALED_TWO_SUM = "SECRET_UNREVEALED_HIDDEN_SUCCESS nums = [0,0] target = 0";
const REVEALED_TWO_SUM = "nums = [3,3]\ntarget = 6";
const TWO_SUM_SOURCE = `class Solution:
    def twoSum(self, nums, target):
        return [0, 0]
`;

const UNREVEALED_PARENS = 'SECRET_UNREVEALED_PARENS s = "{[]}"';
const REVEALED_PARENS = 's = "([)]"';
const PARTIAL_PARENS = `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        for char in s:
            if char == "("
`;
const FAILING_PARENS = `class Solution:
    def isValid(self, s: str) -> bool:
        return (
            s.count("(") == s.count(")")
            and s.count("[") == s.count("]")
            and s.count("{") == s.count("}")
        )
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

function recordTrue(what: string, actual: boolean): void {
  record(what, "true", String(actual));
}

function recordFalse(what: string, actual: boolean): void {
  record(what, "false", String(actual));
}

function userTurn(id: string, text: string): TutorUIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
    metadata: { completionStatus: "completed" },
  };
}

function assistantTurn(id: string, text: string): TutorUIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: { completionStatus: "completed" },
  };
}

function quickPrompt(
  id: "hint" | "review" | "debug",
  problem: Problem,
  language: Language,
): string {
  const action = QUICK_ACTIONS.find((entry) => entry.id === id);
  if (!action) throw new Error(`Missing quick action ${id}`);
  return action.prompt({ problem, language });
}

function twoSumSubmission(): SubmissionDetail {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "two-sum",
    language: "python",
    mode: "submit",
    runner: "piston",
    verdict: "wrong_answer",
    source: TWO_SUM_SOURCE,
    passedCount: 1,
    totalCount: 3,
    timeMs: 12,
    memoryKb: 2048,
    catalogRevision: "2026-09-21T00:00:00.000Z",
    requestId: null,
    isRevision: false,
    day: "2026-09-21",
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
        input: UNREVEALED_TWO_SUM,
        expected: "[0,1]",
        stdout: "[0,1]",
        debug: "trace-should-not-leak",
      },
      {
        index: 1,
        status: "wrong_answer",
        hidden: true,
        input: REVEALED_TWO_SUM,
        expected: "[0,1]",
        stdout: "[]",
      },
    ],
  };
}

function parensSubmission(): SubmissionDetail {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "valid-parentheses",
    language: "python",
    mode: "submit",
    runner: "piston",
    verdict: "wrong_answer",
    source: FAILING_PARENS,
    passedCount: 3,
    totalCount: 4,
    timeMs: 11,
    memoryKb: 2048,
    catalogRevision: "2026-09-21T00:00:00.000Z",
    requestId: null,
    isRevision: false,
    day: "2026-09-21",
    createdAt: "2026-09-21T00:00:00.000Z",
    testcaseIndex: null,
    compileOutput: null,
    pistonVersion: "3.12.0",
    cases: [
      {
        index: 0,
        status: "accepted",
        hidden: false,
        input: 's = "()"',
        expected: "true",
        stdout: "true",
      },
      {
        index: 0,
        status: "accepted",
        hidden: true,
        input: UNREVEALED_PARENS,
        expected: "true",
        stdout: "true",
        debug: "parens-trace-should-not-leak",
      },
      {
        index: 1,
        status: "wrong_answer",
        hidden: true,
        input: REVEALED_PARENS,
        expected: "false",
        stdout: "true",
      },
    ],
  };
}

function misattributesExample(text: string): boolean {
  return (
    /your own example/i.test(text) ||
    /trace your example/i.test(text) ||
    /your example ["'`]/i.test(text)
  );
}

function containsBannedPraise(text: string): boolean {
  return /\bexactly right\b|\byou're close\b|\byou are close\b|\bgood start\b/i.test(
    text,
  );
}

function looksLikeFullParensSolution(text: string): boolean {
  return (
    /["']\)["']\s*:\s*["']\(["']/.test(text) &&
    /["']\]["']\s*:\s*["']\[["']/.test(text)
  );
}

function previewAnswer(text: string): void {
  const preview = text.length > 240 ? `${text.slice(0, 240)}…` : text;
  console.log(`        ${preview.replaceAll("\n", "\n        ")}`);
}

function reviewAnswer(
  label: string,
  text: string,
  extra: { relevant?: RegExp; unrevealed?: string[] } = {},
): void {
  recordTrue(`${label}: non-empty answer`, text.length >= 40);
  recordFalse(`${label}: generic praise`, containsBannedPraise(text));
  recordFalse(`${label}: calls a case the user's example`, misattributesExample(text));
  recordFalse(`${label}: pastes a complete parentheses solution`, looksLikeFullParensSolution(text));
  if (extra.relevant) {
    recordTrue(`${label}: stays on the current issue`, extra.relevant.test(text));
  }
  for (const marker of extra.unrevealed ?? []) {
    recordFalse(`${label}: does not echo ${marker.slice(0, 24)}…`, text.includes(marker));
  }
}

async function askModel(assembled: AssembledTutorTurn): Promise<string> {
  const { deepseek } = await import("@ai-sdk/deepseek");
  const { convertToModelMessages, generateText } = await import("ai");
  const result = await generateText({
    model: deepseek(LIVE_MODEL),
    instructions: assembled.instructions,
    messages: await convertToModelMessages(assembled.messages),
  });
  return result.text.trim();
}

async function main(): Promise<void> {
  const twoSum = await getProblem("two-sum");
  const parens = await getProblem("valid-parentheses");
  if (!twoSum || !parens) {
    throw new Error(
      "two-sum and valid-parentheses must be in the database. Run: pnpm db:migrate && pnpm db:seed",
    );
  }

  const language = getLanguage("python");
  const hintPrompt = quickPrompt("hint", parens, language);
  const debugPrompt = quickPrompt("debug", parens, language);

  const disclosure = assembleTutorTurn({
    problem: twoSum,
    language,
    editorCode: TWO_SUM_SOURCE,
    history: [userTurn("u1", debugPrompt)],
    submission: twoSumSubmission(),
  });
  const disclosurePayload = tutorPayloadText(disclosure);

  console.log("Prompt payload — two-sum failing submit");
  recordTrue(
    "revealed failing case is in the tutor payload",
    disclosurePayload.includes("nums = [3,3]"),
  );
  recordTrue(
    "submitted source is in the tutor payload",
    disclosurePayload.includes("return [0, 0]"),
  );
  recordFalse(
    "unrevealed hidden-success input is not in the tutor payload",
    disclosurePayload.includes(UNREVEALED_TWO_SUM),
  );
  recordFalse(
    "unrevealed hidden-success debug is not in the tutor payload",
    disclosurePayload.includes("trace-should-not-leak"),
  );
  recordTrue(
    "live editor is attached to the user turn",
    disclosurePayload.includes("Workbench context (attached by the app"),
  );
  recordTrue(
    "failing case is not called the user's example",
    disclosurePayload.includes("never the user's example"),
  );
  recordTrue(
    "instructions attribute illustrative inputs",
    disclosurePayload.includes("consider this illustrative input"),
  );
  recordFalse(
    "old 'your own examples' wording is gone",
    disclosurePayload.includes("Always label them as your own examples"),
  );

  const partial = assembleTutorTurn({
    problem: parens,
    language,
    editorCode: PARTIAL_PARENS,
    history: [userTurn("p1", hintPrompt)],
  });
  const partialPayload = tutorPayloadText(partial);

  console.log("\nPrompt payload — partial Valid Parentheses");
  recordTrue(
    "incomplete opener check is attached",
    partialPayload.includes('if char == "("'),
  );
  recordTrue(
    "unfinished editor is labeled work in progress",
    partialPayload.includes("unfinished work") &&
      partialPayload.includes("work in progress"),
  );
  recordTrue(
    "hint quick-action asks for one focused next step",
    partialPayload.includes("one focused hint"),
  );

  const failing = assembleTutorTurn({
    problem: parens,
    language,
    editorCode: FAILING_PARENS,
    history: [userTurn("f1", debugPrompt)],
    submission: parensSubmission(),
  });
  const failingPayload = tutorPayloadText(failing);

  console.log("\nPrompt payload — failing Valid Parentheses attempt");
  recordTrue(
    "count-based attempt is attached",
    failingPayload.includes('s.count("(")'),
  );
  recordTrue(
    "revealed hidden parentheses case is attached",
    failingPayload.includes("([)]"),
  );
  recordTrue(
    "parentheses failing case is attributed as a judge case",
    failingPayload.includes("never the user's example"),
  );
  recordFalse(
    "unrevealed parentheses success is not in the payload",
    failingPayload.includes(UNREVEALED_PARENS),
  );
  recordFalse(
    "unrevealed parentheses debug is not in the payload",
    failingPayload.includes("parens-trace-should-not-leak"),
  );

  const followUpQuestion =
    "I'm still stuck. Be more specific about what I should change in this code.";
  const followUp = assembleTutorTurn({
    problem: parens,
    language,
    editorCode: FAILING_PARENS,
    history: [
      userTurn("f1", debugPrompt),
      assistantTurn(
        "a1",
        "Equal counts are not enough — order matters. Look at the failing test case and ask what a stack would have to remember.",
      ),
      userTurn("f2", followUpQuestion),
    ],
    submission: parensSubmission(),
  });
  const followUpPayload = tutorPayloadText(followUp);

  console.log("\nPrompt payload — follow-up asking for more help");
  recordTrue(
    "follow-up keeps the earlier hint in history",
    followUpPayload.includes("Equal counts are not enough"),
  );
  recordTrue(
    "follow-up asks for a more specific next step",
    followUpPayload.includes("I'm still stuck"),
  );
  recordTrue(
    "follow-up still has the current editor",
    followUpPayload.includes('s.count("(")'),
  );
  recordTrue(
    "instructions tell the tutor to get more specific when stuck",
    followUpPayload.includes("make the next hint more specific"),
  );
  recordFalse(
    "follow-up does not leak unrevealed parentheses success",
    followUpPayload.includes(UNREVEALED_PARENS),
  );

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.log("\nLive model");
    console.log(
      "  skip  DEEPSEEK_API_KEY is unset. Demo mode still has to pass `pnpm test`.",
    );
    console.log(
      "  skip  Live answer review is skipped. Live tutoring is not declared ready until this script talks to the model.",
    );
    return;
  }

  console.log(`\nLive model (${LIVE_MODEL})`);

  const twoSumAnswer = await askModel(disclosure);
  previewAnswer(twoSumAnswer);
  reviewAnswer("two-sum debug", twoSumAnswer, {
    relevant: /index|pair|same|\[0,\s*0\]|3/i,
    unrevealed: [UNREVEALED_TWO_SUM, "trace-should-not-leak"],
  });

  const partialAnswer = await askModel(partial);
  previewAnswer(partialAnswer);
  reviewAnswer("partial parentheses hint", partialAnswer, {
    relevant: /\(|opening|opener|bracket|stack/i,
  });

  const failingAnswer = await askModel(failing);
  previewAnswer(failingAnswer);
  reviewAnswer("failing parentheses debug", failingAnswer, {
    relevant: /count|order|stack|\(\[\)\]/i,
    unrevealed: [UNREVEALED_PARENS, "parens-trace-should-not-leak"],
  });

  const liveFollowUp = assembleTutorTurn({
    problem: parens,
    language,
    editorCode: FAILING_PARENS,
    history: [
      userTurn("f1", debugPrompt),
      assistantTurn("a1", failingAnswer),
      userTurn("f2", followUpQuestion),
    ],
    submission: parensSubmission(),
  });
  const followUpAnswer = await askModel(liveFollowUp);
  previewAnswer(followUpAnswer);
  reviewAnswer("follow-up hint", followUpAnswer, {
    relevant: /count|order|stack|match|clos/i,
    unrevealed: [UNREVEALED_PARENS],
  });
  recordFalse(
    "follow-up is not a copy of the previous answer",
    followUpAnswer === failingAnswer,
  );
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
