import { sql } from "drizzle-orm";
import {
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
    createdAt,
  },
  (t) => [
    // Console history and "what did I try on this problem".
    index("submissions_problem_created_idx").on(t.problemId, t.createdAt.desc()),
    // "Load into editor" reads the newest accepted row for a problem.
    index("submissions_accepted_idx")
      .on(t.problemId, t.createdAt.desc())
      .where(sql`${t.verdict} = 'accepted'`),
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
    status: verdictEnum("status").notNull(),
    input: text("input").notNull().default(""),
    expected: text("expected").notNull().default(""),
    stdout: text("stdout"),
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
