import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { db, pool } from "@/lib/db";
import {
  PracticeConflictError,
  getPractice,
  importPractice,
  patchPractice,
} from "@/lib/db/queries/practice";
import {
  getSubmission,
  listSubmissions,
  persistRunResult,
} from "@/lib/db/queries/submissions";
import { problems } from "@/lib/db/schema";
import type { RunResult } from "@/lib/runner/types";

/**
 * Round-trip practice writes against a throwaway catalog row. The fixture is
 * deleted afterward (cascade) so these tests never touch seeded problems or
 * existing drafts / history.
 */

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};

const SOURCE = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]  \n\n# keep me\n";

function result(
  overrides: Partial<RunResult> &
    Pick<RunResult, "mode" | "runner" | "verdict">,
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
    at: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

async function insertFixture(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `__p3-${crypto.randomUUID()}`;
    const number = 9_000_000 + Math.floor(Math.random() * 90_000);
    try {
      await db.insert(problems).values({
        slug,
        number,
        position: 9_000_000,
        title: "Phase 3 persistence fixture",
        difficulty: "easy",
        statement: "fixture — not a catalog problem",
        signature: SIGNATURE,
      });
      return slug;
    } catch (error) {
      if (attempt === 7) throw error;
    }
  }
  throw new Error("Could not insert a persistence fixture.");
}

describe("durable practice persistence", () => {
  let slug = "";

  before(async () => {
    slug = await insertFixture();
  });

  after(async () => {
    if (slug) {
      await db.delete(problems).where(eq(problems.slug, slug));
    }
    await pool.end();
  });

  it("reloads draft, notes, and history from Postgres", async () => {
    const saved = await patchPractice(slug, {
      draft: { source: SOURCE, revision: 0 },
      notes: {
        approach: "hash map",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
      },
    });
    assert.equal(saved?.draft?.source, SOURCE);
    assert.equal(saved?.notes?.approach, "hash map");

    const requestId = crypto.randomUUID();
    await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId,
      result: result({
        mode: "run",
        runner: "piston",
        verdict: "wrong_answer",
      }),
    });

    const reloaded = await getPractice(slug, "python");
    assert.equal(reloaded?.draft?.source, SOURCE);
    assert.equal(reloaded?.notes?.approach, "hash map");
    assert.equal(reloaded?.notes?.timeComplexity, "O(n)");
    assert.equal(reloaded?.progress.status, "attempted");

    const history = await listSubmissions(slug, 20, 0);
    assert.equal(history?.items[0]?.source, SOURCE);
    assert.equal(history?.items[0]?.requestId, requestId);
  });

  it("rejects a stale tab and keeps the newer buffer", async () => {
    const current = await getPractice(slug, "python");
    const revision = current?.draft?.revision;
    assert.equal(typeof revision, "number");

    await patchPractice(slug, {
      draft: { source: `${SOURCE}# newer tab\n`, revision },
    });

    await assert.rejects(
      () =>
        patchPractice(slug, {
          draft: { source: "# stale overwrite\n", revision },
        }),
      (error: unknown) =>
        error instanceof PracticeConflictError && error.resource === "draft",
    );

    const kept = await getPractice(slug, "python");
    assert.equal(kept?.draft?.source, `${SOURCE}# newer tab\n`);
    assert.notEqual(kept?.draft?.source, "# stale overwrite\n");
  });

  it("does not mark solved when the history write fails", async () => {
    const before = await getPractice(slug, "python");
    assert.notEqual(before?.progress.status, "solved");

    await assert.rejects(() =>
      persistRunResult({
        slug,
        language: "python",
        source: SOURCE,
        requestId: crypto.randomUUID(),
        result: result({
          mode: "submit",
          runner: "piston",
          verdict: "accepted",
          passedCount: 3,
          totalCount: 1,
        }),
      }),
    );

    const after = await getPractice(slug, "python");
    assert.equal(after?.progress.status, before?.progress.status);
    assert.equal(after?.progress.solvedAt, before?.progress.solvedAt);
    assert.equal(after?.latestAccepted, null);
  });

  it("keeps the exact submitted source and ignores a duplicate request id", async () => {
    const requestId = crypto.randomUUID();
    const first = await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId,
      result: result({
        mode: "submit",
        runner: "mock",
        verdict: "accepted",
      }),
    });
    assert.equal(first.duplicate, false);

    const second = await persistRunResult({
      slug,
      language: "python",
      source: "class Solution:\n    pass\n",
      requestId,
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
      }),
    });
    assert.equal(second.duplicate, true);
    assert.equal(second.id, first.id);

    const stored = await getSubmission(first.id);
    assert.equal(stored?.source, SOURCE);
    assert.equal(stored?.runner, "mock");

    const history = await listSubmissions(slug, 100, 0);
    const matches = history?.items.filter((row) => row.requestId === requestId);
    assert.equal(matches?.length, 1);
  });

  it("imports once, skips repeats, and never treats legacy accepts as solved", async () => {
    const payload = {
      drafts: [
        {
          slug,
          language: "python" as const,
          source: "class Solution:\n    pass  # imported\n",
        },
      ],
      notes: [{ slug, approach: "imported approach" }],
      legacyAccepted: [
        {
          slug,
          language: "python" as const,
          source: "class Solution:\n    def twoSum(self, nums, target):\n        return [1, 0]\n",
          at: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    const first = await importPractice(payload);
    assert.equal(first.draftsInserted, 0);
    assert.equal(first.draftsSkipped, 1);
    assert.equal(first.legacyInserted, 1);

    const second = await importPractice(payload);
    assert.equal(second.draftsSkipped, 1);
    assert.equal(second.legacySkipped, 1);
    assert.equal(second.legacyInserted, 0);

    const state = await getPractice(slug, "python");
    assert.notEqual(state?.draft?.source, payload.drafts[0]?.source);
    assert.match(state?.draft?.source ?? "", /keep me/);
    assert.notEqual(state?.notes?.approach, "imported approach");
    assert.equal(state?.progress.status === "solved", false);
    assert.equal(state?.latestAccepted, null);
    assert.equal(state?.legacySnapshot?.label, "legacy snapshot");
    assert.equal(state?.legacySnapshot?.source, payload.legacyAccepted[0]?.source);
  });

  it("solves only on a genuine Piston Submit and keeps the original solvedAt", async () => {
    await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: result({
        mode: "submit",
        runner: "mock",
        verdict: "accepted",
      }),
    });
    let state = await getPractice(slug, "python");
    assert.notEqual(state?.progress.status, "solved");
    assert.equal(state?.latestAccepted, null);

    await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: result({
        mode: "run",
        runner: "piston",
        verdict: "accepted",
      }),
    });
    state = await getPractice(slug, "python");
    assert.equal(state?.progress.status, "attempted");
    assert.equal(state?.latestAccepted, null);

    const accepted = await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        pistonVersion: "3.12.0",
      }),
    });
    state = await getPractice(slug, "python");
    assert.equal(state?.progress.status, "solved");
    assert.ok(state?.progress.solvedAt);
    assert.equal(state?.latestAccepted?.id, accepted.id);
    assert.equal(state?.latestAccepted?.source, SOURCE);
    const solvedAt = state.progress.solvedAt;

    await persistRunResult({
      slug,
      language: "python",
      source: "class Solution:\n    pass\n",
      requestId: crypto.randomUUID(),
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "wrong_answer",
      }),
    });
    state = await getPractice(slug, "python");
    assert.equal(state?.progress.status, "solved");
    assert.equal(state?.progress.solvedAt, solvedAt);
    assert.equal(state?.latestAccepted?.id, accepted.id);
    assert.equal(state?.latestAccepted?.source, SOURCE);
  });
});
