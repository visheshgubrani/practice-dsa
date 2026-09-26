import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";
import type { UIMessage } from "ai";

import { loadTutorSubmission } from "@/lib/ai/context";
import { assembleTutorTurn, tutorPayloadText } from "@/lib/ai/prompts";
import { messageText } from "@/lib/chat/messages";
import { executeChatTurn } from "@/lib/chat/turn";
import { db } from "@/lib/db";
import {
  beginChatTurn,
  chatPostBodySchema,
  completeChatTurn,
  countThreadMessages,
  getChatWorkspace,
} from "@/lib/db/queries/chat";
import { getPractice, patchPractice } from "@/lib/db/queries/practice";
import {
  getProblem,
  getProblemForJudging,
} from "@/lib/db/queries/problems";
import {
  getSubmission,
  listSubmissions,
  persistRunResult,
} from "@/lib/db/queries/submissions";
import {
  problemExamples,
  problemTestcases,
  problems,
} from "@/lib/db/schema";
import { getLanguage } from "@/lib/languages";
import type { RunResult } from "@/lib/runner/types";

/**
 * Phase 5.3: restore, failure context, interrupt/retry, and prompt leakage.
 * Uses a throwaway catalog row so seeded practice data is never touched.
 */

process.env.DSA_CHAT_DEMO_CHUNK_MS = "0";

const language = getLanguage("python");

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};

const HIDDEN_CATALOG_VALUE = 888001;
const UNREVEALED_SUCCESS =
  "SECRET_UNREVEALED_HIDDEN_SUCCESS nums = [0,0] target = 0";
const REVEALED_FAILURE = "nums = [3,3]\ntarget = 6";
const SUBMITTED_SOURCE =
  "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 0]  # submitted-attempt\n";
const LATER_DRAFT =
  "class Solution:\n    def twoSum(self, nums, target):\n        return [1, 1]  # later-draft\n";
const ACCEPTED_SOURCE =
  "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]  # accepted-solution\n";

function userParts(text: string): UIMessage["parts"] {
  return [{ type: "text", text }];
}

function assistantParts(text: string): UIMessage["parts"] {
  return [{ type: "text", text }];
}

async function drain(response: Response): Promise<void> {
  await response.arrayBuffer();
}

async function insertFixture(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `__p53-${crypto.randomUUID()}`;
    const number = 9_200_000 + Math.floor(Math.random() * 90_000);
    try {
      const [row] = await db
        .insert(problems)
        .values({
          slug,
          number,
          position: 9_200_000,
          title: "Phase 5.3 tutor fixture",
          difficulty: "easy",
          // A real topic: the check constraint refuses a blank one.
          topic: "Arrays & Hashing",
          statement: "Return two indices that add to target.",
          constraints: ["2 <= nums.length <= 10^4"],
          tags: ["array"],
          referenceApproach: "Hash each complement as you scan.",
          referenceTimeComplexity: "O(n)",
          referenceSpaceComplexity: "O(n)",
          signature: SIGNATURE,
        })
        .returning({ id: problems.id });
      if (!row) throw new Error("Could not insert a tutor fixture.");

      await db.insert(problemExamples).values({
        problemId: row.id,
        position: 0,
        input: "nums = [2,7], target = 9",
        output: "[0,1]",
        explanation: "2 + 7 = 9",
      });
      await db.insert(problemTestcases).values([
        {
          problemId: row.id,
          position: 0,
          args: [[2, 7], 9],
          expected: "[0,1]",
          isHidden: false,
        },
        {
          problemId: row.id,
          position: 1,
          args: [[HIDDEN_CATALOG_VALUE, HIDDEN_CATALOG_VALUE + 1], 0],
          expected: "[0,1]",
          isHidden: true,
          explanation: "SECRET_CATALOG_HIDDEN",
        },
      ]);
      return slug;
    } catch {
      if (attempt === 7) throw new Error("Could not insert a tutor fixture.");
    }
  }
  throw new Error("Could not insert a tutor fixture.");
}

function failingSubmit(): RunResult {
  return {
    mode: "submit",
    runner: "piston",
    verdict: "wrong_answer",
    passedCount: 1,
    totalCount: 3,
    timeMs: 12,
    memoryKb: 2048,
    at: "2026-09-21T00:00:00.000Z",
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
        input: UNREVEALED_SUCCESS,
        expected: "[0,1]",
        stdout: "[0,1]",
        debug: "trace-should-not-leak",
        stderr: "stderr-should-not-leak",
      },
      {
        index: 1,
        status: "wrong_answer",
        hidden: true,
        input: REVEALED_FAILURE,
        expected: "[0,1]",
        stdout: "[]",
        debug: "saw 3 and 3",
      },
    ],
  };
}

function acceptedSubmit(): RunResult {
  return {
    mode: "submit",
    runner: "piston",
    verdict: "accepted",
    passedCount: 3,
    totalCount: 3,
    timeMs: 9,
    memoryKb: 2048,
    at: "2026-09-21T00:00:00.000Z",
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
        input: UNREVEALED_SUCCESS,
        expected: "[0,1]",
        stdout: "[0,1]",
      },
    ],
  };
}

async function persistFailingAttempt(slug: string): Promise<string> {
  const stored = await persistRunResult({
    slug,
    language: "python",
    source: SUBMITTED_SOURCE,
    requestId: crypto.randomUUID(),
    result: failingSubmit(),
  });
  return stored.id;
}

describe("tutor context through the stored submission path", () => {
  let slug = "";

  before(async () => {
    slug = await insertFixture();
  });

  after(async () => {
    if (slug) {
      await db.delete(problems).where(eq(problems.slug, slug));
    }
  });

  it("restores the conversation after a process restart (reload from Postgres)", async () => {
    const threadId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const body = chatPostBodySchema.parse({
      threadId,
      problemSlug: slug,
      language: "python",
      code: LATER_DRAFT,
      messages: [
        {
          id: userId,
          role: "user",
          parts: userParts("Give me one hint without the solution."),
        },
      ],
    });

    const response = await executeChatTurn({ body, live: false });
    assert.equal(response.ok, true);
    await drain(response);

    const restored = await getChatWorkspace(slug);
    assert.equal(restored?.thread?.id, threadId);
    assert.equal(restored?.thread?.messages.length, 2);
    assert.equal(
      restored?.thread?.messages[0]?.text,
      "Give me one hint without the solution.",
    );
    assert.equal(restored?.thread?.messages[0]?.id, userId);
    assert.equal(restored?.thread?.messages[1]?.role, "assistant");
    assert.equal(restored?.thread?.messages[1]?.completionStatus, "completed");
    assert.match(restored?.thread?.messages[1]?.text ?? "", /cannot analyse the current attempt/);
    assert.equal(restored?.thread?.model, "demo");
  });

  it("sends the revealed failing case and the submitted source, not unrevealed cases", async () => {
    const submissionId = await persistFailingAttempt(slug);
    const problem = await getProblem(slug);
    assert.ok(problem);
    const judging = await getProblemForJudging(slug);
    assert.ok(judging);
    assert.equal(
      JSON.stringify(judging.testcases).includes(String(HIDDEN_CATALOG_VALUE)),
      true,
    );
    assert.equal(
      JSON.stringify(problem.testcases).includes(String(HIDDEN_CATALOG_VALUE)),
      false,
    );

    const submission = await loadTutorSubmission(slug, submissionId);
    assert.ok(submission);
    assert.equal(submission.source, SUBMITTED_SOURCE);
    const failing = submission.cases.find((entry) => entry.status !== "accepted");
    assert.equal(failing?.hidden, true);
    assert.equal(failing?.input, REVEALED_FAILURE);

    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: LATER_DRAFT,
      submission,
      runSummary: "Wrong Answer · 1/3",
      history: [
        {
          id: "u1",
          role: "user",
          parts: userParts("Give me one hint without the solution."),
          metadata: { completionStatus: "completed" },
        },
      ],
    });

    const lastUser = assembled.messages.findLast(
      (message) => message.role === "user",
    );
    assert.ok(lastUser);
    const lastUserText = messageText(lastUser.parts);
    assert.match(lastUserText, /Give me one hint without the solution/);
    assert.match(lastUserText, /submitted-attempt/);
    assert.match(lastUserText, /later-draft/);
    assert.match(lastUserText, /The editor has changed since this result/);
    assert.match(lastUserText, /First failing case/);
    assert.match(lastUserText, /nums = \[3,3\]/);
    assert.match(lastUserText, /saw 3 and 3/);
    assert.match(lastUserText, /never the user's example/);
    assert.match(assembled.instructions, /Hash each complement as you scan/);
    assert.match(assembled.instructions, /consider this illustrative input/);
    assert.match(assembled.instructions, /never ask them to paste the editor/i);
    assert.equal(assembled.instructions.includes("later-draft"), false);

    const payload = tutorPayloadText(assembled);
    assert.equal(payload.includes(UNREVEALED_SUCCESS), false);
    assert.equal(payload.includes("trace-should-not-leak"), false);
    assert.equal(payload.includes("stderr-should-not-leak"), false);
    assert.equal(payload.includes("SECRET_CATALOG_HIDDEN"), false);
    assert.equal(payload.includes(String(HIDDEN_CATALOG_VALUE)), false);
    assert.equal(payload.includes("Wrong Answer · 1/3"), false);
  });

  it("does not leak unrevealed fields even when the stored row still holds them", async () => {
    const submissionId = await persistFailingAttempt(slug);
    const stored = await getSubmission(submissionId);
    const hiddenSuccess = stored?.cases.find(
      (entry) => entry.hidden && entry.status === "accepted",
    );
    assert.equal(hiddenSuccess?.input, undefined);
    assert.equal(hiddenSuccess?.expected, undefined);
    assert.equal(hiddenSuccess?.stdout, undefined);
    assert.equal(hiddenSuccess?.debug, undefined);

    const problem = await getProblem(slug);
    assert.ok(problem);
    const assembled = assembleTutorTurn({
      problem,
      language,
      editorCode: SUBMITTED_SOURCE,
      submission: stored,
      history: [
        {
          id: "u1",
          role: "user",
          parts: userParts("why is this failing?"),
          metadata: { completionStatus: "completed" },
        },
      ],
    });
    const payload = tutorPayloadText(assembled);
    assert.equal(payload.includes(UNREVEALED_SUCCESS), false);
    assert.equal(payload.includes("trace-should-not-leak"), false);
  });

  it("interruption and retry reuse the same two turns", async () => {
    const threadId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const question = "why is this failing on that case?";
    const body = chatPostBodySchema.parse({
      threadId,
      problemSlug: slug,
      language: "python",
      code: SUBMITTED_SOURCE,
      messages: [
        { id: userId, role: "user", parts: userParts(question) },
      ],
    });

    process.env.DSA_CHAT_DEMO_CHUNK_MS = "30";
    const controller = new AbortController();
    const pending = executeChatTurn({
      body,
      signal: controller.signal,
      live: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    controller.abort();
    const aborted = await pending;
    await drain(aborted);
    process.env.DSA_CHAT_DEMO_CHUNK_MS = "0";

    const interrupted = await getChatWorkspace(slug, threadId);
    const assistant = interrupted?.thread?.messages.find(
      (message) => message.role === "assistant",
    );
    assert.equal(await countThreadMessages(threadId), 2);
    assert.equal(assistant?.completionStatus, "aborted");

    const retry = await executeChatTurn({ body, live: false });
    assert.equal(retry.ok, true);
    await drain(retry);

    assert.equal(await countThreadMessages(threadId), 2);
    const restored = await getChatWorkspace(slug, threadId);
    assert.equal(restored?.thread?.messages.length, 2);
    assert.equal(restored?.thread?.messages[0]?.id, userId);
    assert.equal(restored?.thread?.messages[1]?.completionStatus, "completed");
    assert.match(restored?.thread?.messages[1]?.text ?? "", /cannot inspect the failing test case/);
  });

  it("recovers draft, notes, accepted solution, history, and conversation after a restart", async () => {
    const notes = {
      approach: "my own notes about hashing",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    };
    await patchPractice(slug, {
      draft: { source: LATER_DRAFT, revision: 0 },
      notes,
    });

    const failingId = await persistFailingAttempt(slug);
    const failing = await getSubmission(failingId);
    assert.equal(failing?.source, SUBMITTED_SOURCE);
    assert.equal(
      failing?.cases.find((entry) => entry.status !== "accepted")?.input,
      REVEALED_FAILURE,
    );

    const threadId = crypto.randomUUID();
    const userUiId = crypto.randomUUID();
    const asked = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: {
        uiId: userUiId,
        parts: userParts("Look at that exact attempt. Why did Hidden 2 fail?"),
      },
      language: "python",
      draftSource: SUBMITTED_SOURCE,
      runSummary: "Wrong Answer · 1/3",
      submissionId: failingId,
      model: "demo",
    });
    await completeChatTurn({
      threadId,
      assistantUiId: asked.assistantUiId,
      parts: assistantParts("The pair that uses the same index is the bug."),
      completionStatus: "completed",
      model: "demo",
    });

    const accepted = await persistRunResult({
      slug,
      language: "python",
      source: ACCEPTED_SOURCE,
      requestId: crypto.randomUUID(),
      result: acceptedSubmit(),
    });

    const practice = await getPractice(slug, "python");
    const history = await listSubmissions(slug, 20, 0);
    const chat = await getChatWorkspace(slug);

    assert.equal(practice?.draft?.source, LATER_DRAFT);
    assert.equal(practice?.notes?.approach, notes.approach);
    assert.equal(practice?.progress.status, "solved");
    assert.equal(practice?.latestAccepted?.id, accepted.id);
    assert.equal(practice?.latestAccepted?.source, ACCEPTED_SOURCE);

    const sources = history?.items.map((row) => row.source) ?? [];
    assert.equal(sources.includes(SUBMITTED_SOURCE), true);
    assert.equal(sources.includes(ACCEPTED_SOURCE), true);

    assert.equal(chat?.thread?.id, threadId);
    assert.match(
      chat?.thread?.messages[0]?.text ?? "",
      /exact attempt/,
    );
    const askedRow = await db.query.chatMessages.findFirst({
      where: { uiId: userUiId },
    });
    assert.equal(askedRow?.submissionId, failingId);
  });
});
