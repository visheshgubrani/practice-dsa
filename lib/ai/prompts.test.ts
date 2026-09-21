import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TutorUIMessage } from "@/lib/chat/types";
import { getLanguage } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

import {
  assembleTutorTurn,
  boundConversation,
  buildTutorInstructions,
  buildTutorPrompt,
  buildWorkspaceContext,
  CODE_CONTEXT_LIMIT,
  CONVERSATION_MESSAGE_LIMIT,
  discloseCaseForTutor,
  firstFailingCase,
} from "./prompts";

const language = getLanguage("python");

const problem: Problem = {
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  difficulty: "easy",
  tags: ["array", "hash-map"],
  statement: "Return the indices of the two numbers that add up to target.",
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "2 + 7 = 9",
    },
  ],
  constraints: ["2 <= nums.length <= 10^4"],
  testcases: [
    {
      stdin: "VISIBLE_SUITE_ONLY nums = [1,2] target = 3",
      expected: "[0,1]",
    },
  ],
  starterCode: {
    python: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n",
  },
  notes: {
    approach: "Hash each complement as you scan.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "twoSum",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int[]",
  },
};

const HIDDEN_SUCCESS_INPUT = "SECRET_UNREVEALED_HIDDEN_SUCCESS nums = [0,0] target = 0";
const HIDDEN_FAILURE_INPUT = "nums = [3,3]\ntarget = 6";
const REFERENCE_SOURCE = "class Solution:\n    def twoSum(self, nums, target):\n        return official\n";

const submittedSource = `class Solution:
    def twoSum(self, nums, target):
        return [0, 0]
`;

const editorDraft = `class Solution:
    def twoSum(self, nums, target):
        return [1, 1]
`;

function submission(
  overrides: Partial<SubmissionDetail> = {},
): SubmissionDetail {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "two-sum",
    language: "python",
    mode: "submit",
    runner: "piston",
    verdict: "wrong_answer",
    source: submittedSource,
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
        input: HIDDEN_SUCCESS_INPUT,
        expected: "[0,1]",
        stdout: "[0,1]",
        debug: "trace-should-not-leak",
        stderr: "stderr-should-not-leak",
      },
      {
        index: 1,
        status: "wrong_answer",
        hidden: true,
        input: HIDDEN_FAILURE_INPUT,
        expected: "[0,1]",
        stdout: "[]",
        debug: "saw 3 and 3",
        stderr: "",
      },
    ],
    ...overrides,
  };
}

function turn(id: string, role: TutorUIMessage["role"], text: string): TutorUIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
    metadata: { completionStatus: "completed" },
  };
}

describe("buildTutorInstructions", () => {
  it("sends statement, constraints, official examples, and approach notes — not a solution source", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Return the indices of the two numbers/);
    assert.match(text, /2 <= nums\.length/);
    assert.match(text, /Official examples from the problem statement/);
    assert.match(text, /nums = \[2,7,11,15\], target = 9/);
    assert.match(text, /Hash each complement as you scan/);
    assert.match(text, /twoSum\(nums: int\[\], target: int\) -> int\[\]/);
    assert.match(text, /Never paste a complete working solution unless the user explicitly asks/);
    assert.match(text, /Always label them as your own examples/);
    assert.match(text, /not the reference-solution source/);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });
});

describe("discloseCaseForTutor", () => {
  it("strips payload from a hidden success even if the caller left it on the object", () => {
    const leaked = submission().cases[1];
    assert.ok(leaked);
    assert.equal(discloseCaseForTutor(leaked).input, undefined);
    assert.equal(discloseCaseForTutor(leaked).expected, undefined);
    assert.equal(discloseCaseForTutor(leaked).stdout, undefined);
    assert.equal(discloseCaseForTutor(leaked).debug, undefined);
    assert.equal(discloseCaseForTutor(leaked).stderr, undefined);
  });

  it("keeps the first failing hidden case intact", () => {
    const failing = firstFailingCase(submission().cases);
    assert.equal(failing?.hidden, true);
    assert.equal(failing?.input, HIDDEN_FAILURE_INPUT);
    assert.equal(discloseCaseForTutor(failing!).input, HIDDEN_FAILURE_INPUT);
  });
});

describe("buildWorkspaceContext", () => {
  it("attaches the submission source, structured verdict, and revealed failing case", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      language,
      editorCode: editorDraft,
      submission: submission(),
    });

    assert.equal(editorMatchesAttempt, false);
    assert.match(text, /The editor has changed since this result/);
    assert.match(text, /return \[1, 1\]/);
    assert.match(text, /return \[0, 0\]/);
    assert.match(text, /Verdict: Wrong Answer · submit · piston · 1\/3/);
    assert.match(text, /First failing case/);
    assert.match(text, /Hidden 2/);
    assert.match(text, /nums = \[3,3\]/);
    assert.match(text, /Expected:/);
    assert.match(text, /\[0,1\]/);
    assert.match(text, /Output:/);
    assert.equal(text.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(text.includes("trace-should-not-leak"), false);
    assert.equal(text.includes("stderr-should-not-leak"), false);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("says when the editor still matches the judged source", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      language,
      editorCode: submittedSource,
      submission: submission(),
    });

    assert.equal(editorMatchesAttempt, true);
    assert.match(text, /identical to the submission source below/);
    assert.equal(text.includes("The editor has changed since this result"), false);
    assert.match(text, /return \[0, 0\]/);
  });

  it("falls back to a console summary when no submission is attached", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      language,
      editorCode: editorDraft,
      runSummary: "Wrong Answer · 0/1",
    });

    assert.equal(editorMatchesAttempt, null);
    assert.match(text, /Most recent console summary/);
    assert.match(text, /Wrong Answer · 0\/1/);
    assert.match(text, /return \[1, 1\]/);
  });
});

describe("assembleTutorTurn", () => {
  it("puts the revealed failing case and submitted source in the payload, never unrevealed cases", () => {
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: editorDraft,
      submission: submission(),
      runSummary: "should not appear once a submission is attached",
      history: [
        turn("u1", "user", "why does this fail?"),
        turn("a1", "assistant", "Look at the pair that uses the same index."),
      ],
    });

    assert.match(assembled.instructions, /return \[0, 0\]/);
    assert.match(assembled.instructions, /First failing case/);
    assert.match(assembled.instructions, /nums = \[3,3\]/);
    assert.match(assembled.instructions, /Hash each complement as you scan/);
    assert.equal(assembled.messages[0]?.id, "u1");
    assert.equal(
      assembled.instructions.includes("should not appear once a submission is attached"),
      false,
    );
    assert.equal(assembled.instructions.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(assembled.instructions.includes("trace-should-not-leak"), false);
    assert.equal(assembled.instructions.includes("stderr-should-not-leak"), false);
    assert.equal(assembled.instructions.includes(REFERENCE_SOURCE), false);
    assert.equal(assembled.instructions.includes("VISIBLE_SUITE_ONLY"), false);
  });
});

describe("buildTutorPrompt", () => {
  it("explains truncation of code and omitted conversation turns", () => {
    const long = "x".repeat(CODE_CONTEXT_LIMIT + 40);
    const { instructions, truncated } = buildTutorPrompt({
      problem,
      language,
      editorCode: long,
      conversationTruncated: true,
      omittedTurns: 4,
    });

    assert.equal(truncated, true);
    assert.match(instructions, /truncated \(40 more characters\)/);
    assert.match(instructions, /Earlier conversation turns were omitted \(4 messages\)/);
    assert.match(instructions, /Context budget/);
  });
});

describe("boundConversation", () => {
  it("keeps the newest turns and reports how many were omitted", () => {
    const messages = Array.from({ length: CONVERSATION_MESSAGE_LIMIT + 4 }, (_, index) =>
      turn(`m${index}`, index % 2 === 0 ? "user" : "assistant", `turn ${index}`),
    );
    const bounded = boundConversation(messages);

    assert.equal(bounded.truncated, true);
    assert.equal(bounded.omitted, 4);
    assert.equal(bounded.messages.length, CONVERSATION_MESSAGE_LIMIT);
    assert.equal(bounded.messages[0]?.id, "m4");
    assert.equal(bounded.messages.at(-1)?.id, `m${messages.length - 1}`);
  });

  it("drops a leading assistant leftover so the model thread starts on a user turn", () => {
    const bounded = boundConversation([
      turn("a0", "assistant", "stale"),
      turn("u1", "user", "why this"),
    ]);
    assert.equal(bounded.messages[0]?.role, "user");
    assert.equal(bounded.messages.length, 1);
  });
});
