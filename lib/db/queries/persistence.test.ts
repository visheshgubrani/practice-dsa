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
import { problemProgress, problems } from "@/lib/db/schema";
import { dayKey, utcOffsetMinutesFor } from "@/lib/practice/days";
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
        // A real topic: the check constraint refuses a blank one, which is what
        // keeps an unclassified problem from silently reaching the dashboard.
        topic: "Stack",
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

/**
 * Revising is the feature that made the day stamp necessary: a revise is a real
 * Submit (it must count for the streak) that must not touch solved state. These
 * cases own their own problem row so they do not depend on the order above.
 */
describe("revision sessions", () => {
  let slug = "";

  before(async () => {
    slug = await insertFixture();
  });

  after(async () => {
    if (slug) {
      await db.delete(problems).where(eq(problems.slug, slug));
    }
  });

  async function solve(): Promise<string> {
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
    return accepted.id;
  }

  it("records a revise as its own row on the viewer's local day", async () => {
    const acceptedId = await solve();
    const solved = await getPractice(slug, "python");
    const solvedAt = solved?.progress.solvedAt;
    assert.ok(solvedAt);

    // IST: an instant at 20:00 UTC is already the next day locally.
    const revise = await persistRunResult({
      slug,
      language: "python",
      source: `${SOURCE}# second pass\n`,
      requestId: crypto.randomUUID(),
      utcOffsetMinutes: 330,
      revision: true,
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "wrong_answer",
      }),
    });

    const stored = await getSubmission(revise.id);
    assert.equal(stored?.isRevision, true);
    const expectedDay = dayKey(new Date(stored!.createdAt), 330);
    assert.equal(stored?.day, expectedDay);

    const state = await getPractice(slug, "python");
    assert.equal(state?.progress.status, "solved");
    assert.equal(state?.progress.solvedAt, solvedAt);
    assert.equal(state?.latestAccepted?.id, acceptedId);

    const history = await listSubmissions(slug, 50, 0);
    const reviseRow = history?.items.find((row) => row.id === revise.id);
    assert.equal(reviseRow?.isRevision, true);
    assert.equal(
      history?.items.find((row) => row.id === acceptedId)?.isRevision,
      false,
    );
  });

  it("lets a revise accept without rewriting the first solve", async () => {
    const before = await getPractice(slug, "python");
    const solvedAt = before?.progress.solvedAt;

    const revise = await persistRunResult({
      slug,
      language: "python",
      source: `${SOURCE}# third pass\n`,
      requestId: crypto.randomUUID(),
      utcOffsetMinutes: -480,
      revision: true,
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        pistonVersion: "3.12.0",
      }),
    });

    const state = await getPractice(slug, "python");
    assert.equal(state?.progress.status, "solved");
    assert.equal(state?.progress.solvedAt, solvedAt);
    assert.equal(state?.latestAccepted?.id, revise.id);
    assert.equal(state?.latestAccepted?.source, `${SOURCE}# third pass\n`);
  });

  it("stamps a request without an offset with the server's own", async () => {
    const stored = await persistRunResult({
      slug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      result: result({ mode: "run", runner: "piston", verdict: "wrong_answer" }),
    });

    const row = await getSubmission(stored.id);
    assert.equal(
      row?.day,
      dayKey(new Date(row!.createdAt), utcOffsetMinutesFor(new Date(row!.createdAt))),
    );
  });
});

describe("review submissions", () => {
  let unsolvedSlug = "";
  let solvedSlug = "";
  const savedDraft = "# saved practice draft\n";
  const reviewSource = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n";

  before(async () => {
    unsolvedSlug = await insertFixture();
    solvedSlug = await insertFixture();
  });

  after(async () => {
    if (unsolvedSlug) {
      await db.delete(problems).where(eq(problems.slug, unsolvedSlug));
    }
    if (solvedSlug) {
      await db.delete(problems).where(eq(problems.slug, solvedSlug));
    }
  });

  it("lets an unsolved review Submit create the first solve without saving its buffer", async () => {
    const revise = await persistRunResult({
      slug: unsolvedSlug,
      language: "python",
      source: reviewSource,
      requestId: crypto.randomUUID(),
      sessionMode: "revise",
      result: result({ mode: "submit", runner: "piston", verdict: "accepted" }),
    });
    assert.equal((await getSubmission(revise.id))?.isRevision, true);
    assert.equal((await getPractice(unsolvedSlug, "python"))?.progress.status, "todo");
    assert.equal((await getPractice(unsolvedSlug, "python"))?.progress.revision, 0);

    await patchPractice(unsolvedSlug, {
      draft: { source: savedDraft, revision: 0 },
    });

    const accepted = await persistRunResult({
      slug: unsolvedSlug,
      language: "python",
      source: reviewSource,
      requestId: crypto.randomUUID(),
      sessionMode: "review",
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        pistonVersion: "3.12.0",
      }),
    });

    const submission = await getSubmission(accepted.id);
    const state = await getPractice(unsolvedSlug, "python");
    assert.equal(submission?.isRevision, false);
    assert.equal(state?.progress.status, "solved");
    assert.ok(state?.progress.solvedAt);
    assert.equal(state?.latestAccepted?.source, reviewSource);
    assert.equal(state?.draft?.source, savedDraft);
  });

  it("records a solved review Submit as a revision and preserves solve date and draft", async () => {
    await patchPractice(solvedSlug, {
      draft: { source: savedDraft, revision: 0 },
    });
    await persistRunResult({
      slug: solvedSlug,
      language: "python",
      source: SOURCE,
      requestId: crypto.randomUUID(),
      sessionMode: "practice",
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        pistonVersion: "3.12.0",
      }),
    });
    const before = await getPractice(solvedSlug, "python");
    assert.ok(before?.progress.solvedAt);

    const revision = await persistRunResult({
      slug: solvedSlug,
      language: "python",
      source: reviewSource,
      requestId: crypto.randomUUID(),
      sessionMode: "review",
      result: result({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        pistonVersion: "3.12.0",
      }),
    });

    const submission = await getSubmission(revision.id);
    const after = await getPractice(solvedSlug, "python");
    assert.equal(submission?.isRevision, true);
    assert.equal(after?.progress.solvedAt, before?.progress.solvedAt);
    assert.equal(after?.draft?.source, savedDraft);
  });
});

describe("personal note fields", () => {
  let slug = "";

  before(async () => {
    slug = await insertFixture();
  });

  after(async () => {
    if (slug) {
      await db.delete(problems).where(eq(problems.slug, slug));
    }
  });

  it("reads null steps and pitfalls as empty strings", async () => {
    const problem = await db.query.problems.findFirst({
      where: { slug },
      columns: { id: true },
    });
    assert.ok(problem);
    await db.insert(problemProgress).values({
      problemId: problem.id,
      userNotesApproach: "kept",
      userNotesTimeComplexity: "O(1)",
      userNotesSpaceComplexity: "O(1)",
    });

    const state = await getPractice(slug, "python");
    assert.equal(state?.notes?.approach, "kept");
    assert.equal(state?.notes?.steps, "");
    assert.equal(state?.notes?.pitfalls, "");
    assert.equal(state?.notes?.timeComplexity, "O(1)");
  });

  it("round-trips the new fields and keeps an emptied approach", async () => {
    const current = await getPractice(slug, "python");
    const saved = await patchPractice(slug, {
      notes: {
        steps: "store complements",
        pitfalls: "same index twice",
      },
      progressRevision: current?.progress.revision,
    });
    assert.equal(saved?.notes?.approach, "kept");
    assert.equal(saved?.notes?.steps, "store complements");
    assert.equal(saved?.notes?.pitfalls, "same index twice");

    const cleared = await patchPractice(slug, {
      notes: { approach: "" },
      progressRevision: saved?.progress.revision,
    });
    assert.equal(cleared?.notes?.approach, "");
    assert.equal(cleared?.notes?.steps, "store complements");
    assert.equal(cleared?.notes?.pitfalls, "same index twice");
    assert.equal(cleared?.progress.status, "todo");
    assert.equal(cleared?.progress.solvedAt, null);
  });

  it("rejects a stale notes write and keeps the newer text", async () => {
    const current = await getPractice(slug, "python");
    const revision = current?.progress.revision;
    assert.equal(typeof revision, "number");

    await patchPractice(slug, {
      notes: { approach: "newer tab" },
      progressRevision: revision,
    });

    await assert.rejects(
      () =>
        patchPractice(slug, {
          notes: { approach: "stale overwrite", steps: "lost" },
          progressRevision: revision,
        }),
      (error: unknown) =>
        error instanceof PracticeConflictError && error.resource === "progress",
    );

    const kept = await getPractice(slug, "python");
    assert.equal(kept?.notes?.approach, "newer tab");
    assert.equal(kept?.notes?.steps, "store complements");
    assert.notEqual(kept?.notes?.steps, "lost");
  });

  it("treats a concurrent first notes insert as a conflict", async () => {
    const fresh = await insertFixture();
    try {
      const results = await Promise.allSettled([
        patchPractice(fresh, {
          notes: { approach: "one", steps: "alpha" },
          progressRevision: 0,
        }),
        patchPractice(fresh, {
          notes: { approach: "two", steps: "beta" },
          progressRevision: 0,
        }),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      assert.equal(fulfilled.length, 1);
      assert.equal(rejected.length, 1);
      assert.ok(rejected[0]?.status === "rejected");
      assert.ok(rejected[0].reason instanceof PracticeConflictError);
      assert.equal(rejected[0].reason.resource, "progress");

      const state = await getPractice(fresh, "python");
      const approach = state?.notes?.approach;
      assert.ok(approach === "one" || approach === "two");
      assert.equal(state?.notes?.steps, approach === "one" ? "alpha" : "beta");
      assert.equal(state?.progress.status, "todo");
    } finally {
      await db.delete(problems).where(eq(problems.slug, fresh));
    }
  });
});

/**
 * Closing the pool belongs to the file, not to a suite: `node --test` may run
 * test files in one process, and a suite that ended the pool would take the
 * next suite's queries down with it. Closing it here is what lets the process
 * exit instead of hanging on an idle client.
 */
after(async () => {
  await pool.end();
});
