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
  MORE_ACTIONS,
  PRIMARY_ACTIONS,
  QUICK_ACTIONS,
  quickActionById,
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
    assert.match(text, /one valid approach, not the only acceptable one/);
    assert.match(text, /working brute force is allowed/);
    assert.match(text, /work in progress/);
    assert.match(text, /the failing test case/);
    assert.match(text, /the revealed hidden case/);
    assert.match(text, /the statement example/);
    assert.match(text, /consider this illustrative input/);
    assert.match(text, /not the reference-solution source/);
    assert.match(text, /never ask them to paste the editor/i);
    assert.equal(text.includes("Always label them as your own examples"), false);
    assert.equal(text.includes(REFERENCE_SOURCE), false);
    assert.equal(text.includes("VISIBLE_SUITE_ONLY"), false);
  });

  it("gives concrete hints that name a tool and teach the idea behind the step", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Name the actual tool when one fits: a hashmap, a stack/);
    assert.match(text, /Teach the idea behind the step/);
    assert.match(text, /is a hint\. "Create a dictionary" is a chore/);
    assert.match(text, /Ground hints in the code in front of you/);
    assert.match(text, /Support the approach already agreed/);
    assert.match(text, /never a reason to change the algorithm/);
  });

  it("paces replies for a short attention span without turning into a quiz", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /One clear focus per reply/);
    assert.match(text, /About 60 seconds of reading/);
    assert.match(text, /One idea per message/);
    assert.match(text, /A narrow clarification can be two sentences/);
    assert.match(text, /short list, or a small table/);
    assert.match(text, /Give a local snippet when they explicitly ask/);
    assert.match(text, /The remaining algorithm is not a snippet/);
    assert.match(text, /Define a term the first time you use it/);
    assert.match(text, /At most one question per reply/);
    assert.match(text, /do not end on a `Next:` task/);
    assert.match(text, /clarification or validation can end as soon as it is answered/);
    assert.equal(text.includes("starts with `Next:`"), false);
    assert.equal(text.includes("under about 120 words"), false);
  });

  it("reads the learner's state: confusion, direct requests, debug questions, and returns", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /do not repeat the same sentence louder/);
    assert.match(text, /Confusion does not change the algorithm/);
    assert.match(text, /a direct request earns a direct answer/);
    assert.match(text, /still not a full solution unless they ask for the full solution/);
    assert.match(text, /validate the actual change against the current approach/);
    assert.match(text, /a two-line recap of where they are/);
    assert.match(text, /Trace the failing case through their code/);
    assert.match(text, /A repeated question is not a signal of frustration/);
    assert.match(text, /do not change the plan because a run failed/);
  });

  it("keeps the complete implementation behind an explicit full-solution request", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /What you may hand over:/);
    assert.match(text, /syntax help, one local line, an explanation of any piece/);
    assert.match(text, /behind an explicit request for the full solution/);
    assert.match(text, /"Be specific", "just tell me", and "I'm stuck" are not that request/);
    assert.match(text, /does not become the rest of the method just because they asked twice/);
  });

  it("sounds like a friendly buddy instead of canned praise or a mascot", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /friendly coding buddy, not a solution printer/);
    assert.match(text, /Talk like a helpful friend sitting next to them/);
    assert.match(text, /Canned praise such as "exactly right"/);
    assert.match(text, /So is a forced joke or a mascot voice/);
    assert.match(text, /tie any encouragement to something specific they did/);
    assert.match(text, /Use their words and names where you can/);
    assert.match(text, /Reply shapes to copy/);
    assert.match(text, /where do i even start\?/);
  });

  it("forbids re-asking for a step the buffer or attempt state already shows", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /Before you refer to a step, check the attached buffer/);
    assert.match(text, /Never ask for work the buffer already shows/);
    assert.match(text, /A comment edit is not progress unless there is no code/);
    assert.match(text, /attempt-state block is advisory/);
    assert.match(text, /does not mean the method is worked out/);
    assert.match(text, /Never read the block back/);
  });

  it("keeps the editor and a result as separate evidence", () => {
    const text = buildTutorInstructions(problem, language);

    assert.match(text, /the editor and a referenced result are separate evidence/i);
    assert.match(text, /do not claim the current editor produced it/);
    assert.match(text, /Debug prints are observations from print statements/);
    assert.match(text, /do not replace it with a value you inferred/);
    assert.match(text, /ask one focused question instead of inventing the agreement/);
    assert.match(text, /That attachment IS their code/);
    assert.equal(text.includes("Do not switch algorithms between turns"), false);
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
  it("puts three one-press actions above the composer and the rest behind More help", () => {
    assert.deepEqual(
      PRIMARY_ACTIONS.map((action) => action.label),
      ["Give me a hint", "Make it concrete", "Show a tiny example"],
    );
    assert.deepEqual(
      MORE_ACTIONS.map((action) => action.label),
      [
        "Explain it simply",
        "Review my code",
        "Why is this failing?",
        "Explain the complexity",
      ],
    );
    assert.equal(QUICK_ACTIONS.length, PRIMARY_ACTIONS.length + MORE_ACTIONS.length);
    assert.ok(QUICK_ACTIONS.every((action) => action.placement !== undefined));
    assert.equal(
      quickActionById("hint")?.placement,
      "primary",
    );
    assert.equal(quickActionById("complexity")?.placement, "more");
    assert.equal(quickActionById("nope"), undefined);
  });

  it("asks each action to stay on the current attempt", () => {
    const hint = quickActionById("hint");
    const concrete = quickActionById("concrete");
    const example = quickActionById("example");
    const simplify = quickActionById("simplify");
    const review = quickActionById("review");
    const debug = quickActionById("debug");
    const complexity = quickActionById("complexity");
    assert.ok(
      hint && concrete && example && simplify && review && debug && complexity,
    );

    const hintText = hint.prompt({ problem, language });
    const concreteText = concrete.prompt({ problem, language });
    const exampleText = example.prompt({ problem, language });
    const simplifyText = simplify.prompt({ problem, language });
    const reviewText = review.prompt({ problem, language });
    const debugText = debug.prompt({ problem, language });
    const complexityText = complexity.prompt({ problem, language });

    assert.match(hintText, /code in my editor/);
    assert.match(hintText, /Name the tool, structure, or trick you mean/);
    assert.match(hintText, /a hashmap, a stack, two pointers, a nested loop/);
    assert.match(hintText, /explain what it buys us here/);
    assert.equal(hintText.includes("one immediate step"), false);
    assert.equal(hintText.includes("Next:"), false);

    assert.match(concreteText, /Make your last explanation .* more concrete/);
    assert.match(concreteText, /just the one or two Python 3 lines for that exact piece/);
    assert.match(exampleText, /smallest example/);
    assert.match(exampleText, /label it as an illustrative example/);
    assert.match(exampleText, /not one of the problem's own examples/);

    assert.match(simplifyText, /Stay on the piece of code I am on/);
    assert.match(simplifyText, /No code and no next step/);
    assert.equal(simplifyText.includes("Next:"), false);

    assert.match(reviewText, /Stay with the approach I already have/);
    assert.match(reviewText, /the single issue or missing piece/);

    assert.match(debugText, /failing test case/);
    assert.match(debugText, /debug prints as observations/);
    assert.match(debugText, /not my example/);
    assert.match(debugText, /one diagnostic step/);

    assert.match(complexityText, /Start from the approach I am actually using/);
    assert.match(complexityText, /what my current attempt costs/);
    assert.match(complexityText, /don't rewrite my code/);
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
