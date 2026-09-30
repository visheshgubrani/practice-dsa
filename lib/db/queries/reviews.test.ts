import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq, count } from "drizzle-orm";

import { db, pool } from "@/lib/db";
import {
  enrollReview,
  getReviewCard,
  listReviewQueue,
  rateReview,
  ReviewConflictError,
  ReviewNotEnrolledError,
  ReviewPausedError,
  ReviewRequestMismatchError,
  ReviewSubmissionError,
  ReviewSubmissionNotFoundError,
  setReviewActive,
  writeReviewRating,
} from "@/lib/db/queries/reviews";
import {
  drafts,
  problemProgress,
  problems,
  reviewLogs,
  submissions,
} from "@/lib/db/schema";

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};
const NOW = new Date("2026-01-02T03:04:05.000Z");

async function insertProblem(suffix: string): Promise<{ slug: string; id: string }> {
  const slug = "__review-" + suffix + "-" + crypto.randomUUID();
  const [row] = await db
    .insert(problems)
    .values({
      slug,
      number: 9_700_000 + Math.floor(Math.random() * 20_000),
      position: 9_700_000,
      title: "Review persistence fixture",
      difficulty: "easy",
      topic: "Stack",
      statement: "fixture — not a catalog problem",
      signature: SIGNATURE,
    })
    .returning({ id: problems.id });
  return { slug, id: row!.id };
}

async function problemCounts(problemId: string) {
  const [progress] = await db
    .select({ count: count() })
    .from(problemProgress)
    .where(eq(problemProgress.problemId, problemId));
  const [draft] = await db
    .select({ count: count() })
    .from(drafts)
    .where(eq(drafts.problemId, problemId));
  const [submission] = await db
    .select({ count: count() })
    .from(submissions)
    .where(eq(submissions.problemId, problemId));
  const [logs] = await db
    .select({ count: count() })
    .from(reviewLogs)
    .where(eq(reviewLogs.problemId, problemId));
  return {
    progress: progress!.count,
    drafts: draft!.count,
    submissions: submission!.count,
    logs: logs!.count,
  };
}

describe("review persistence", () => {
  let firstProblem = { slug: "", id: "" };
  let secondProblem = { slug: "", id: "" };
  let submissionId = "";

  before(async () => {
    firstProblem = await insertProblem("one");
    secondProblem = await insertProblem("two");
    const [submission] = await db
      .insert(submissions)
      .values({
        problemId: firstProblem.id,
        language: "python",
        mode: "run",
        runner: "piston",
        verdict: "wrong_answer",
        source: "class Solution:\n    pass\n",
        catalogRevision: "review-fixture",
      })
      .returning({ id: submissions.id });
    submissionId = submission!.id;
  });

  after(async () => {
    if (firstProblem.id) {
      await db.delete(problems).where(eq(problems.id, firstProblem.id));
    }
    if (secondProblem.id) {
      await db.delete(problems).where(eq(problems.id, secondProblem.id));
    }
    await pool.end();
  });

  it("enrolls idempotently, rates atomically, and preserves practice data", async () => {
    assert.equal(await getReviewCard("__missing-review-problem__"), null);
    const firstCounts = await problemCounts(firstProblem.id);
    await assert.rejects(
      rateReview(firstProblem.slug, {
        rating: "again",
        requestId: crypto.randomUUID(),
        expectedRevision: 1,
      }, NOW),
      ReviewNotEnrolledError,
    );
    const enrolled = await enrollReview(firstProblem.slug, NOW);
    assert.deepEqual(enrolled, {
      enrolled: true,
      active: true,
      dueAt: NOW.toISOString(),
      lastRating: null,
      revision: 1,
    });
    assert.deepEqual(await enrollReview(firstProblem.slug, new Date("2026-02-01T00:00:00.000Z")), enrolled);

    const secondEnrolled = await enrollReview(secondProblem.slug, NOW);
    assert.equal(secondEnrolled?.revision, 1);
    const secondBefore = await getReviewCard(secondProblem.slug);
    await assert.rejects(
      db.transaction(async (tx) => {
        await writeReviewRating(
          tx,
          secondProblem,
          {
            rating: "good",
            requestId: crypto.randomUUID(),
            expectedRevision: 1,
          },
          NOW,
        );
        throw new Error("force transaction rollback");
      }),
      /force transaction rollback/,
    );
    assert.deepEqual(await getReviewCard(secondProblem.slug), secondBefore);
    assert.deepEqual(await problemCounts(secondProblem.id), {
      progress: 0,
      drafts: 0,
      submissions: 0,
      logs: 0,
    });

    await assert.rejects(
      rateReview(secondProblem.slug, {
        rating: "good",
        requestId: crypto.randomUUID(),
        expectedRevision: 1,
        submissionId,
      }, NOW),
      ReviewSubmissionError,
    );
    await assert.rejects(
      rateReview(secondProblem.slug, {
        rating: "good",
        requestId: crypto.randomUUID(),
        expectedRevision: 1,
        submissionId: crypto.randomUUID(),
      }, NOW),
      ReviewSubmissionNotFoundError,
    );

    const requestId = crypto.randomUUID();
    const firstInput = {
      rating: "good" as const,
      requestId,
      expectedRevision: 1,
      submissionId,
    };
    const first = await rateReview(firstProblem.slug, firstInput, NOW);
    assert.equal(first?.revision, 2);
    assert.equal(first?.rating, "good");
    assert.equal(first?.reviewedAt, NOW.toISOString());
    assert.equal(typeof first?.dueAt, "string");

    const second = await rateReview(
      firstProblem.slug,
      {
        rating: "again",
        requestId: crypto.randomUUID(),
        expectedRevision: 2,
      },
      new Date("2026-01-10T03:04:05.000Z"),
    );
    assert.equal(second?.revision, 3);
    assert.deepEqual(await rateReview(firstProblem.slug, firstInput, new Date("2026-02-01T00:00:00.000Z")), first);

    await assert.rejects(
      rateReview(
        firstProblem.slug,
        { ...firstInput, rating: "easy" },
        new Date("2026-02-01T00:00:00.000Z"),
      ),
      ReviewRequestMismatchError,
    );
    await assert.rejects(
      rateReview(
        firstProblem.slug,
        {
          rating: "hard",
          requestId: crypto.randomUUID(),
          expectedRevision: 1,
        },
        new Date("2026-02-01T00:00:00.000Z"),
      ),
      (error: unknown) => error instanceof ReviewConflictError && error.revision === 3,
    );

    const savedRows = await db
      .select({ requestId: reviewLogs.requestId, expectedRevision: reviewLogs.expectedRevision })
      .from(reviewLogs)
      .where(eq(reviewLogs.problemId, firstProblem.id));
    assert.equal(savedRows.length, 2);
    assert.deepEqual(savedRows.map((row) => row.expectedRevision).sort(), [1, 2]);
    assert.deepEqual(await problemCounts(firstProblem.id), {
      ...firstCounts,
      logs: 2,
    });

    const beforePause = await getReviewCard(firstProblem.slug);
    const paused = await setReviewActive(firstProblem.slug, false, beforePause!.revision);
    assert.equal(paused?.active, false);
    assert.equal(paused?.dueAt, beforePause?.dueAt);
    assert.equal(paused?.revision, beforePause!.revision + 1);
    await assert.rejects(
      rateReview(
        firstProblem.slug,
        {
          rating: "good",
          requestId: crypto.randomUUID(),
          expectedRevision: paused!.revision,
        },
        new Date("2026-02-01T00:00:00.000Z"),
      ),
      ReviewPausedError,
    );

    const resumed = await setReviewActive(firstProblem.slug, true, paused!.revision);
    assert.equal(resumed?.active, true);
    assert.equal(resumed?.dueAt, paused?.dueAt);
    assert.equal(resumed?.lastRating, "again");
    assert.equal(resumed?.revision, paused!.revision + 1);
    assert.deepEqual(await enrollReview(firstProblem.slug, new Date("2026-03-01T00:00:00.000Z")), resumed);
    assert.equal((await problemCounts(firstProblem.id)).logs, 2);
  });

  it("serializes concurrent retries and rejects a different stale-tab rating", async () => {
    const fixture = await insertProblem("concurrent");
    try {
      const enrolled = await enrollReview(fixture.slug, NOW);
      const input = {
        rating: "again" as const,
        requestId: crypto.randomUUID(),
        expectedRevision: enrolled!.revision,
      };
      const retries = await Promise.all([
        rateReview(fixture.slug, input, NOW),
        rateReview(fixture.slug, input, NOW),
      ]);
      assert.deepEqual(retries[0], retries[1]);
      assert.equal((await problemCounts(fixture.id)).logs, 1);

      const revision = retries[0]!.revision;
      const competing = await Promise.allSettled([
        rateReview(fixture.slug, { ...input, requestId: crypto.randomUUID(), expectedRevision: revision }, NOW),
        rateReview(fixture.slug, { ...input, rating: "easy", requestId: crypto.randomUUID(), expectedRevision: revision }, NOW),
      ]);
      assert.equal(competing.filter((entry) => entry.status === "fulfilled").length, 1);
      const rejected = competing.find((entry) => entry.status === "rejected");
      assert.ok(rejected?.status === "rejected" && rejected.reason instanceof ReviewConflictError);
      assert.equal((await problemCounts(fixture.id)).logs, 2);
    } finally {
      await db.delete(problems).where(eq(problems.id, fixture.id));
    }
  });

  it("saves and replays a rating with no next due problem", async () => {
    const fixture = await insertProblem("last-in-queue");
    try {
      // Earlier than all other fixture due dates, so this is the only due card.
      const now = new Date("1970-01-01T00:00:00.000Z");
      await enrollReview(fixture.slug, now);
      const input = { rating: "again" as const, requestId: crypto.randomUUID(), expectedRevision: 1 };
      const saved = await rateReview(fixture.slug, input, now);
      assert.equal(saved?.next, null);
      assert.equal(saved?.revision, 2);
      assert.equal((await problemCounts(fixture.id)).logs, 1);
      assert.deepEqual(await rateReview(fixture.slug, input, now), saved);
    } finally {
      await db.delete(problems).where(eq(problems.id, fixture.id));
    }
  });

  it("orders equal due dates by catalog position and excludes paused cards", async () => {
    const first = await insertProblem("queue-first");
    const second = await insertProblem("queue-second");
    try {
      await db.update(problems).set({ position: 9_700_001 }).where(eq(problems.id, first.id));
      await db.update(problems).set({ position: 9_700_002 }).where(eq(problems.id, second.id));
      const dueAt = new Date("2099-01-01T00:00:00.000Z");
      await enrollReview(second.slug, dueAt);
      const enrolled = await enrollReview(first.slug, dueAt);
      const relevant = (queue: Awaited<ReturnType<typeof listReviewQueue>>) =>
        [...queue.due, ...queue.upcoming].filter((item) => item.slug === first.slug || item.slug === second.slug);
      const early = await listReviewQueue(NOW);
      assert.deepEqual(relevant(early).map((item) => item.slug), [first.slug, second.slug]);
      assert.ok(early.upcoming.some((item) => item.slug === first.slug));
      assert.ok((await listReviewQueue(dueAt)).due.some((item) => item.slug === first.slug));
      await setReviewActive(first.slug, false, enrolled!.revision);
      assert.deepEqual(relevant(await listReviewQueue(dueAt)).map((item) => item.slug), [second.slug]);
    } finally {
      await db.delete(problems).where(eq(problems.id, first.id));
      await db.delete(problems).where(eq(problems.id, second.id));
    }
  });
});
