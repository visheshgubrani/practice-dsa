import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Postgres enum types.
 *
 * Every value list here is copied from a union the app already has, so a row
 * crosses from the database to the UI without a translation table:
 *
 *   difficulty -> Difficulty        (@/lib/problems)
 *   language   -> LanguageId        (lib/languages.ts)
 *   verdict    -> Verdict           (lib/runner/types.ts)
 *   run_mode   -> RunMode           (lib/runner/types.ts)
 *   runner_kind-> RunResult.runner  (lib/runner/types.ts)
 *   compare_mode -> CompareMode     (@/lib/problems)
 *
 * The TypeScript identifier is suffixed because the same file also exports the
 * tables, whose column names would otherwise collide. Adding a value later is an
 * additive `ALTER TYPE ... ADD VALUE` migration.
 */

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const languageEnum = pgEnum("language", [
  "cpp",
  "python",
  "java",
  "javascript",
]);

export const verdictEnum = pgEnum("verdict", [
  "accepted",
  "wrong_answer",
  "compile_error",
  "runtime_error",
  "time_limit_exceeded",
  "internal_error",
]);

export const runModeEnum = pgEnum("run_mode", ["run", "submit"]);

/**
 * `judge0` is history: Judge0 was the phase-2 plan and is never written. It is
 * kept in the type so the existing rows (there are none) still have a home, and
 * because dropping an enum value requires rewriting the type in Postgres.
 */
export const runnerKindEnum = pgEnum("runner_kind", ["mock", "piston", "judge0"]);

export const compareModeEnum = pgEnum("compare_mode", [
  "exact",
  "unordered",
  "unordered_outer",
  "index_pair",
  "intervals",
]);

export const chatRoleEnum = pgEnum("chat_role", [
  "user",
  "assistant",
  "system",
]);

/**
 * How far an assistant turn got. User turns are stored as `completed`.
 * Interrupted Stop / failed requests stay as rows so a retry can reuse the
 * same `ui_id` instead of inserting a duplicate.
 */
export const chatCompletionStatusEnum = pgEnum("chat_completion_status", [
  "pending",
  "completed",
  "failed",
  "aborted",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "todo",
  "attempted",
  "solved",
]);
