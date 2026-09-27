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
 * Live runs call the model directly. They do not post to `/api/chat` and do
 * not write evaluation chats into practice history.
 *
 * Set `CHAT_SMOKE_LABEL` to choose the results filename
 * (`docs/plan/evals/tutor-consistency-<label>.json`). Set `CHAT_SMOKE_RUNS`
 * to override the default of three runs per conversation.
 *
 * Keyword misses are logged with the transcripts. They are not a teaching-quality
 * score. Hard failures — an unsolicited full solution, a hidden-data leak, or a
 * stale-result claim — still fail the run.
 *
 * Usage: pnpm chat:smoke
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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

/**
 * The buffer behind the unhelpful Encode and Decode Strings chat: `encode`
 * holds only the two format comments it was told to sketch, and `decode` is
 * half-written. The tutor kept asking for the comment that was already there.
 */
const ENCODE_BUFFER = `class Solution:
    def encode(self, strs: List[str]) -> str:
        # chunk = <length><sep><chars>
        # 5#hello5#world
    def decode(self, s: str) -> List[str]:
        final_list = []
        i = 0
        while i < len(s):
            length = 0
            if s[i] == "#":
                i += 1
`;

const TWO_SUM_STARTER = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        pass
`;

const TWO_SUM_NESTED = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            pass
`;

const TWO_SUM_DRAFT = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            # looking for the complement
`;

const PARENS_STARTER = `class Solution:
    def isValid(self, s: str) -> bool:
        pass
`;

const PARENS_STACK = `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
`;

const PARENS_DEBUG = `class Solution:
    def isValid(self, s: str) -> bool:
        print("counts", s.count("("), s.count(")"))
        return (
            s.count("(") == s.count(")")
            and s.count("[") == s.count("]")
            and s.count("{") == s.count("}")
        )
`;

const CODEC_PARTIAL = `class Solution:
    def encode(self, strs: List[str]) -> str:
        chunks = []
        for word in strs:
            print(len(word), word)
            chunks.append(word)
        return "".join(chunks)

    def decode(self, s: str) -> List[str]:
        pass
`;

/**
 * Encode is done. Decode still tests for `#` and reads `s[j]` before `j`
 * exists. Reconstructed from the tutor's description of that turn — the
 * pasted editor is the later snapshot, `CODEC_AT_LENGTH`.
 */
const CODEC_CONFUSED = `class Solution:
    def encode(self, strs: List[str]) -> str:
        # chunk = <length><sep><chars>
        # 5#hello5#world
        res = ""
        for s in strs:
            res += str(len(s)) + "#" + s
        return res

    def decode(self, s: str) -> List[str]:
        final_list = []
        i = 0
        while s[i] == "#":
            final_list.append(s[j])
            i += 1
`;

/** After "like this?": the digit scan is in the editor, and nothing after it. */
const CODEC_DIGIT_LOOP = `class Solution:
    def encode(self, strs: List[str]) -> str:
        # chunk = <length><sep><chars>
        # 5#hello5#world
        res = ""
        for s in strs:
            res += str(len(s)) + "#" + s
        return res

    def decode(self, s: str) -> List[str]:
        final_list = []
        i = 0
        while i < len(s):
            j = i
            while s[j] != "#":
                j += 1
`;

/** The editor the user pasted, ending at `i = j + 1`. */
const CODEC_AT_LENGTH = `class Solution:
    def encode(self, strs: List[str]) -> str:
        # chunk = <length><sep><chars>
        # 5#hello5#world
        res = ""
        for s in strs:
            res += str(len(s)) + "#" + s
        return res

    def decode(self, s: str) -> List[str]:
        final_list = []
        i = 0
        while i < len(s):
            j = i
            while s[j] != "#":
                j += 1
            length = int(s[i:j])
            i = j + 1
`;

const CODEC_WHAT_NOW =
  "Okkkay so i did implemented it but still nawh, i dont like the behaviour, infact its more confusing - Okkay so what to do now?";

const CODEC_LIKE_THIS = "like this?";

const CODEC_APPEND_LENGTH =
  "Okkkay but wed have to append the lenth to the final list right?";

const CODEC_TUTOR_WHAT_NOW = `encode in the buffer already produces "5#hello5#world" for ["Hello","World"], so the format is settled. The work left is decode.

Look at what the current decode body has:

- j is used in s[j] but never assigned — that line raises NameError before anything else happens.
- The while condition is testing whether the current character is #. But at the start of a chunk the current character is a digit, not #, so the condition is checking the wrong thing. The thing you actually need to guard is "am I still inside s".
- There is no return final_list.

Here is the shape of the decode walk, using "5#hello5#world":

1. i sits on the first character of a length, here "5". Consume digits into a number until you reach #. That number is 5.
2. Skip the # itself, so i now points at h.
3. The next 5 characters, s[i : i + 5], are exactly "hello" — take them as one string and append to final_list.
4. Move i to i + 5, which lands on the second "5", and repeat.

The outer loop is just while i < len(s). Inside it, the read of the length is its own small loop, because the length can have more than one digit (a string can be 199 characters long, so "199#").

The reason this survives any 256-character payload is exactly the point above: a # or a digit inside a string is never seen by the reader, because after the separator you jump forward by the known count instead of scanning for a marker.

Next: write only the inner loop of decode — the one that consumes digits starting at i into a length variable, advancing i one character at a time until s[i] == "#".`;

const CODEC_TUTOR_LIKE_THIS = `Yes, that loop is exactly the digit scan. Trace it on s = "5#hello5#world" with i = 0:

- j starts at 0, s[0] is "5", not #, so j becomes 1.
- s[1] is #, loop stops.

So now you have two facts sitting next to each other: i is still on the first digit, and j is on the #. The digits are s[i:j] — that slice is "5" here, and for a two-hundred-character string it would be something like "199".

Two things come out of that:

1. Turn those digits into a number: length = int(s[i:j]). That's 5.
2. Step over the separator, so i now points at the first real character of the string: i = j + 1, which puts i on "h".

Once i is on "h" and you know length is 5, the payload is the next five characters, and you move i forward by length to land on the start of the next chunk. That's the whole loop body — the reader never inspects a character inside a string, which is what lets a # live safely inside the payload.

One small note while you're here: j = i inside the loop is right, but keep in mind j must be re-initialized at the top of each outer iteration, which it is.

Next: add the two lines inside the outer loop — length = int(s[i:j]) and i = j + 1 — then tell me what i points at after one pass.`;

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
  id: "hint" | "simplify" | "review" | "debug",
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

function misattributesExample(text: string, userText: string): boolean {
  const flagged =
    /your own example/i.test(text) ||
    /trace your example/i.test(text) ||
    /your example ["'`]/i.test(text);
  if (!flagged) return false;
  // The user typed an input in this question, so "your example" is accurate.
  return !/\[[^\]]+\]|"[^"]+"/.test(userText);
}

function codeBlocks(text: string): string[] {
  return [...text.matchAll(/```(?:python|py)?[^\n]*\n([\s\S]*?)```/gi)].map(
    (match) => match[1] ?? "",
  );
}

function substantialImplementation(code: string): boolean {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  return lines.length >= 6 && /\breturn\b/.test(code) && /\b(for|while)\b/.test(code);
}

function quotesEditor(code: string, editor: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, "");
  const block = compact(code);
  if (block.length < 40) return false;
  return compact(editor).includes(block);
}

/** A fenced implementation of the remaining algorithm, not a quote of the editor. */
function unsolicitedSolution(text: string, editor: string): boolean {
  return codeBlocks(text).some(
    (block) => substantialImplementation(block) && !quotesEditor(block, editor),
  );
}

function hasSubstantialSolution(text: string): boolean {
  return codeBlocks(text).some((block) => substantialImplementation(block));
}

function claimsCurrentEditorReturnedOldPair(text: string): boolean {
  return text.split(/(?<=[.!\n])/).some((sentence) => {
    const aboutNow = /editor|draft|current code|this code|your code/i.test(sentence);
    const oldOutput = /\[0,\s*0\]/.test(sentence);
    const labeledEarlier =
      /earlier|previous|old|submission|before|last run|referenced|judge ran/i.test(
        sentence,
      );
    return aboutNow && oldOutput && !labeledEarlier;
  });
}

function treatsPrintAsReturn(text: string, observation: string): boolean {
  const escaped = observation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(returned output|function returned|it returned|returns|return value)[^\\n.]{0,48}${escaped}`,
    "i",
  ).test(text);
}

type Grade = {
  satisfactory: boolean;
  hardFails: string[];
  misses: string[];
};

type TurnSpec = {
  id: string;
  user: string;
  editorCode: string;
  submission?: SubmissionDetail | null;
  hiddenMarkers?: string[];
  mustMention?: RegExp[];
  mustNot?: RegExp[];
  allowFullSolution?: boolean;
  requireFullSolution?: boolean;
  staleClaim?: (text: string) => boolean;
  printObservation?: string;
  /** Extra behavioral miss. Return a reason, or null when the turn is fine. */
  missIf?: (text: string) => string | null;
  /** History for this turn when the conversation is graded one question at a time. */
  prior?: Array<{ role: "user" | "assistant"; text: string }>;
  /** Recorded on the saved run so a dropped history window is visible. */
  payloadIncludes?: string;
};

type ConversationSpec = {
  id: string;
  slug: "two-sum" | "valid-parentheses" | "encode-and-decode-strings";
  purpose: string;
  prior: Array<{ role: "user" | "assistant"; text: string }>;
  /**
   * Each turn is asked with its own supplied history. The model's reply is
   * not fed into the next turn.
   */
  independent?: boolean;
  turns: TurnSpec[];
};

type TurnResult = {
  id: string;
  user: string;
  text: string;
  latencyMs: number;
  payloadIncludes: boolean | null;
  grade: Grade;
};

type ConversationResult = {
  id: string;
  purpose: string;
  run: number;
  turns: TurnResult[];
};

function gradeTurn(turn: TurnSpec, text: string): Grade {
  const hardFails: string[] = [];
  const misses: string[] = [];

  if (text.trim().length < 40) misses.push("answer is too short to be useful");
  if (/^next:/im.test(text)) misses.push("forced a Next: task");
  if (
    /paste (me )?your code|cannot see your code|can't see your code|can't see the editor/i.test(
      text,
    )
  ) {
    misses.push("asked the user to paste code the editor already attached");
  }
  if (misattributesExample(text, turn.user)) {
    misses.push("calls a case the user's example");
  }
  const extraMiss = turn.missIf?.(text);
  if (extraMiss) misses.push(extraMiss);

  for (const marker of turn.hiddenMarkers ?? []) {
    if (text.includes(marker)) hardFails.push(`leaked hidden data: ${marker.slice(0, 32)}`);
  }

  if (turn.allowFullSolution) {
    if (turn.requireFullSolution && !hasSubstantialSolution(text)) {
      misses.push("explicit full-solution request did not include an implementation");
    }
  } else if (unsolicitedSolution(text, turn.editorCode)) {
    hardFails.push("unsolicited full solution");
  }

  if (turn.staleClaim?.(text)) hardFails.push("stale-result claim");
  if (turn.printObservation && treatsPrintAsReturn(text, turn.printObservation)) {
    misses.push(`treated debug print ${JSON.stringify(turn.printObservation)} as the return value`);
  }

  for (const pattern of turn.mustMention ?? []) {
    if (!pattern.test(text)) misses.push(`missing ${pattern}`);
  }
  for (const pattern of turn.mustNot ?? []) {
    if (pattern.test(text)) misses.push(`unexpected ${pattern}`);
  }

  return {
    satisfactory: hardFails.length === 0 && misses.length === 0,
    hardFails,
    misses,
  };
}

function parensDebugSubmission(): SubmissionDetail {
  const base = parensSubmission();
  return {
    ...base,
    id: "44444444-4444-4444-4444-444444444444",
    source: PARENS_DEBUG,
    cases: base.cases.map((entry) =>
      entry.hidden && entry.status === "wrong_answer"
        ? { ...entry, stdout: "true", debug: "counts 1 1" }
        : entry,
    ),
  };
}

function codecRunSubmission(): SubmissionDetail {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "encode-and-decode-strings",
    language: "python",
    mode: "run",
    runner: "piston",
    verdict: "wrong_answer",
    source: CODEC_PARTIAL,
    passedCount: 0,
    totalCount: 1,
    timeMs: 9,
    memoryKb: 2048,
    catalogRevision: "2026-09-21T00:00:00.000Z",
    requestId: null,
    isRevision: false,
    day: "2026-09-21",
    createdAt: "2026-09-21T00:00:00.000Z",
    testcaseIndex: 0,
    compileOutput: null,
    pistonVersion: "3.12.0",
    cases: [
      {
        index: 0,
        status: "wrong_answer",
        hidden: false,
        input: 'strs = ["hi"]',
        expected: '["hi"]',
        stdout: "null",
        debug: "2 hi",
      },
    ],
  };
}

function loopAgreementHistory(): Array<{ role: "user" | "assistant"; text: string }> {
  const prior: Array<{ role: "user" | "assistant"; text: string }> = [
    {
      role: "user",
      text: "Let's check every pair with nested loops. I know a faster way exists, but I want to write the loops first.",
    },
    {
      role: "assistant",
      text: "Agreed. We will stay with nested loops that compare every pair.",
    },
  ];
  for (let index = 0; index < 9; index += 1) {
    prior.push(
      {
        role: "user",
        text: `Side question ${index}: in Python, does a list index start at 0 or 1?`,
      },
      {
        role: "assistant",
        text: "A list index starts at 0. That detail does not change the plan we already picked.",
      },
    );
  }
  return prior;
}

/** "Do we append the length?" fails when the reply teaches the steps after that answer. */
function appendLengthOverreach(text: string): string | null {
  if (/```/.test(text)) return "answered a conceptual question with code";
  if (/return final_list|missing return|there is no return/i.test(text)) {
    return "reviewed a missing return";
  }
  if (
    /i\s*\+=\s*length|i\s*=\s*i\s*\+\s*length|\bmove i\b|i \+= |past the (?:characters|payload|word)/i.test(
      text,
    )
  ) {
    return "taught advancing i";
  }
  if (
    /loop (?:stops|ends)|when the loop|i == len|reaches len|lands on len/i.test(text)
  ) {
    return "taught outer-loop termination";
  }
  if (/\b(?:add|write|then)\b[^.\n]{0,60}\b(?:append|i \+=|two lines)\b/i.test(text)) {
    return "assigned more than the question";
  }
  return null;
}

/** "Like this?" fails when the reply assigns the lines after the digit scan. */
function likeThisOverreach(text: string): string | null {
  if (/length is already|`length` is already/i.test(text)) {
    return "described a length the editor has not computed";
  }
  if (/return final_list|missing return|there is no return/i.test(text)) {
    return "reviewed a missing return";
  }
  if (/length\s*=\s*int|i\s*=\s*j\s*\+\s*1/.test(text)) {
    return "assigned the next lines";
  }
  return null;
}

/** "What now?" fails when the reply walks the rest of decode or reviews later gaps. */
function whatNowOverreach(text: string): string | null {
  if (/length is already|`length` is already/i.test(text)) {
    return "described a length the editor has not computed";
  }
  if (/return final_list|missing return|there is no return/i.test(text)) {
    return "reviewed a missing return";
  }
  const laterSteps = [
    /consume digits|read (?:the )?digits/i,
    /skip the #|past the #/i,
    /next \d+ characters|s\[i\s*:/i,
    /move i|repeat the|and repeat/i,
  ].filter((pattern) => pattern.test(text)).length;
  if (laterSteps >= 3) return "walked later decode steps instead of one immediate step";
  return null;
}

function codecDecodeTurns(independent: boolean): TurnSpec[] {
  const afterWhatNow = [
    { role: "user" as const, text: CODEC_WHAT_NOW },
    { role: "assistant" as const, text: CODEC_TUTOR_WHAT_NOW },
  ];
  const afterLikeThis = [
    ...afterWhatNow,
    { role: "user" as const, text: CODEC_LIKE_THIS },
    { role: "assistant" as const, text: CODEC_TUTOR_LIKE_THIS },
  ];
  return [
    {
      id: "what-now",
      user: CODEC_WHAT_NOW,
      editorCode: CODEC_CONFUSED,
      prior: independent ? [] : undefined,
      missIf: whatNowOverreach,
    },
    {
      id: "like-this",
      user: CODEC_LIKE_THIS,
      editorCode: CODEC_DIGIT_LOOP,
      prior: independent ? afterWhatNow : undefined,
      missIf: likeThisOverreach,
    },
    {
      id: "append-length",
      user: CODEC_APPEND_LENGTH,
      editorCode: CODEC_AT_LENGTH,
      prior: independent ? afterLikeThis : undefined,
      missIf: appendLengthOverreach,
    },
  ];
}

function conversationSpecs(): ConversationSpec[] {
  const rejectsBruteForce =
    /\b(won't work|will not work|cannot work|can't work|doesn't work|does not work)\b/i;
  const leavesTheLoops =
    /\b(?:next:|instead|switch(?:ing)? to|let's use|we should use)[^\n]{0,80}\b(?:hash map|hashmap|dictionary|complement)\b/i;
  const switchesToCounting =
    /\b(?:next:|instead|let's count|we should count|switch to counting)\b/i;

  return [
    {
      id: "two-sum-handholding",
      slug: "two-sum",
      purpose: "Approach, a proposed brute-force idea, the next step, confusion, then a clarification.",
      prior: [],
      turns: [
        {
          id: "approach",
          user: "What approach should I take? I'm a beginner and I don't know where to start.",
          editorCode: TWO_SUM_STARTER,
          mustMention: [/hash|complement|map|dict|nested|every pair|brute/i],
        },
        {
          id: "propose-loops",
          user: "Can we do it with a nested loop that checks every pair?",
          editorCode: TWO_SUM_STARTER,
          mustMention: [
            /nested|every pair|two loops|brute|for i\b|j from|i\s*\+\s*1/i,
            /slow|quadratic|n\^2|n²|O\(n(?:\^2|\*\*2)\)|10\^4|large/i,
          ],
          mustNot: [rejectsBruteForce],
        },
        {
          id: "what-now",
          user: "Okay let's do the nested loop. What now?",
          editorCode: TWO_SUM_NESTED,
          mustMention: [/loop|pair|\bi\b|\bj\b|index/i],
          mustNot: [leavesTheLoops],
        },
        {
          id: "confused",
          user: "I'm confused.",
          editorCode: TWO_SUM_NESTED,
          mustMention: [/loop|pair|\bi\b|\bj\b|index/i],
          mustNot: [leavesTheLoops],
        },
        {
          id: "clarify",
          user: "Oh so for nums [2, 7] and target 9 I just check whether 2 + 7 is 9?",
          editorCode: TWO_SUM_NESTED,
          mustMention: [/2\s*\+\s*7|\[2,\s*7\]|pair/i, /loop|i\b|j\b|index/i],
          mustNot: [leavesTheLoops],
        },
      ],
    },
    {
      id: "parens-alternative",
      slug: "valid-parentheses",
      purpose: "A valid stack approach, kept when the user floats counting brackets.",
      prior: [],
      turns: [
        {
          id: "propose-stack",
          user: "Can we do this with a stack of opening brackets?",
          editorCode: PARENS_STARTER,
          mustMention: [/stack/i, /\b(yes|works|can|right|valid|do that)\b/i],
        },
        {
          id: "what-now",
          user: "Okay, what now?",
          editorCode: PARENS_STACK,
          mustMention: [/stack/i],
          mustNot: [switchesToCounting],
        },
        {
          id: "counting",
          user: "Wait, would counting each bracket type be better?",
          editorCode: PARENS_STACK,
          mustMention: [/stack/i, /order|\(\[\)\]|sequence|opened/i],
          mustNot: [switchesToCounting],
        },
      ],
    },
    {
      id: "codec-prints",
      slug: "encode-and-decode-strings",
      purpose: "Partial encode with prints and repeated experimental runs.",
      prior: [
        { role: "user", text: "What approach should I take?" },
        {
          role: "assistant",
          text: "Prefix each string with how many characters it has, then a #, then the characters. [\"hi\"] becomes 2#hi. We'll do encode first.",
        },
        { role: "user", text: "2#hi3#bye. I'll do it that way." },
        {
          role: "assistant",
          text: "Yes. Each word gets its own length, then #, then the word, and those chunks are concatenated.",
        },
        { role: "user", text: "I ran it." },
        {
          role: "assistant",
          text: "The plan is still the length prefix. A run is evidence, not a reason to change the approach. Each chunk needs the length, not only the word.",
        },
        { role: "user", text: "I ran it again." },
        {
          role: "assistant",
          text: "Same approach. Another run does not mean the design is wrong. Encode is appending the word alone.",
        },
      ],
      turns: [
        {
          id: "what-now",
          user: "I added some prints and ran it a few more times. What should I do now?",
          editorCode: CODEC_PARTIAL,
          submission: codecRunSubmission(),
          mustMention: [/length|len\(|#|prefix/i],
          mustNot: [/frustrat|another algorithm|different algorithm|give up|start over/i],
          printObservation: "2 hi",
          missIf: (text) => {
            const judgeGotWord = /judge[^.\n]{0,80}\bhi\b/i.test(text);
            const namesReturnedNull = /\bnull\b|\bNone\b/i.test(text);
            return judgeGotWord && !namesReturnedNull
              ? "described the judge result as the word, not the returned null"
              : null;
          },
        },
      ],
    },
    {
      id: "two-sum-stale-result",
      slug: "two-sum",
      purpose: "An old failing result followed by an edited draft.",
      prior: [
        {
          role: "user",
          text: "Why did my submit fail?",
        },
        {
          role: "assistant",
          text: "That submit returned [0, 0]. The editor has changed since then.",
        },
      ],
      turns: [
        {
          id: "draft",
          user: "I changed the draft. What should I do next in this draft?",
          editorCode: TWO_SUM_DRAFT,
          submission: twoSumSubmission(),
          hiddenMarkers: [UNREVEALED_TWO_SUM, "trace-should-not-leak"],
          mustMention: [/seen|complement|enumerate|num/i],
          staleClaim: claimsCurrentEditorReturnedOldPair,
        },
      ],
    },
    {
      id: "parens-debug",
      slug: "valid-parentheses",
      purpose: "An explicit debugging question that should use the returned output, not the print.",
      prior: [],
      turns: [
        {
          id: "why-failing",
          user: "Why is this failing?",
          editorCode: PARENS_DEBUG,
          submission: parensDebugSubmission(),
          hiddenMarkers: [UNREVEALED_PARENS, "parens-trace-should-not-leak"],
          mustMention: [
            /\(\[\)\]|order/i,
            /return(?:ed|s)?[^.\n]{0,40}true|expression is[^.\n]{0,24}true|\btrue\b|counts[^.\n]{0,40}(match|equal)|balanced/i,
            /invalid|\bfalse\b|wrong|not valid|must close|cross/i,
          ],
          printObservation: "counts 1 1",
        },
      ],
    },
    {
      id: "two-sum-long-thread",
      slug: "two-sum",
      purpose: "The agreed nested-loop plan sits beyond the old 16-message window.",
      prior: loopAgreementHistory(),
      turns: [
        {
          id: "recall",
          user: "What approach did we agree on?",
          editorCode: TWO_SUM_STARTER,
          mustMention: [/nested|every pair|two loops|brute/i],
          mustNot: [
            /I (don't|do not) (know|remember)|not sure what we agreed|which approach did you/i,
          ],
          payloadIncludes: "nested loops that compare every pair",
        },
      ],
    },
    {
      id: "two-sum-syntax-then-solution",
      slug: "two-sum",
      purpose: "Tiny syntax help, then an explicit full-solution request.",
      prior: [],
      turns: [
        {
          id: "syntax",
          user: "How do I write a for loop over nums that also gives me the index? I forget the Python syntax.",
          editorCode: TWO_SUM_STARTER,
          mustMention: [/enumerate/i],
        },
        {
          id: "full-solution",
          user: "Okay, now give me the full solution.",
          editorCode: TWO_SUM_STARTER,
          allowFullSolution: true,
          requireFullSolution: true,
          mustMention: [/return/i],
        },
      ],
    },
    {
      id: "codec-decode-independent",
      slug: "encode-and-decode-strings",
      purpose:
        "Each Encode/Decode question is replayed with the supplied history and the editor from that turn.",
      independent: true,
      prior: [],
      turns: codecDecodeTurns(true),
    },
    {
      id: "codec-decode-connected",
      slug: "encode-and-decode-strings",
      purpose:
        "The same Encode/Decode questions in order, with the model's own replies as history.",
      prior: [],
      turns: codecDecodeTurns(false),
    },
  ];
}

const RUNS = Number(process.env.CHAT_SMOKE_RUNS ?? "3");
const LIVE_CONCURRENCY = 3;

async function askModel(
  assembled: AssembledTutorTurn,
): Promise<{ text: string; latencyMs: number }> {
  const { deepseek } = await import("@ai-sdk/deepseek");
  const { convertToModelMessages, generateText } = await import("ai");
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = Date.now();
    try {
      const result = await generateText({
        model: deepseek(LIVE_MODEL),
        instructions: assembled.instructions,
        messages: await convertToModelMessages(assembled.messages),
      });
      return { text: result.text.trim(), latencyMs: Date.now() - started };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await fn(item);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function runConversation(
  spec: ConversationSpec,
  problems: Record<ConversationSpec["slug"], Problem>,
  language: Language,
  run: number,
): Promise<ConversationResult> {
  const problem = problems[spec.slug];
  const toMessages = (
    prior: Array<{ role: "user" | "assistant"; text: string }>,
    prefix: string,
  ): TutorUIMessage[] =>
    prior.map((message, index) =>
      message.role === "user"
        ? userTurn(`${prefix}-p${index}`, message.text)
        : assistantTurn(`${prefix}-p${index}`, message.text),
    );

  let history = toMessages(spec.prior, `${spec.id}-r${run}`);
  const turns: TurnResult[] = [];

  for (const turn of spec.turns) {
    const base = spec.independent
      ? toMessages(turn.prior ?? [], `${spec.id}-r${run}-${turn.id}`)
      : history;
    const withUser = [
      ...base,
      userTurn(`${spec.id}-r${run}-${turn.id}`, turn.user),
    ];
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: turn.editorCode,
      submission: turn.submission ?? null,
      history: withUser,
    });
    const payload = tutorPayloadText(assembled);
    const answer = await askModel(assembled);
    const grade = gradeTurn(turn, answer.text);
    turns.push({
      id: turn.id,
      user: turn.user,
      text: answer.text,
      latencyMs: answer.latencyMs,
      payloadIncludes: turn.payloadIncludes ? payload.includes(turn.payloadIncludes) : null,
      grade,
    });
    if (!spec.independent) {
      history = [
        ...withUser,
        assistantTurn(`${spec.id}-r${run}-${turn.id}-a`, answer.text),
      ];
    }
  }

  return { id: spec.id, purpose: spec.purpose, run, turns };
}

function summarize(results: ConversationResult[]): {
  satisfactory: number;
  total: number;
  hardFails: number;
} {
  const graded = results.flatMap((result) => result.turns);
  return {
    satisfactory: graded.filter((turn) => turn.grade.satisfactory).length,
    total: graded.length,
    hardFails: graded.reduce((count, turn) => count + turn.grade.hardFails.length, 0),
  };
}

async function main(): Promise<void> {
  const twoSum = await getProblem("two-sum");
  const parens = await getProblem("valid-parentheses");
  const codec = await getProblem("encode-and-decode-strings");
  if (!twoSum || !parens || !codec) {
    throw new Error(
      "two-sum, valid-parentheses, and encode-and-decode-strings must be in the database. Run: pnpm db:migrate && pnpm db:seed",
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
    "hint quick-action asks for one immediate step",
    partialPayload.includes("one immediate step"),
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
    "instructions stay on the same concept when the user is confused",
    followUpPayload.includes("Stay on the same concept") &&
      followUpPayload.includes("Do not switch algorithms between turns"),
  );
  recordFalse(
    "follow-up does not leak unrevealed parentheses success",
    followUpPayload.includes(UNREVEALED_PARENS),
  );

  const approachQuestion =
    "what approach to take here? Im confused where to start with";
  const codecAsked = assembleTutorTurn({
    problem: codec,
    language,
    editorCode: ENCODE_BUFFER,
    history: [userTurn("c1", approachQuestion)],
  });
  const codecPayload = tutorPayloadText(codecAsked);

  console.log("\nPrompt payload — Encode and Decode Strings, empty encode");
  recordTrue(
    "attempt state marks the empty encode body",
    codecPayload.includes("- encode: defined; body is empty"),
  );
  recordTrue(
    "attempt state marks the started decode",
    codecPayload.includes("- decode: defined; body has statements"),
  );
  recordTrue(
    "the chunk-format comment already in the buffer is attached",
    codecPayload.includes("# chunk = <length><sep><chars>"),
  );
  recordTrue(
    "instructions forbid re-asking for work the buffer already shows",
    codecPayload.includes("Never ask for work the buffer already shows"),
  );
  recordTrue(
    "instructions answer the question and then stop",
    codecPayload.includes("Answer the question they just asked, then stop"),
  );
  recordFalse(
    "instructions do not require a closing Next: action",
    codecPayload.includes("starts with `Next:`"),
  );
  recordTrue(
    "attempt state stays advisory about a non-empty body",
    codecPayload.includes("does not mean the method is implemented or understood"),
  );
  recordTrue(
    "instructions tell the tutor to use prints as observations",
    codecPayload.includes("Debug prints are observations"),
  );
  recordTrue(
    "instructions do not treat repeated runs as a reason to switch",
    codecPayload.includes("repeated runs"),
  );

  const longHistory = Array.from({ length: 20 }, (_, index) =>
    index % 2 === 0
      ? userTurn(`long-${index}`, `turn ${index} nested loops that compare every pair`)
      : assistantTurn(`long-${index}`, `ack ${index}`),
  );
  longHistory.push(userTurn("long-q", "What approach did we agree on?"));
  const longThread = assembleTutorTurn({
    problem: twoSum,
    language,
    editorCode: TWO_SUM_STARTER,
    history: longHistory,
  });
  const longPayload = tutorPayloadText(longThread);

  console.log("\nPrompt payload — thread longer than the old 16-message window");
  recordTrue(
    "a 21-message thread keeps the opening agreement",
    longPayload.includes("turn 0 nested loops that compare every pair"),
  );
  recordTrue(
    "a 21-message thread is not described as omitted",
    !longPayload.includes("Earlier conversation turns were omitted"),
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

  const label = process.env.CHAT_SMOKE_LABEL ?? "revised";
  const gate = process.env.CHAT_SMOKE_GATE !== "0";
  const problems = {
    "two-sum": twoSum,
    "valid-parentheses": parens,
    "encode-and-decode-strings": codec,
  } as const;
  const specs = conversationSpecs();
  const jobs = specs.flatMap((spec) =>
    Array.from({ length: RUNS }, (_, index) => ({ spec, run: index + 1 })),
  );

  console.log(`\nLive conversations (${LIVE_MODEL}, ${RUNS} runs, label ${label})`);
  const results = await mapPool(jobs, LIVE_CONCURRENCY, (job) =>
    runConversation(job.spec, problems, language, job.run),
  );

  for (const result of results) {
    const score = summarize([result]);
    const codec = result.id.startsWith("codec-decode");
    console.log(`\n${result.id} run ${result.run}: keyword ${score.satisfactory}/${score.total}`);
    for (const turn of result.turns) {
      const mark = turn.grade.hardFails.length > 0 ? "HARD" : turn.grade.satisfactory ? "ok" : "note";
      console.log(`  ${mark}  ${turn.id}  ${turn.latencyMs}ms`);
      if (!turn.grade.satisfactory || codec) {
        for (const reason of [...turn.grade.hardFails, ...turn.grade.misses]) {
          console.log(`        ${reason}`);
        }
        const preview =
          codec || turn.text.length <= 900 ? turn.text : `${turn.text.slice(0, 900)}…`;
        console.log(preview.replaceAll("\n", "\n        "));
      }
    }
  }

  const totals = summarize(results);
  const outDir = path.join(process.cwd(), "docs", "plan", "evals");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `tutor-consistency-${label}.json`);
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        model: LIVE_MODEL,
        label,
        generatedAt: new Date().toISOString(),
        teachingQuality:
          "Not a keyword score. Review the codec-decode transcripts against the editor snapshots.",
        keywordLog: { clean: totals.satisfactory, total: totals.total },
        hardFails: totals.hardFails,
        runs: results,
      },
      null,
      2,
    ),
  );
  console.log(`\nSaved ${outFile}`);
  console.log(
    `Keyword log ${totals.satisfactory}/${totals.total} clean. This is not a teaching-quality score. Hard fails ${totals.hardFails}.`,
  );

  if (gate) {
    recordTrue(
      `no unsolicited full solutions, hidden-data leaks, or stale-result claims`,
      totals.hardFails === 0,
    );
  }
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
