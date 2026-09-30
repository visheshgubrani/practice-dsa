import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { beginChatTurn, completeChatTurn } from "@/lib/db/queries/chat";
import { persistRunResult } from "@/lib/db/queries/submissions";
import { problems } from "@/lib/db/schema";
import type { RunResult } from "@/lib/runner/types";

import { completedConversation, loadNotesContext, notesGenerateBodySchema } from "./notes-context";

/**
 * Ownership of the context a draft may see.
 *
 * Two throwaway catalog rows are created so a conversation and a run can each
 * belong to a different problem. References are checked against the resolved
 * problem before anything reaches a prompt, and the fixtures are removed
 * afterwards (cascade), so no seeded problem or practice row is touched.
 */

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};

const SOURCE = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n";

async function insertFixture(title: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `__notes-${crypto.randomUUID()}`;
    const number = 9_000_000 + Math.floor(Math.random() * 90_000);
    try {
      await db.insert(problems).values({
        slug,
        number,
        position: 9_000_000,
        title,
        difficulty: "easy",
        topic: "Stack",
        statement: "fixture — not a catalog problem",
        signature: SIGNATURE,
      });
      return slug;
    } catch (error) {
      if (attempt === 7) throw error;
    }
  }
  throw new Error("Could not insert a notes-context fixture.");
}

function runResult(overrides: Partial<RunResult>): RunResult {
  return {
    verdict: "wrong_answer",
    mode: "submit",
    runner: "piston",
    cases: [],
    passedCount: 0,
    totalCount: 1,
    at: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

/** A conversation on `slug`: one finished turn, then one left pending. */
async function seedThread(slug: string): Promise<string> {
  const threadId = crypto.randomUUID();
  const first = await beginChatTurn({
    threadId,
    problemSlug: slug,
    user: {
      uiId: crypto.randomUUID(),
      parts: [{ type: "text", text: "How do I remember the complement?" }],
    },
    language: "python",
    draftSource: null,
    runSummary: null,
    submissionId: null,
    model: "test-model",
  });
  await completeChatTurn({
    threadId,
    assistantUiId: first.assistantUiId,
    parts: [{ type: "text", text: "Store the number you still need." }],
    completionStatus: "completed",
    model: "test-model",
  });

  await beginChatTurn({
    threadId,
    problemSlug: slug,
    user: {
      uiId: crypto.randomUUID(),
      parts: [{ type: "text", text: "PENDING_QUESTION and then?" }],
    },
    language: "python",
    draftSource: null,
    runSummary: null,
    submissionId: null,
    model: "test-model",
  });
  return threadId;
}

describe("notesGenerateBodySchema", () => {
  const valid = {
    slug: "two-sum",
    language: "python",
    source: SOURCE,
    notes: { approach: "hash map" },
  };

  it("accepts a body with no optional reference", () => {
    const parsed = notesGenerateBodySchema.parse(valid);
    assert.equal(parsed.threadId, undefined);
    assert.equal(parsed.submissionId, undefined);
  });

  it("rejects a stray field, an unrunnable language, and an oversized buffer", () => {
    assert.equal(
      notesGenerateBodySchema.safeParse({ ...valid, extra: true }).success,
      false,
    );
    assert.equal(
      notesGenerateBodySchema.safeParse({ ...valid, language: "cpp" }).success,
      false,
    );
    assert.equal(
      notesGenerateBodySchema.safeParse({ ...valid, source: "x".repeat(200_001) })
        .success,
      false,
    );
    assert.equal(
      notesGenerateBodySchema.safeParse({ ...valid, threadId: "not-a-uuid" })
        .success,
      false,
    );
    assert.equal(notesGenerateBodySchema.safeParse({ language: "python" }).success, false);
  });
});

describe("completedConversation", () => {
  it("keeps user turns and finished replies only", () => {
    const message = (
      id: string,
      role: "user" | "assistant",
      completionStatus: "completed" | "pending" | "failed" | "aborted",
      text: string,
    ) => ({
      id,
      role,
      parts: [{ type: "text" as const, text }],
      text,
      completionStatus,
      createdAt: "2026-09-21T00:00:00.000Z",
    });

    const kept = completedConversation([
      message("u1", "user", "completed", "first question"),
      message("a1", "assistant", "completed", "first answer"),
      message("a2", "assistant", "pending", "never finished"),
      message("a3", "assistant", "failed", "failed reply"),
      message("a4", "assistant", "aborted", "stopped reply"),
    ]);

    assert.deepEqual(
      kept.map((entry) => entry.id),
      ["u1", "a1"],
    );
  });
});

describe("loadNotesContext ownership", () => {
  let slugA = "";
  let slugB = "";
  let threadA = "";
  let threadB = "";
  let submissionB: string | null = null;

  before(async () => {
    slugA = await insertFixture("Notes fixture A");
    slugB = await insertFixture("Notes fixture B");
    threadA = await seedThread(slugA);
    threadB = await seedThread(slugB);

    const stored = await persistRunResult({
      slug: slugB,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: runResult({ mode: "submit", runner: "piston", verdict: "wrong_answer" }),
    });
    submissionB = stored?.id ?? null;
    assert.ok(submissionB);
  });

  after(async () => {
    for (const slug of [slugA, slugB]) {
      if (slug) await db.delete(problems).where(eq(problems.slug, slug));
    }
  });

  function body(overrides: Record<string, unknown> = {}) {
    return notesGenerateBodySchema.parse({
      slug: slugA,
      language: "python",
      source: `${SOURCE}# moved on\n`,
      notes: { approach: "hash map" },
      ...overrides,
    });
  }

  it("rejects an unknown problem", async () => {
    const outcome = await loadNotesContext(
      notesGenerateBodySchema.parse({
        slug: "__notes-missing",
        language: "python",
        source: SOURCE,
      }),
    );
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.status, 404);
    assert.match(outcome.error, /Unknown problem/);
  });

  it("rejects a conversation from another problem without mixing contexts", async () => {
    const outcome = await loadNotesContext(body({ threadId: threadB }));
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.status, 404);
    // `getChatWorkspace` deliberately reports a thread that belongs to another
    // problem as unknown, so this cannot be used to probe for foreign threads.
    assert.match(outcome.error, /Unknown conversation/);
  });

  it("rejects an unknown conversation", async () => {
    const outcome = await loadNotesContext(body({ threadId: crypto.randomUUID() }));
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.status, 404);
    assert.match(outcome.error, /Unknown conversation/);
  });

  it("rejects a run that belongs to another problem", async () => {
    const outcome = await loadNotesContext(body({ submissionId: submissionB }));
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.status, 404);
    assert.match(outcome.error, /does not belong to this problem/);
  });

  it("rejects an unknown run", async () => {
    const outcome = await loadNotesContext(
      body({ submissionId: crypto.randomUUID() }),
    );
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.status, 404);
  });

  it("omits both references when neither is selected", async () => {
    const outcome = await loadNotesContext(body());
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(outcome.context.messages, []);
    assert.equal(outcome.context.submission, null);
    assert.equal(outcome.context.starter, "");
    assert.equal(outcome.context.notes.steps, "");
    assert.equal(outcome.context.notes.approach, "hash map");
    assert.equal(outcome.context.problem.slug, slugA);
  });

  it("loads its own conversation and drops the turn that never finished", async () => {
    const outcome = await loadNotesContext(body({ threadId: threadA }));
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;

    const texts = outcome.context.messages.map((message) =>
      message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    );
    assert.deepEqual(outcome.context.messages.map((m) => m.role), [
      "user",
      "assistant",
      "user",
    ]);
    assert.match(texts[1] ?? "", /Store the number you still need\./);
    assert.equal(texts.join("\n").includes("PENDING_QUESTION"), true);
    assert.equal(
      outcome.context.messages.filter((m) => m.role === "assistant").length,
      1,
    );
  });

  it("accepts its own run as disclosed context", async () => {
    const stored = await persistRunResult({
      slug: slugA,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: runResult({ mode: "submit", runner: "piston", verdict: "wrong_answer" }),
    });
    assert.ok(stored);

    const outcome = await loadNotesContext(body({ submissionId: stored.id }));
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.context.submission?.id, stored.id);
    assert.equal(outcome.context.submission?.slug, slugA);
  });
});
