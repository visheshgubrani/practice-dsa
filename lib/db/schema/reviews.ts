import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { StoredCard, StoredReviewLog } from "@/lib/reviews/scheduler";
import type { ReviewLink } from "@/lib/reviews/types";

import { timestamps } from "./columns";
import { reviewRatingEnum } from "./enums";
import { problems } from "./problems";
import { submissions } from "./submissions";

/**
 * One FSRS card per problem. Enrollment is manual: a migration must not insert
 * rows for problems the user has already solved.
 *
 * `dueAt` is the card's due instant, duplicated out of the jsonb so the
 * dashboard can index it. Eligibility is `active && dueAt <= now` in UTC,
 * independent of the streak's stored day keys.
 *
 * `revision` is what a stale tab compares against. Pause flips `active` and
 * leaves the card jsonb, the due instant, and the log alone.
 */

export const reviewCards = pgTable(
  "review_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    card: jsonb("card").$type<StoredCard>().notNull(),
    /** Starts at 1; every enroll-preserving write increments it. */
    revision: integer("revision").notNull().default(1),
    schedulerVersion: text("scheduler_version").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("review_cards_problem_key").on(t.problemId),
    index("review_cards_due_at_idx").on(t.dueAt),
  ],
);

/**
 * One row per saved rating. `requestId` makes a retry of the same click return
 * the original outcome instead of scheduling twice.
 *
 * The before/after snapshots are the card at the decision, so a later catalog
 * change cannot rewrite the review. `submissionId` is optional context — a
 * rating is a self-assessment and does not require a Submit.
 */
export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => reviewCards.id, { onDelete: "cascade" }),
    rating: reviewRatingEnum("rating").notNull(),
    expectedRevision: integer("expected_revision").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    beforeCard: jsonb("before_card").$type<StoredCard>().notNull(),
    afterCard: jsonb("after_card").$type<StoredCard>().notNull(),
    fsrsLog: jsonb("fsrs_log").$type<StoredReviewLog>().notNull(),
    schedulerVersion: text("scheduler_version").notNull(),
    /** The card revision after this rating was saved. */
    revisionAfter: integer("revision_after").notNull(),
    /** Snapshot of the next due problem returned for idempotent retries. */
    next: jsonb("next").$type<ReviewLink | null>().notNull(),
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("review_logs_request_id_key").on(t.requestId),
    index("review_logs_card_reviewed_idx").on(t.cardId, t.reviewedAt),
  ],
);
