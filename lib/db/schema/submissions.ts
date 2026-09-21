import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt } from "./columns";
import { languageEnum, runModeEnum, runnerKindEnum, verdictEnum } from "./enums";
import { problems } from "./problems";

/**
 * Execution history: one row per press of Run or Submit, plus one row per
 * reported case.
 *
 * The schema mirrors `RunResult` in lib/runner/types.ts so a stored run can be
 * rendered by the same console code, and `mode` is what separates a scratch run
 * from a judged submission. Runs are kept rather than discarded because the
 * tutor benefits from seeing what was already tried.
 *
 * Reads always apply Phase 2 disclosure: hidden successes stay status-and-
 * metrics; the first failing hidden case is revealed. The stored row may keep
 * the full executed payload so a later re-read does not invent a leakier DTO.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: languageEnum("language").notNull(),
    mode: runModeEnum("mode").notNull(),
    runner: runnerKindEnum("runner").notNull(),
    verdict: verdictEnum("verdict").notNull(),
    source: text("source").notNull(),
    /** The case selected in the console; only meaningful for `mode: "run"`. */
    testcaseIndex: integer("testcase_index"),
    passedCount: integer("passed_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    timeMs: integer("time_ms"),
    memoryKb: integer("memory_kb"),
    /** Compiler diagnostics, when the language has a compile step. */
    compileOutput: text("compile_output"),
    /**
     * The engine's version of the language this ran on (e.g. "3.12.0"). Kept
     * because a verdict is only reproducible against the runtime that produced
     * it, and reinstalling a runtime is a one-command change.
     */
    pistonVersion: text("piston_version"),
    /**
     * Snapshot of the catalog at execution time (the problem row's `updatedAt`
     * ISO string). Historical rows are never rewritten when a problem is reseeded.
     */
    catalogRevision: text("catalog_revision").notNull().default(""),
    /**
     * Client-supplied idempotency key. Null on rows written before the client
     * sent one; unique so a retry cannot insert a second history row.
     */
    requestId: uuid("request_id"),
    createdAt,
  },
  (t) => [
    // Console history and "what did I try on this problem".
    index("submissions_problem_created_idx").on(t.problemId, t.createdAt.desc()),
    // "Load into editor" reads the newest accepted row for a problem.
    index("submissions_accepted_idx")
      .on(t.problemId, t.createdAt.desc())
      .where(sql`${t.verdict} = 'accepted'`),
    // Verified solved restoration: Piston Submit only, never a Run or mock.
    index("submissions_verified_accepted_idx")
      .on(t.problemId, t.createdAt.desc())
      .where(
        sql`${t.verdict} = 'accepted' AND ${t.mode} = 'submit' AND ${t.runner} = 'piston'`,
      ),
    uniqueIndex("submissions_request_id_key").on(t.requestId),
    check("submissions_passed_lte_total", sql`${t.passedCount} <= ${t.totalCount}`),
  ],
);

/** One row per `CaseResult`, in the order the runner reported them. */
export const submissionCases = pgTable(
  "submission_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** Public slot within the visible group, or within the hidden group. */
    caseIndex: integer("case_index").notNull().default(0),
    status: verdictEnum("status").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    input: text("input").notNull().default(""),
    expected: text("expected").notNull().default(""),
    stdout: text("stdout"),
    /** User `print()` output, captured separately from the return value. */
    debug: text("debug"),
    stderr: text("stderr"),
    timeMs: integer("time_ms"),
    memoryKb: integer("memory_kb"),
  },
  (t) => [
    uniqueIndex("submission_cases_submission_position_key").on(
      t.submissionId,
      t.position,
    ),
  ],
);
