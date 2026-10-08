import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { count, eq } from "drizzle-orm";

import { POST as postRateReview } from "../../../app/api/reviews/[slug]/rate/route";
import * as reviewRoute from "../../../app/api/reviews/[slug]/route";
import { db, pool } from "@/lib/db";
import {
  getReviewCard,
  listReviewQueue,
  rateReview,
  ReviewConflictError,
  ReviewNotEnrolledError,
  ReviewPausedError,
  ReviewRequestMismatchError,
  ReviewSubmissionError,
  ReviewSubmissionNotFoundError,
  reviewRateSchema,
  setReviewActive,
  writeReviewRating,
} from "@/lib/db/queries/reviews";
import {
  drafts,
  problemProgress,
  problems,
  reviewCards,
  reviewLogs,
  submissions,
} from "@/lib/db/schema";
import {
  emptyCard,
  serializeCard,
  SCHEDULER_VERSION,
} from "@/lib/reviews/scheduler";
import { EMPTY_REVIEW_CARD, REVIEW_RATINGS } from "@/lib/reviews/types";

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

async function insertLegacyUnratedCard(
  problemId: string,
  dueAt: Date,
  active = true,
) {
  const card = emptyCard(dueAt);
  const [row] = await db
    .insert(reviewCards)
    .values({
      problemId,
      active,
      dueAt: card.due,
      card: serializeCard(card),
      revision: 1,
      schedulerVersion: SCHEDULER_VERSION,
    })
    .returning();
  return row!;
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
  const [cards] = await db
    .select({ count: count() })
    .from(reviewCards)
    .where(eq(reviewCards.problemId, problemId));
  const [logs] = await db
    .select({ count: count() })
    .from(reviewLogs)
    .where(eq(reviewLogs.problemId, problemId));
  return {
    progress: progress!.count,
    drafts: draft!.count,
    submissions: submission!.count,
    cards: cards!.count,
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

  it("accepts revision zero and atomically schedules all four first ratings", async () => {
    assert.equal(await getReviewCard("__missing-review-problem__"), null);
    assert.deepEqual(await getReviewCard(firstProblem.slug), EMPTY_REVIEW_CARD);
    assert.equal(
      reviewRateSchema.safeParse({
        rating: "again",
        requestId: crypto.randomUUID(),
        expectedRevision: 0,
      }).success,
      true,
    );
    assert.equal(
      reviewRateSchema.safeParse({
        rating: "again",
        requestId: crypto.randomUUID(),
        expectedRevision: -1,
      }).success,
      false,
    );
    await assert.rejects(
      rateReview(firstProblem.slug, {
        rating: "again",
        requestId: crypto.randomUUID(),
        expectedRevision: 1,
      }, NOW),
      ReviewNotEnrolledError,
    );

    for (const rating of REVIEW_RATINGS) {
      const fixture = await insertProblem("initial-" + rating);
      try {
        const result = await rateReview(
          fixture.slug,
          { rating, requestId: crypto.randomUUID(), expectedRevision: 0 },
          NOW,
        );
        assert.equal(result?.revision, 2);
        assert.equal(result?.rating, rating);
        assert.equal(result?.reviewedAt, NOW.toISOString());
        const state = await getReviewCard(fixture.slug);
        assert.equal(state?.enrolled, true);
        assert.equal(state?.active, true);
        assert.equal(state?.lastRating, rating);
        assert.equal(state?.revision, 2);
        assert.ok(Date.parse(state!.dueAt!) > NOW.getTime());
        const queue = await listReviewQueue(NOW);
        assert.ok(queue.upcoming.some((item) => item.slug === fixture.slug));
        assert.ok(!queue.due.some((item) => item.slug === fixture.slug));
        assert.deepEqual(await problemCounts(fixture.id), {
          progress: 0,
          drafts: 0,
          submissions: 0,
          cards: 1,
          logs: 1,
        });
      } finally {
        await db.delete(problems).where(eq(problems.id, fixture.id));
      }
    }

    const againFixture = await insertProblem("initial-again-interval");
    try {
      const result = await rateReview(
        againFixture.slug,
        { rating: "again", requestId: crypto.randomUUID(), expectedRevision: 0 },
        NOW,
      );
      assert.equal(
        result?.dueAt,
        new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      );
    } finally {
      await db.delete(problems).where(eq(problems.id, againFixture.id));
    }
  });

  it("validates rating API requests and no longer exports enrollment PUT", async () => {
    assert.equal("PUT" in reviewRoute, false);
    const invalid = await postRateReview(
      new Request("http://localhost/api/reviews/bad/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: "good", expectedRevision: 0 }),
      }),
      { params: Promise.resolve({ slug: firstProblem.slug }) },
    );
    assert.equal(invalid.status, 400);

    const unknown = await postRateReview(
      new Request("http://localhost/api/reviews/missing/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: "good",
          requestId: crypto.randomUUID(),
          expectedRevision: 0,
        }),
      }),
      { params: Promise.resolve({ slug: "__missing-review-problem__" }) },
    );
    assert.equal(unknown.status, 404);
  });

  it("rolls back first enrollment and rating together on every failure", async () => {
    const before = await problemCounts(secondProblem.id);
    await assert.rejects(
      db.transaction(async (tx) => {
        await writeReviewRating(
          tx,
          secondProblem,
          {
            rating: "good",
            requestId: crypto.randomUUID(),
            expectedRevision: 0,
          },
          NOW,
        );
        throw new Error("force transaction rollback");
      }),
      /force transaction rollback/,
    );
    assert.deepEqual(await getReviewCard(secondProblem.slug), EMPTY_REVIEW_CARD);
    assert.deepEqual(await problemCounts(secondProblem.id), before);

    await assert.rejects(
      rateReview(secondProblem.slug, {
        rating: "good",
        requestId: crypto.randomUUID(),
        expectedRevision: 0,
        submissionId,
      }, NOW),
      ReviewSubmissionError,
    );
    assert.deepEqual(await getReviewCard(secondProblem.slug), EMPTY_REVIEW_CARD);
    await assert.rejects(
      rateReview(secondProblem.slug, {
        rating: "good",
        requestId: crypto.randomUUID(),
        expectedRevision: 0,
        submissionId: crypto.randomUUID(),
      }, NOW),
      ReviewSubmissionNotFoundError,
    );
    assert.deepEqual(await getReviewCard(secondProblem.slug), EMPTY_REVIEW_CARD);
    assert.deepEqual(await problemCounts(secondProblem.id), before);
  });

  it("replays the original request across later ratings and pause/resume", async () => {
    const firstCounts = await problemCounts(firstProblem.id);
    const firstInput = {
      rating: "good" as const,
      requestId: crypto.randomUUID(),
      expectedRevision: 0,
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
    assert.deepEqual(
      await rateReview(firstProblem.slug, firstInput, new Date("2026-02-01T00:00:00.000Z")),
      first,
    );

    await assert.rejects(
      rateReview(firstProblem.slug, { ...firstInput, rating: "easy" }, NOW),
      ReviewRequestMismatchError,
    );
    await assert.rejects(
      rateReview(
        firstProblem.slug,
        {
          rating: "hard",
          requestId: crypto.randomUUID(),
          expectedRevision: 0,
        },
        NOW,
      ),
      (error: unknown) => error instanceof ReviewConflictError && error.revision === 3,
    );

    const savedRows = await db
      .select({ requestId: reviewLogs.requestId, expectedRevision: reviewLogs.expectedRevision })
      .from(reviewLogs)
      .where(eq(reviewLogs.problemId, firstProblem.id));
    assert.equal(savedRows.length, 2);
    assert.deepEqual(savedRows.map((row) => row.expectedRevision).sort(), [0, 2]);
    assert.deepEqual(await problemCounts(firstProblem.id), {
      ...firstCounts,
      cards: 1,
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
    assert.deepEqual(await rateReview(firstProblem.slug, firstInput, new Date("2026-03-01T00:00:00.000Z")), first);
    assert.equal((await problemCounts(firstProblem.id)).logs, 2);
  });

  it("serializes retries and gives competing initial ratings one conflict", async () => {
    const retryFixture = await insertProblem("concurrent-retry");
    const competingFixture = await insertProblem("concurrent-initial");
    try {
      const input = {
        rating: "again" as const,
        requestId: crypto.randomUUID(),
        expectedRevision: 0,
      };
      const retries = await Promise.all([
        rateReview(retryFixture.slug, input, NOW),
        rateReview(retryFixture.slug, input, NOW),
      ]);
      assert.deepEqual(retries[0], retries[1]);
      assert.deepEqual(await problemCounts(retryFixture.id), {
        progress: 0,
        drafts: 0,
        submissions: 0,
        cards: 1,
        logs: 1,
      });

      const competing = await Promise.allSettled([
        rateReview(
          competingFixture.slug,
          { rating: "good", requestId: crypto.randomUUID(), expectedRevision: 0 },
          NOW,
        ),
        rateReview(
          competingFixture.slug,
          { rating: "easy", requestId: crypto.randomUUID(), expectedRevision: 0 },
          NOW,
        ),
      ]);
      assert.equal(competing.filter((entry) => entry.status === "fulfilled").length, 1);
      const rejected = competing.find((entry) => entry.status === "rejected");
      assert.ok(rejected?.status === "rejected" && rejected.reason instanceof ReviewConflictError);
      assert.equal(rejected.reason.revision, 2);
      assert.deepEqual(await problemCounts(competingFixture.id), {
        progress: 0,
        drafts: 0,
        submissions: 0,
        cards: 1,
        logs: 1,
      });
    } finally {
      await db.delete(problems).where(eq(problems.id, retryFixture.id));
      await db.delete(problems).where(eq(problems.id, competingFixture.id));
    }
  });

  it("rates an existing unrated card without resetting its enrollment", async () => {
    const fixture = await insertProblem("legacy-unrated");
    const oldDueAt = new Date("2025-12-01T00:00:00.000Z");
    try {
      const before = await insertLegacyUnratedCard(fixture.id, oldDueAt);
      const result = await rateReview(
        fixture.slug,
        { rating: "hard", requestId: crypto.randomUUID(), expectedRevision: 1 },
        NOW,
      );
      const [after] = await db
        .select()
        .from(reviewCards)
        .where(eq(reviewCards.problemId, fixture.id));
      assert.equal(after?.id, before.id);
      assert.equal(after?.revision, 2);
      assert.equal(after?.dueAt.toISOString(), result?.dueAt);
      const [log] = await db
        .select()
        .from(reviewLogs)
        .where(eq(reviewLogs.problemId, fixture.id));
      assert.equal(log?.expectedRevision, 1);
      assert.equal((log?.beforeCard as { due: string }).due, oldDueAt.toISOString());
      assert.equal((await getReviewCard(fixture.slug))?.lastRating, "hard");
      assert.equal((await problemCounts(fixture.id)).cards, 1);
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
      const secondCard = await insertLegacyUnratedCard(second.id, dueAt);
      const firstCard = await insertLegacyUnratedCard(first.id, dueAt);
      const relevant = (queue: Awaited<ReturnType<typeof listReviewQueue>>) =>
        [...queue.due, ...queue.upcoming].filter((item) => item.slug === first.slug || item.slug === second.slug);
      const early = await listReviewQueue(NOW);
      assert.deepEqual(relevant(early).map((item) => item.slug), [first.slug, second.slug]);
      assert.ok(early.upcoming.some((item) => item.slug === first.slug));
      assert.ok((await listReviewQueue(dueAt)).due.some((item) => item.slug === first.slug));
      await setReviewActive(first.slug, false, firstCard.revision);
      assert.deepEqual(relevant(await listReviewQueue(dueAt)).map((item) => item.slug), [second.slug]);
      assert.equal(secondCard.active, true);
    } finally {
      await db.delete(problems).where(eq(problems.id, first.id));
      await db.delete(problems).where(eq(problems.id, second.id));
    }
  });
});
