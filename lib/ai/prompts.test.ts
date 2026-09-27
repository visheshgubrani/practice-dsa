import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { messageText } from "@/lib/chat/messages";
import type { TutorUIMessage } from "@/lib/chat/types";
import { getLanguage } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

import { ATTEMPT_STATE_HEADER } from "./attempt";
import {
  assembleTutorTurn,
  boundConversation,
  buildDemoAnswer,
  buildTutorInstructions,
  buildTutorPrompt,
  buildWorkspaceContext,
  CODE_CONTEXT_LIMIT,
  CONVERSATION_CHAR_LIMIT,
  CONVERSATION_MESSAGE_LIMIT,
  DEMO_MODE_DISCLAIMER,
  discloseCaseForTutor,
  firstFailingCase,
  QUICK_ACTIONS,
  tutorPayloadText,
  WORKBENCH_CONTEXT_PREAMBLE,
} from "./prompts";

const language = getLanguage("python");

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

const incompleteEditor = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, n in enumerate(nums):
            if
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
    assert.match(text, /one valid approach, not the only acceptable solution/);
    assert.match(text, /work in progress/);
    assert.match(text, /the failing test case/);
    assert.match(text, /the statement example/);
    assert.match(text, /consider this illustrative input/);
    assert.match(text, /exactly right/);
    assert.match(text, /you're close/);
    assert.match(text, /pairing map/);
    assert.match(text, /next unasked stage of the algorithm/);
    assert.match(text, /not the reference-solution source/);
    assert.match(text, /never ask them to paste the editor/i);
    assert.equal(text.includes("Always label them as your own examples"), false);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("answers the question and stops, in plain words, without a Next: line", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Answer the question they just asked, then stop/);
    assert.match(text, /one or two short paragraphs/);
    assert.match(text, /There is no word cap/);
    assert.match(text, /tiny Python snippet/);
    assert.match(text, /conceptual misunderstanding does not need code/);
    assert.match(text, /large snippet or as detailed pseudocode/);
    assert.match(text, /Write plainly/);
    assert.match(text, /keep that example's values and casing/);
    assert.match(text, /Tracing what the code would do/);
    assert.match(text, /missing return/);
    assert.match(text, /Do not end with a `Next:` line/);
    assert.match(text, /Do we append the length\?/);
    assert.match(text, /Like this\?/);
    assert.match(text, /What now\?/);
    assert.match(text, /What's the overall approach\?/);
    assert.match(text, /What approach should I take\?/);
    assert.match(text, /Can we do it this way\?/);
    assert.match(text, /I'm confused\./);
    assert.match(text, /The 5 stays out/);
    assert.equal(text.includes("starts with `Next:`"), false);
    assert.equal(text.includes("End every reply"), false);
    assert.equal(text.includes("under about 120 words"), false);
    assert.equal(text.includes("one idea only"), false);
    assert.equal(text.includes("three facts, give all three"), false);
  });

  it("forbids re-asking for a step the buffer or attempt state already shows", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Before you refer to a step, check the attached buffer/);
    assert.match(text, /Never ask for work the buffer already shows/);
    assert.match(text, /A comment edit is not progress unless there is no code/);
    assert.match(text, /attempt-state block is advisory/);
    assert.match(text, /does not mean the method is implemented or understood/);
    assert.match(text, /Never read the block back/);
  });

  it("stays on the agreed approach and on the same concept when the user is confused", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Do not switch algorithms between turns/);
    assert.match(text, /Stay on the same concept/);
    assert.match(text, /Reusing an example is allowed when it helps/);
    assert.match(text, /repeated runs/);
    assert.match(text, /Debug prints are observations/);
    assert.match(text, /do not replace it with a value you inferred/);
    assert.match(text, /ask one focused question instead of inventing the agreement/);
    assert.equal(text.includes("Drop one level"), false);
    assert.equal(text.includes("change the angle, not the volume"), false);
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
      problem,
      language,
      editorCode: editorDraft,
      submission: submission(),
    });

    assert.equal(editorMatchesAttempt, false);
    assert.match(text, /from an earlier version, not the current editor/);
    assert.match(text, /Do not claim the current editor produced this result/);
    assert.match(text, /Treat the editor as work in progress if it is incomplete/);
    assert.match(text, /return \[1, 1\]/);
    assert.match(text, /return \[0, 0\]/);
    assert.match(text, /Verdict: Wrong Answer · submit · piston · 1\/3/);
    assert.match(text, /First failing case/);
    assert.match(text, /Hidden 2/);
    assert.match(text, /failing test case or the revealed hidden case/);
    assert.match(text, /never the user's example/);
    assert.match(text, /nums = \[3,3\]/);
    assert.match(text, /Expected:/);
    assert.match(text, /\[0,1\]/);
    assert.match(text, /Returned output:/);
    assert.match(text, /Debug prints:/);
    assert.match(text, /saw 3 and 3/);
    assert.match(text, /not the intended return value/);
    assert.equal(text.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(text.includes("trace-should-not-leak"), false);
    assert.equal(text.includes("stderr-should-not-leak"), false);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("says when the editor still matches the judged source", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      problem,
      language,
      editorCode: submittedSource,
      submission: submission(),
    });

    assert.equal(editorMatchesAttempt, true);
    assert.match(text, /matches the referenced result below/);
    assert.equal(text.includes("from an earlier version"), false);
    assert.match(text, /return \[0, 0\]/);
  });

  it("falls back to a console summary when no submission is attached", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      problem,
      language,
      editorCode: editorDraft,
      runSummary: "Wrong Answer · 0/1",
    });

    assert.equal(editorMatchesAttempt, null);
    assert.match(text, /Latest console summary/);
    assert.match(text, /Repeated runs are not a signal of frustration/);
    assert.match(text, /Wrong Answer · 0\/1/);
    assert.match(text, /return \[1, 1\]/);
  });

  it("keeps incomplete editor code distinct from a previously submitted attempt", () => {
    const { text, editorMatchesAttempt } = buildWorkspaceContext({
      problem,
      language,
      editorCode: incompleteEditor,
      submission: submission(),
    });

    assert.equal(editorMatchesAttempt, false);
    assert.match(text, /for i, n in enumerate\(nums\):/);
    assert.match(text, /            if\n/);
    assert.match(text, /return \[0, 0\]/);
    assert.match(text, /from an earlier version, not the current editor/);
    assert.match(text, /Treat the editor as work in progress if it is incomplete/);
    assert.match(text, /never the user's example/);
    assert.equal(text.includes(HIDDEN_SUCCESS_INPUT), false);
  });

  it("states the computed attempt state so the tutor stops re-asking for done work", () => {
    const { text } = buildWorkspaceContext({
      problem,
      language,
      editorCode: incompleteEditor,
    });

    assert.equal(text.includes(ATTEMPT_STATE_HEADER), true);
    assert.match(text, /- twoSum: defined; body has statements/);
    assert.match(text, /Never read this block back/);
    assert.match(text, /does not mean the method is implemented or understood/);
  });

  it("reads a pass-only method body as empty", () => {
    const { text } = buildWorkspaceContext({
      problem,
      language,
      editorCode: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n",
    });

    assert.match(text, /- twoSum: defined; body is empty/);
  });

  it("omits the attempt state when there is no buffer to read", () => {
    const { text } = buildWorkspaceContext({
      problem,
      language,
      editorCode: "",
    });

    assert.match(text, /Current editor buffer: empty\./);
    assert.equal(text.includes(ATTEMPT_STATE_HEADER), false);
  });
});

describe("assembleTutorTurn", () => {
  it("puts the live editor and revealed failing case on the last user message, never unrevealed cases", () => {
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

    const lastUser = assembled.messages.findLast(
      (message) => message.role === "user",
    );
    assert.ok(lastUser);
    const lastUserText = messageText(lastUser.parts);
    assert.match(lastUserText, /^why does this fail\?/);
    assert.equal(lastUserText.includes(WORKBENCH_CONTEXT_PREAMBLE), true);
    assert.match(lastUserText, /return \[1, 1\]/);
    assert.match(lastUserText, /return \[0, 0\]/);
    assert.match(lastUserText, /First failing case/);
    assert.match(lastUserText, /never the user's example/);
    assert.match(lastUserText, /nums = \[3,3\]/);
    assert.equal(lastUserText.includes("should not appear once a submission is attached"), false);

    assert.match(assembled.instructions, /Hash each complement as you scan/);
    assert.match(assembled.instructions, /never ask them to paste the editor/i);
    assert.equal(assembled.instructions.includes("return [1, 1]"), false);
    assert.equal(assembled.messages[0]?.id, "u1");

    const payload = tutorPayloadText(assembled);
    assert.equal(payload.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(payload.includes("trace-should-not-leak"), false);
    assert.equal(payload.includes("stderr-should-not-leak"), false);
    assert.equal(payload.includes(REFERENCE_SOURCE), false);
    assert.equal(payload.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("does not invite a paste when the editor buffer is attached", () => {
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: editorDraft,
      history: [turn("u1", "user", "Review my code.")],
    });

    const lastUser = assembled.messages.findLast(
      (message) => message.role === "user",
    );
    assert.ok(lastUser);
    const lastUserText = messageText(lastUser.parts);
    assert.match(lastUserText, /return \[1, 1\]/);
    assert.match(lastUserText, /Do not ask them to paste it unless the buffer is empty/);
    assert.match(assembled.instructions, /never ask them to paste the editor/i);
    assert.equal(assembled.instructions.includes("return [1, 1]"), false);
  });

  it("falls back to instructions when there is no user turn yet", () => {
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: editorDraft,
      history: [],
    });
    assert.match(assembled.instructions, /return \[1, 1\]/);
    assert.equal(assembled.messages.length, 0);
  });

  it("attaches unfinished editor code as the current attempt, not as a judged example", () => {
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: incompleteEditor,
      submission: submission(),
      history: [turn("u1", "user", "Give me a hint.")],
    });

    const lastUser = assembled.messages.findLast(
      (message) => message.role === "user",
    );
    assert.ok(lastUser);
    const lastUserText = messageText(lastUser.parts);
    assert.match(lastUserText, /including unfinished work/);
    assert.match(lastUserText, /for i, n in enumerate\(nums\):/);
    assert.match(lastUserText, /return \[0, 0\]/);
    assert.match(lastUserText, /Treat the editor as work in progress if it is incomplete/);
    assert.match(assembled.instructions, /work in progress/);
    assert.match(assembled.instructions, /consider this illustrative input/);
    assert.equal(assembled.instructions.includes("Always label them as your own examples"), false);

    const payload = tutorPayloadText(assembled);
    assert.equal(payload.includes(HIDDEN_SUCCESS_INPUT), false);
    assert.equal(payload.includes("trace-should-not-leak"), false);
  });
});

describe("buildTutorPrompt", () => {
  it("explains truncation of code and omitted conversation turns", () => {
    const long = "x".repeat(CODE_CONTEXT_LIMIT + 40);
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: long,
      history: [turn("u1", "user", "hint please")],
    });
    const extra = Array.from({ length: CONVERSATION_MESSAGE_LIMIT + 4 }, (_, index) =>
      turn(`m${index}`, index % 2 === 0 ? "user" : "assistant", `turn ${index}`),
    );
    const withHistory = assembleTutorTurn({
      problem,
      language,
      editorCode: long,
      history: extra,
    });

    assert.equal(assembled.truncated, true);
    const lastUser = assembled.messages.findLast(
      (message) => message.role === "user",
    );
    assert.match(messageText(lastUser?.parts ?? []), /truncated \(40 more characters\)/);
    assert.equal(withHistory.truncated, true);
    assert.match(
      withHistory.instructions,
      /Earlier conversation turns were omitted \(4 messages\)/,
    );
    assert.match(withHistory.instructions, /Context budget/);
  });

  it("notes a truncated workspace even when it sits in instructions", () => {
    const { instructions, truncated } = buildTutorPrompt({
      problem,
      language,
      workspaceTruncated: true,
      conversationTruncated: true,
      omittedTurns: 4,
    });

    assert.equal(truncated, true);
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
    assert.equal(bounded.omitted, 1);
  });

  it("keeps a thread that is longer than the old 16-message window", () => {
    assert.equal(CONVERSATION_MESSAGE_LIMIT, 48);
    assert.equal(CONVERSATION_CHAR_LIMIT, 48_000);
    const messages = Array.from({ length: 20 }, (_, index) =>
      turn(
        `m${index}`,
        index % 2 === 0 ? "user" : "assistant",
        `turn ${index} nested loops that compare every pair`,
      ),
    );
    const bounded = boundConversation(messages);

    assert.equal(bounded.truncated, false);
    assert.equal(bounded.omitted, 0);
    assert.equal(bounded.messages.length, 20);
    assert.equal(bounded.messages[0]?.id, "m0");
    assert.match(messageText(bounded.messages[0]?.parts ?? []), /nested loops/);
  });

  it("counts a leading assistant dropped after the window cut", () => {
    const messages = Array.from({ length: CONVERSATION_MESSAGE_LIMIT + 1 }, (_, index) =>
      turn(`m${index}`, index % 2 === 0 ? "user" : "assistant", `turn ${index}`),
    );
    const bounded = boundConversation(messages);

    assert.equal(bounded.messages[0]?.role, "user");
    assert.equal(bounded.messages[0]?.id, "m2");
    assert.equal(bounded.omitted, messages.length - bounded.messages.length);
  });

  it("keeps the latest question when earlier turns exceed the character budget", () => {
    const chunk = "h".repeat(CODE_CONTEXT_LIMIT);
    const messages = Array.from({ length: 10 }, (_, index) =>
      turn(`m${index}`, "user", index === 9 ? "latest question" : chunk),
    );
    const bounded = boundConversation(messages);

    assert.equal(bounded.messages.at(-1)?.id, "m9");
    assert.match(messageText(bounded.messages.at(-1)?.parts ?? []), /latest question/);
    assert.equal(
      bounded.messages.some((message) => message.id === "m0"),
      false,
    );
    assert.equal(bounded.omitted, messages.length - bounded.messages.length);
    assert.equal(bounded.truncated, true);
  });
});

describe("QUICK_ACTIONS", () => {
  it("asks hint, simplify, review, and debug to stay on the current attempt", () => {
    const hint = QUICK_ACTIONS.find((action) => action.id === "hint");
    const simplify = QUICK_ACTIONS.find((action) => action.id === "simplify");
    const review = QUICK_ACTIONS.find((action) => action.id === "review");
    const debug = QUICK_ACTIONS.find((action) => action.id === "debug");
    assert.ok(hint && simplify && review && debug);

    const hintText = hint.prompt({ problem, language });
    const simplifyText = simplify.prompt({ problem, language });
    const reviewText = review.prompt({ problem, language });
    const debugText = debug.prompt({ problem, language });

    assert.match(hintText, /currently in my editor/);
    assert.match(hintText, /one immediate step/);
    assert.equal(hintText.includes("Next:"), false);
    assert.match(simplifyText, /Stay on that same idea/);
    assert.match(simplifyText, /smaller example/);
    assert.match(simplifyText, /Stop there/);
    assert.equal(simplifyText.includes("Next:"), false);
    assert.equal(simplifyText.includes("one idea only"), false);
    assert.match(reviewText, /Stay with the approach/);
    assert.match(reviewText, /Don't rewrite the solution/);
    assert.match(reviewText, /don't assign later steps/);
    assert.equal(reviewText.includes("Next:"), false);
    assert.match(debugText, /failing test case/);
    assert.match(debugText, /debug prints as observations/);
    assert.match(debugText, /not my example/);
  });
});

describe("buildDemoAnswer", () => {
  it("does not diagnose the attempt and says demo mode cannot analyse it", () => {
    const hint = buildDemoAnswer({
      question: "Give me a hint.",
      problem,
      language,
    });
    const failing = buildDemoAnswer({
      question: "why is this failing on that case?",
      problem,
      language,
    });
    const review = buildDemoAnswer({
      question: "Review my code.",
      problem,
      language,
    });
    const complexity = buildDemoAnswer({
      question: "Explain the complexity.",
      problem,
      language,
    });
    const simplify = buildDemoAnswer({
      question:
        "I am stuck on the Python 3 code in my editor. Explain the step I am on in the simplest terms.",
      problem,
      language,
    });

    for (const text of [hint, failing, review, complexity, simplify]) {
      assert.equal(text.includes(DEMO_MODE_DISCLAIMER), true);
      assert.equal(text.includes("early exit"), false);
      assert.equal(text.includes("Hash each complement"), false);
      assert.equal(text.includes("exactly right"), false);
      assert.equal(text.includes("\nNext: "), false);
    }
    assert.match(failing, /cannot inspect the failing test case/);
    assert.match(complexity, /problem notes list/);
    assert.match(simplify, /cannot restate the current step in simpler terms/);
  });
});
