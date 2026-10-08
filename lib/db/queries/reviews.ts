import { and, asc, desc, eq, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { problems, reviewCards, reviewLogs } from "@/lib/db/schema";
import {
  emptyCard,
  restoreCard,
  scheduleRating,
  SCHEDULER_VERSION,
  serializeCard,
  serializeLog,
  type StoredCard,
} from "@/lib/reviews/scheduler";
import {
  EMPTY_REVIEW_CARD,
  REVIEW_RATINGS,
  type ReviewCardState,
  type ReviewLink,
  type ReviewQueue,
  type ReviewRateResult,
  type ReviewRating,
  type ReviewSummary,
} from "@/lib/reviews/types";

/**
 * Review cards and ratings. A rating writes the log and the card in one
 * transaction. It never writes submissions, drafts, or solved status.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type StoredCardRow = {
  active: boolean;
  dueAt: Date;
  revision: number;
  card: unknown;
};

export const reviewRateSchema = z
  .object({
    rating: z.enum(REVIEW_RATINGS),
    requestId: z.string().uuid().transform((value) => value.toLowerCase()),
    expectedRevision: z.number().int().min(0),
    submissionId: z
      .string()
      .uuid()
      .transform((value) => value.toLowerCase())
      .nullable()
      .optional(),
  })
  .strict();

export const reviewActiveSchema = z
  .object({
    active: z.boolean(),
    expectedRevision: z.number().int().min(1),
  })
  .strict();

export type ReviewRateInput = z.infer<typeof reviewRateSchema>;

export class ReviewConflictError extends Error {
  readonly revision: number;

  constructor(revision: number) {
    super("The review was updated in another tab.");
    this.name = "ReviewConflictError";
    this.revision = revision;
  }
}

export class ReviewRequestMismatchError extends Error {
  constructor() {
    super("This review was already saved with different input.");
    this.name = "ReviewRequestMismatchError";
  }
}

export class ReviewNotEnrolledError extends Error {
  constructor() {
    super("This problem is not in review.");
    this.name = "ReviewNotEnrolledError";
  }
}

export class ReviewPausedError extends Error {
  constructor() {
    super("This review is paused.");
    this.name = "ReviewPausedError";
  }
}

export class ReviewSubmissionNotFoundError extends Error {
  constructor() {
    super("That submission does not exist.");
    this.name = "ReviewSubmissionNotFoundError";
  }
}

export class ReviewSubmissionError extends Error {
  constructor() {
    super("That submission is not for this problem.");
    this.name = "ReviewSubmissionError";
  }
}

async function problemBySlug(slug: string) {
  return db.query.problems.findFirst({
    where: { slug },
    columns: { id: true, slug: true, number: true, title: true },
  });
}

function toIso(value: Date): string {
  return value.toISOString();
}

function assertCardDueAt(row: StoredCardRow): void {
  const card = restoreCard(row.card);
  if (card.due.getTime() !== row.dueAt.getTime()) {
    throw new Error("Review card due date does not match its stored card state.");
  }
}

async function lastRating(
  tx: Tx | typeof db,
  cardId: string,
): Promise<ReviewRating | null> {
  const [row] = await tx
    .select({ rating: reviewLogs.rating })
    .from(reviewLogs)
    .where(eq(reviewLogs.cardId, cardId))
    .orderBy(desc(reviewLogs.revisionAfter))
    .limit(1);
  return row?.rating ?? null;
}

function cardState(
  row: StoredCardRow,
  rating: ReviewRating | null,
): ReviewCardState {
  assertCardDueAt(row);
  return {
    enrolled: true,
    active: row.active,
    dueAt: toIso(row.dueAt),
    lastRating: rating,
    revision: row.revision,
  };
}

export async function getReviewCard(slug: string): Promise<ReviewCardState | null> {
  const problem = await problemBySlug(slug);
  if (!problem) return null;
  const row = await db.query.reviewCards.findFirst({
    where: { problemId: problem.id },
  });
  if (!row) return EMPTY_REVIEW_CARD;
  return cardState(row, await lastRating(db, row.id));
}

export async function listReviewQueue(now = new Date()): Promise<ReviewQueue> {
  const rows = await db
    .select({
      slug: problems.slug,
      number: problems.number,
      title: problems.title,
      difficulty: problems.difficulty,
      topic: problems.topic,
      dueAt: reviewCards.dueAt,
      active: reviewCards.active,
      card: reviewCards.card,
      revision: reviewCards.revision,
    })
    .from(reviewCards)
    .innerJoin(problems, eq(reviewCards.problemId, problems.id))
    .where(eq(reviewCards.active, true))
    .orderBy(
      asc(reviewCards.dueAt),
      asc(problems.position),
      asc(problems.number),
    );

  const due: ReviewSummary[] = [];
  const upcoming: ReviewSummary[] = [];
  for (const row of rows) {
    assertCardDueAt(row);
    const summary: ReviewSummary = {
      slug: row.slug,
      number: row.number,
      title: row.title,
      difficulty: row.difficulty,
      topic: row.topic,
      dueAt: toIso(row.dueAt),
      revision: row.revision,
    };
    if (row.dueAt.getTime() <= now.getTime()) due.push(summary);
    else upcoming.push(summary);
  }

  return {
    dueCount: due.length,
    due,
    upcoming,
    nextDueAt: upcoming[0]?.dueAt ?? null,
  };
}

async function nextDueLink(
  tx: Tx | typeof db,
  excludeSlug: string,
  now: Date,
): Promise<ReviewLink | null> {
  const [next] = await tx
    .select({
      slug: problems.slug,
      number: problems.number,
      title: problems.title,
    })
    .from(reviewCards)
    .innerJoin(problems, eq(reviewCards.problemId, problems.id))
    .where(
      and(
        eq(reviewCards.active, true),
        lte(reviewCards.dueAt, now),
        ne(problems.slug, excludeSlug),
      ),
    )
    .orderBy(
      asc(reviewCards.dueAt),
      asc(problems.position),
      asc(problems.number),
    )
    .limit(1);

  return next ? { slug: next.slug, number: next.number, title: next.title } : null;
}

export async function setReviewActive(
  slug: string,
  active: boolean,
  expectedRevision: number,
): Promise<ReviewCardState | null> {
  const problem = await problemBySlug(slug);
  if (!problem) return null;

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(reviewCards)
      .where(eq(reviewCards.problemId, problem.id))
      .for("update");
    if (!locked) throw new ReviewNotEnrolledError();
    if (locked.revision !== expectedRevision) {
      throw new ReviewConflictError(locked.revision);
    }
    if (locked.active === active) {
      return cardState(locked, await lastRating(tx, locked.id));
    }

    const [updated] = await tx
      .update(reviewCards)
      .set({ active, revision: locked.revision + 1 })
      .where(
        and(eq(reviewCards.id, locked.id), eq(reviewCards.revision, locked.revision)),
      )
      .returning();
    if (!updated) throw new ReviewConflictError(locked.revision);
    return cardState(updated, await lastRating(tx, updated.id));
  });
}

function sameRequest(
  row: {
    problemId: string;
    rating: ReviewRating;
    expectedRevision: number;
    submissionId: string | null;
  },
  problemId: string,
  input: ReviewRateInput,
): boolean {
  return (
    row.problemId === problemId &&
    row.rating === input.rating &&
    row.expectedRevision === input.expectedRevision &&
    row.submissionId === (input.submissionId ?? null)
  );
}

function outcomeFromLog(row: {
  rating: ReviewRating;
  requestId: string;
  reviewedAt: Date;
  afterCard: StoredCard;
  revisionAfter: number;
  next: ReviewLink | null;
}): ReviewRateResult {
  const after = restoreCard(row.afterCard);
  return {
    dueAt: after.due.toISOString(),
    revision: row.revisionAfter,
    rating: row.rating,
    requestId: row.requestId,
    reviewedAt: toIso(row.reviewedAt),
    next: row.next,
  };
}

/**
 * Lock the request ID and card, append one log, and store the next FSRS state.
 * An expected revision of zero creates the card in this transaction. Caller
 * owns the transaction so any later failure rolls both writes back.
 */
export async function writeReviewRating(
  tx: Tx,
  problem: { id: string; slug: string },
  input: ReviewRateInput,
  now: Date,
): Promise<ReviewRateResult> {
  input = reviewRateSchema.parse(input);
  // Serializes even a request-ID collision across two different problem cards.
  const requestId = input.requestId;
  await tx.execute(
    sql.raw(
      "select pg_advisory_xact_lock(hashtextextended('" + requestId + "', 0))",
    ),
  );

  const prior = await tx.query.reviewLogs.findFirst({
    where: { requestId },
  });
  if (prior) {
    if (!sameRequest(prior, problem.id, input)) {
      throw new ReviewRequestMismatchError();
    }
    return outcomeFromLog(prior);
  }

  let createdCard = false;
  if (input.expectedRevision === 0) {
    const fresh = emptyCard(now);
    const [inserted] = await tx
      .insert(reviewCards)
      .values({
        problemId: problem.id,
        active: true,
        dueAt: fresh.due,
        card: serializeCard(fresh),
        revision: 1,
        schedulerVersion: SCHEDULER_VERSION,
      })
      .onConflictDoNothing({ target: reviewCards.problemId })
      .returning({ id: reviewCards.id });
    if (!inserted) {
      const [current] = await tx
        .select({ revision: reviewCards.revision })
        .from(reviewCards)
        .where(eq(reviewCards.problemId, problem.id))
        .for("update");
      throw new ReviewConflictError(current?.revision ?? 0);
    }
    createdCard = true;
  }

  const [locked] = await tx
    .select()
    .from(reviewCards)
    .where(eq(reviewCards.problemId, problem.id))
    .for("update");
  if (!locked) throw new ReviewNotEnrolledError();
  const revisionMatches = createdCard
    ? input.expectedRevision === 0 && locked.revision === 1
    : locked.revision === input.expectedRevision;
  if (!revisionMatches) {
    throw new ReviewConflictError(locked.revision);
  }
  if (!locked.active) throw new ReviewPausedError();
  assertCardDueAt(locked);

  if (input.submissionId) {
    const submission = await tx.query.submissions.findFirst({
      where: { id: input.submissionId },
      columns: { id: true, problemId: true },
    });
    if (!submission) throw new ReviewSubmissionNotFoundError();
    if (submission.problemId !== problem.id) throw new ReviewSubmissionError();
  }

  const before = restoreCard(locked.card);
  const scheduled = scheduleRating(before, input.rating, now);
  const after = serializeCard(scheduled.card);
  const revisionAfter = locked.revision + 1;

  const [updated] = await tx
    .update(reviewCards)
    .set({
      dueAt: scheduled.card.due,
      card: after,
      revision: revisionAfter,
      schedulerVersion: SCHEDULER_VERSION,
    })
    .where(
      and(eq(reviewCards.id, locked.id), eq(reviewCards.revision, locked.revision)),
    )
    .returning({ id: reviewCards.id });
  if (!updated) throw new ReviewConflictError(locked.revision);

  const next = await nextDueLink(tx, problem.slug, now);
  await tx.insert(reviewLogs).values({
    requestId,
    problemId: problem.id,
    cardId: locked.id,
    rating: input.rating,
    expectedRevision: input.expectedRevision,
    reviewedAt: now,
    beforeCard: serializeCard(before),
    afterCard: after,
    fsrsLog: serializeLog(scheduled.log),
    schedulerVersion: SCHEDULER_VERSION,
    revisionAfter,
    // Drizzle maps a JS null to SQL NULL; this required JSONB snapshot needs
    // the JSON literal null when the queue has no other due problem.
    next: next ?? sql`'null'::jsonb`,
    submissionId: input.submissionId ?? null,
  });

  return {
    dueAt: scheduled.card.due.toISOString(),
    revision: revisionAfter,
    rating: input.rating,
    requestId,
    reviewedAt: now.toISOString(),
    next,
  };
}

export async function rateReview(
  slug: string,
  input: ReviewRateInput,
  now = new Date(),
): Promise<ReviewRateResult | null> {
  const problem = await problemBySlug(slug);
  if (!problem) return null;
  return db.transaction((tx) => writeReviewRating(tx, problem, input, now));
}
