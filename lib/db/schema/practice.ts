import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns";
import { languageEnum, progressStatusEnum } from "./enums";
import { problems } from "./problems";

/**
 * Per-problem practice state — the durable home of the `dsa.*` localStorage
 * keys. Both tables are keyed by problem and hold nothing that can be derived
 * from `submissions`: attempt counts and "last tried at" are always computed,
 * never cached, so they cannot drift.
 *
 * `revision` is what a stale tab compares against before overwriting. Status
 * and `solvedAt` are written only from a verified Piston Submit, never from
 * the practice PATCH.
 */

/** One editor buffer per problem and language (`dsa.code.<slug>.<language>`). */
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: languageEnum("language").notNull(),
    source: text("source").notNull().default(""),
    /** Starts at 1; every save increments it. */
    revision: integer("revision").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("drafts_problem_language_key").on(t.problemId, t.language),
  ],
);

/**
 * One row per problem: where it stands and what the user wrote down about it
 * (`dsa.progress.<slug>`, `dsa.language.<slug>`, `dsa.notes.<slug>`).
 */
export const problemProgress = pgTable(
  "problem_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    status: progressStatusEnum("status").notNull().default("todo"),
    /**
     * Null means "no preference expressed", and the app keeps using its own
     * DEFAULT_LANGUAGE rather than the database inventing one.
     */
    preferredLanguage: languageEnum("preferred_language"),
    /** The user's own notes, seeded in the UI from the problem's reference notes. */
    userNotesApproach: text("user_notes_approach"),
    userNotesTimeComplexity: text("user_notes_time_complexity"),
    userNotesSpaceComplexity: text("user_notes_space_complexity"),
    /** Set once, when the first accepted submission flips `status` to solved. */
    solvedAt: timestamp("solved_at", { withTimezone: true }),
    /** Shared by notes and preferred language; every save of either increments it. */
    revision: integer("revision").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("problem_progress_problem_key").on(t.problemId),
  ],
);

/**
 * Browser `dsa.accepted.*` records imported as labeled snapshots. They are not
 * submissions and never flip `problem_progress.status` to solved — those
 * records may be mock runs or sample-only judging.
 */
export const legacyAccepted = pgTable(
  "legacy_accepted",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: languageEnum("language").notNull(),
    source: text("source").notNull(),
    /** The timestamp the browser stored, when it was a valid ISO string. */
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("legacy_accepted_problem_key").on(t.problemId)],
);
