import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CODE_CONTEXT_LIMIT, CONVERSATION_MESSAGE_LIMIT } from "@/lib/ai/prompts";
import type { TutorUIMessage } from "@/lib/chat/types";
import { getLanguage } from "@/lib/languages";
import { emptyPersonalNotes, type PersonalNotes } from "@/lib/practice/notes";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

import { buildNotesDraftPrompt, notesSessionIsEmpty } from "./notes-prompt";

/**
 * What the notes prompt may contain.
 *
 * These fixtures are deliberately suspicious: the catalog guidance, the
 * reference solution, and an unrevealed hidden success each carry a sentinel
 * that must never reach the model. A failed hidden case is the one failure the
 * workbench reveals, so its input is expected to appear.
 */

const language = getLanguage("python");

const REFERENCE_SOURCE =
  "class Solution:\n    def twoSum(self, nums, target):\n        return official_lookup\n";

const problem: Problem = {
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  difficulty: "easy",
  topic: "Arrays & Hashing",
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
    { stdin: "VISIBLE_SUITE_ONLY nums = [1,2] target = 3", expected: "[0,1]" },
  ],
  starterCode: {
    python:
      "class Solution:\n    def twoSum(self, nums, target):\n        pass\n",
  },
  notes: {
    approach: "CATALOG_GUIDANCE hash each complement as you scan.",
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

const starter = problem.starterCode.python;

const editorDraft = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
`;

const submittedSource = `class Solution:
    def twoSum(self, nums, target):
        return [0, 0]  # EDITOR_AND_SUBMISSION_DIFFER
`;

const HIDDEN_SUCCESS_INPUT = "SECRET_UNREVEALED_HIDDEN_SUCCESS nums = [0,0]";
const HIDDEN_FAILURE_INPUT = "nums = [3,3]\ntarget = 6";

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

function message(
  id: string,
  role: TutorUIMessage["role"],
  text: string,
  completionStatus: "completed" | "pending" | "failed" | "aborted" = "completed",
): TutorUIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
    metadata: { completionStatus },
  };
}

const notes: PersonalNotes = {
  approach: "Remember each value in a dict keyed by the number itself.",
  steps: "scan once, check the complement, then store the index",
  pitfalls: "I stored the index after the check and missed the same element twice.",
  timeComplexity: "O(n)",
  spaceComplexity: "O(n)",
};

describe("buildNotesDraftPrompt", () => {
  it("carries the statement, the editor, and the user's own notes", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes,
      messages: [message("u1", "user", "Why is my loop skipping the last index?")],
      submission: null,
    });

    assert.match(text, /Return the indices of the two numbers/);
    assert.match(text, /2 <= nums\.length/);
    assert.match(text, /nums = \[2,7,11,15\], target = 9/);
    assert.match(text, /Current editor:/);
    assert.match(text, /target - n in seen/);
    assert.match(text, /Current personal notes:/);
    assert.match(text, /Remember each value in a dict/);
    assert.match(text, /stored the index after the check/);
    assert.match(text, /Tutor: |You: /);
    assert.match(text, /No stored attempt is attached\./);
  });

  it("never sends catalog guidance or a reference solution", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [],
      submission: submission(),
    });

    assert.equal(text.includes(problem.notes.approach), false);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("keeps a successful hidden case status-only and reveals only the failure", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [],
      submission: submission(),
    });

    assert.equal(text.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(text.includes("trace-should-not-leak"), false);
    assert.equal(text.includes("stderr-should-not-leak"), false);
    assert.match(text, /Hidden case 1: accepted\./);
    assert.match(text, /Revealed hidden case 2: wrong_answer/);
    assert.match(text, /nums = \[3,3\]/);
    assert.match(text, /debug saw 3 and 3/);
  });

  it("labels a failed attempt honestly and keeps it apart from the editor", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [],
      submission: submission(),
    });

    assert.match(text, /Not a verified solve\. Verdict wrong_answer/);
    assert.match(text, /editor has changed since this run/);
    assert.match(text, /Submitted source:/);
    assert.equal(text.includes("EDITOR_AND_SUBMISSION_DIFFER"), true);
  });

  it("calls verified working code a verified working submit", () => {
    const verified = submission({
      verdict: "accepted",
      mode: "submit",
      runner: "piston",
      source: editorDraft,
      passedCount: 3,
      cases: [],
    });
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [],
      submission: verified,
    });

    assert.match(text, /Verified working submit/);
    assert.match(text, /editor still holds the code this result came from/);
  });

  it("drops an assistant turn that never finished", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [
        message("u1", "user", "Is the dict keyed by the number?"),
        message("a1", "assistant", "Yes, and the value is the index.", "completed"),
        message("a2", "assistant", "HALF_WRITTEN_REPLY", "pending"),
        message("a3", "assistant", "FAILED_REPLY", "failed"),
        message("a4", "assistant", "ABORTED_REPLY", "aborted"),
      ],
      submission: null,
    });

    assert.match(text, /Yes, and the value is the index\./);
    assert.equal(text.includes("HALF_WRITTEN_REPLY"), false);
    assert.equal(text.includes("FAILED_REPLY"), false);
    assert.equal(text.includes("ABORTED_REPLY"), false);
  });

  it("bounds a large editor buffer and a long conversation", () => {
    const huge = `${"# padding\n".repeat(600)}LAST_LINE`;
    assert.ok(huge.length > CODE_CONTEXT_LIMIT);

    const many: TutorUIMessage[] = [];
    for (let index = 0; index < CONVERSATION_MESSAGE_LIMIT + 12; index += 1) {
      many.push(message(`m${index}`, "user", `message number ${index}`));
      many.push(message(`a${index}`, "assistant", `reply number ${index}`));
    }

    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: huge,
      notes: emptyPersonalNotes(),
      messages: many,
      submission: null,
    });

    assert.match(text, /truncated \(\d+ more characters\)/);
    assert.equal(text.includes("LAST_LINE"), false);
    assert.equal(text.includes("message number 0"), false);
    assert.match(text, /Earlier messages were dropped to fit the context budget/);
  });

  it("bounds the user's own notes and a disclosed case field", () => {
    const longNotes: PersonalNotes = {
      ...emptyPersonalNotes(),
      approach: "n".repeat(3_000),
    };
    const longCase = submission({
      cases: [
        {
          index: 0,
          status: "wrong_answer",
          hidden: true,
          input: `nums = [${"9".repeat(4_000)}]`,
          expected: "[0,1]",
          stdout: "[]",
        },
      ],
    });

    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: longNotes,
      messages: [],
      submission: longCase,
    });

    assert.match(text, /truncated \(\d+ more characters\)/);
    assert.equal(text.includes("n".repeat(2_500)), false);
    assert.equal(text.includes("9".repeat(2_500)), false);
    assert.match(text, /Key idea: n{100}/);
  });

  it("asks for a memory aid, not a solution, and allows blank fields", () => {
    const text = buildNotesDraftPrompt({
      problem,
      language,
      source: editorDraft,
      notes: emptyPersonalNotes(),
      messages: [],
      submission: null,
    });

    assert.match(text, /roughly 150–250 words/);
    assert.match(text, /Summarize the approach actually discussed or attempted/);
    assert.match(text, /Leave a field blank when it is not supported/);
    assert.match(text, /Do not include a full solution or a complete code listing/);
    assert.match(text, /Do not describe a failed attempt as a solution that works/);
    assert.match(text, /do not substitute a generic textbook approach/i);
  });
});

describe("notesSessionIsEmpty", () => {
  const base = {
    starter,
    source: starter,
    notes: emptyPersonalNotes(),
    messages: [] as TutorUIMessage[],
    submission: null,
  };

  it("is empty for an untouched starter, blank notes, and no session", () => {
    assert.equal(notesSessionIsEmpty(base), true);
    assert.equal(
      notesSessionIsEmpty({
        ...base,
        messages: [message("a1", "assistant", "   ")],
      }),
      true,
    );
  });

  it("is not empty once the buffer moved, notes exist, or a run was stored", () => {
    assert.equal(
      notesSessionIsEmpty({ ...base, source: `${starter}\n# moved` }),
      false,
    );
    assert.equal(
      notesSessionIsEmpty({ ...base, notes: { ...notes, steps: "" } }),
      false,
    );
    assert.equal(
      notesSessionIsEmpty({
        ...base,
        messages: [message("u1", "user", "what does the inner loop do?")],
      }),
      false,
    );
    assert.equal(notesSessionIsEmpty({ ...base, submission: submission() }), false);
  });
});
