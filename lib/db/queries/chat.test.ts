import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";
import type { UIMessage } from "ai";

import { db } from "@/lib/db";
import {
  beginChatTurn,
  chatGetQuerySchema,
  chatPostBodySchema,
  completeChatTurn,
  countThreadMessages,
  getChatWorkspace,
} from "@/lib/db/queries/chat";
import { persistRunResult } from "@/lib/db/queries/submissions";
import { problems } from "@/lib/db/schema";
import type { RunResult } from "@/lib/runner/types";

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};

const SOURCE =
  "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n";

function userParts(text: string): UIMessage["parts"] {
  return [{ type: "text", text }];
}

function assistantParts(text: string): UIMessage["parts"] {
  return [{ type: "text", text }];
}

async function insertFixture(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `__p5-${crypto.randomUUID()}`;
    const number = 9_100_000 + Math.floor(Math.random() * 90_000);
    try {
      await db.insert(problems).values({
        slug,
        number,
        position: 9_100_000,
        title: "Phase 5 chat fixture",
        difficulty: "easy",
        statement: "fixture — not a catalog problem",
        signature: SIGNATURE,
      });
      return slug;
    } catch {
      if (attempt === 7) throw new Error("Could not insert a chat fixture.");
    }
  }
  throw new Error("Could not insert a chat fixture.");
}

function result(
  overrides: Partial<RunResult> & Pick<RunResult, "mode" | "runner" | "verdict">,
): RunResult {
  return {
    cases: [
      {
        index: 0,
        status: overrides.verdict,
        hidden: false,
        input: "nums = [2,7]\ntarget = 9",
        expected: "[0,1]",
        stdout: "[0,1]",
      },
    ],
    passedCount: overrides.verdict === "accepted" ? 1 : 0,
    totalCount: 1,
    at: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("chat request schemas", () => {
  const threadId = "550e8400-e29b-41d4-a716-446655440000";
  const submissionId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

  it("requires a thread id on POST and accepts an optional submission id", () => {
    const parsed = chatPostBodySchema.safeParse({
      threadId,
      messages: [{ role: "user", id: "m1", parts: [] }],
      problemSlug: "two-sum",
      language: "python",
      submissionId,
    });
    assert.equal(parsed.success, true);
    assert.equal(
      chatPostBodySchema.safeParse({
        messages: [{ role: "user" }],
        problemSlug: "two-sum",
        language: "python",
      }).success,
      false,
    );
  });

  it("accepts a GET restore of the latest thread or a specific one", () => {
    assert.equal(
      chatGetQuerySchema.safeParse({ slug: "two-sum" }).success,
      true,
    );
    assert.equal(
      chatGetQuerySchema.safeParse({ slug: "two-sum", threadId }).success,
      true,
    );
  });
});

describe("durable chat persistence", () => {
  let slug = "";

  before(async () => {
    slug = await insertFixture();
  });

  after(async () => {
    if (slug) {
      await db.delete(problems).where(eq(problems.slug, slug));
    }
  });

  it("stores a turn, restores the latest thread, and keeps prior threads", async () => {
    const firstThread = crypto.randomUUID();
    const first = await beginChatTurn({
      threadId: firstThread,
      problemSlug: slug,
      user: { uiId: crypto.randomUUID(), parts: userParts("why does this fail?") },
      language: "python",
      draftSource: SOURCE,
      runSummary: "Wrong Answer · 1/3",
      submissionId: null,
      model: "demo",
    });
    await completeChatTurn({
      threadId: first.threadId,
      assistantUiId: first.assistantUiId,
      parts: assistantParts("Look at the early exit."),
      completionStatus: "completed",
      model: "demo",
    });

    const secondThread = crypto.randomUUID();
    const second = await beginChatTurn({
      threadId: secondThread,
      problemSlug: slug,
      user: { uiId: crypto.randomUUID(), parts: userParts("new attempt") },
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });
    await completeChatTurn({
      threadId: second.threadId,
      assistantUiId: second.assistantUiId,
      parts: assistantParts("Start from the hash map."),
      completionStatus: "completed",
      model: "demo",
    });

    const restored = await getChatWorkspace(slug);
    assert.equal(restored?.thread?.id, secondThread);
    assert.equal(restored?.thread?.messages[0]?.text, "new attempt");
    assert.equal(restored?.threads.length, 2);
    assert.equal(restored?.threads.some((thread) => thread.id === firstThread), true);

    const prior = await getChatWorkspace(slug, firstThread);
    assert.equal(prior?.thread?.id, firstThread);
    assert.equal(prior?.thread?.messages[0]?.text, "why does this fail?");
  });

  it("retries the same user ui_id without duplicating the turn", async () => {
    const threadId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const first = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: userId, parts: userParts("hint please") },
      assistantUiId: assistantId,
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });
    const second = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: userId, parts: userParts("hint please") },
      assistantUiId: assistantId,
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });

    assert.equal(first.assistantUiId, second.assistantUiId);
    assert.equal(await countThreadMessages(threadId), 2);
    assert.equal(second.history.length, 1);
    assert.equal(second.history[0]?.id, userId);
  });

  it("allocates seq under a thread lock so concurrent turns do not collide", async () => {
    const threadId = crypto.randomUUID();
    const [a, b] = await Promise.all([
      beginChatTurn({
        threadId,
        problemSlug: slug,
        user: { uiId: crypto.randomUUID(), parts: userParts("first") },
        language: "python",
        draftSource: SOURCE,
        runSummary: null,
        submissionId: null,
        model: "demo",
      }),
      beginChatTurn({
        threadId,
        problemSlug: slug,
        user: { uiId: crypto.randomUUID(), parts: userParts("second") },
        language: "python",
        draftSource: SOURCE,
        runSummary: null,
        submissionId: null,
        model: "demo",
      }),
    ]);

    assert.equal(await countThreadMessages(threadId), 4);
    const state = await getChatWorkspace(slug, threadId);
    const seqs = state?.thread?.messages.map((message) => message.id) ?? [];
    assert.equal(new Set(seqs).size, 4);
    assert.notEqual(a.assistantUiId, b.assistantUiId);
  });

  it("keeps interrupted generations distinct from a completed answer", async () => {
    const threadId = crypto.randomUUID();
    const turn = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: crypto.randomUUID(), parts: userParts("stop me") },
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });
    await completeChatTurn({
      threadId,
      assistantUiId: turn.assistantUiId,
      parts: assistantParts("partial"),
      completionStatus: "aborted",
      model: "demo",
    });

    const state = await getChatWorkspace(slug, threadId);
    const assistant = state?.thread?.messages.find(
      (message) => message.role === "assistant",
    );
    assert.equal(assistant?.completionStatus, "aborted");
    assert.equal(assistant?.text, "partial");
  });

  it("stores a submission link only when the row belongs to this problem", async () => {
    const stored = await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: result({
        mode: "run",
        runner: "piston",
        verdict: "wrong_answer",
      }),
    });
    const threadId = crypto.randomUUID();
    await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: crypto.randomUUID(), parts: userParts("this case") },
      language: "python",
      draftSource: SOURCE,
      runSummary: "Wrong Answer · 0/1",
      submissionId: stored.id,
      model: "demo",
    });
    await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: crypto.randomUUID(), parts: userParts("other case") },
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: "00000000-0000-0000-0000-000000000000",
      model: "demo",
    });

    const rows = await db.query.chatMessages.findMany({
      where: { threadId },
      orderBy: { seq: "asc" },
    });
    const users = rows.filter((row) => row.role === "user");
    assert.equal(users[0]?.submissionId, stored.id);
    assert.equal(users[1]?.submissionId, null);
  });

  it("does not trust client history: generation context is the stored thread", async () => {
    const threadId = crypto.randomUUID();
    const firstUser = crypto.randomUUID();
    const followUp = crypto.randomUUID();
    const first = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: firstUser, parts: userParts("stored question") },
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });
    await completeChatTurn({
      threadId,
      assistantUiId: first.assistantUiId,
      parts: assistantParts("stored answer"),
      completionStatus: "completed",
      model: "demo",
    });

    const second = await beginChatTurn({
      threadId,
      problemSlug: slug,
      user: { uiId: followUp, parts: userParts("follow up") },
      language: "python",
      draftSource: SOURCE,
      runSummary: null,
      submissionId: null,
      model: "demo",
    });

    assert.deepEqual(
      second.history.map((message) => message.id),
      [firstUser, first.assistantUiId, followUp],
    );
  });
});
