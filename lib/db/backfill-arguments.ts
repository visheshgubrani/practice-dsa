/**
 * Converts stored display stdin into `problem_testcases.arguments`.
 *
 * Runs between the add-column and drop-stdin migrations. Failures name the
 * problem, the case, and the parse error so a bad row is a catalog bug, not a
 * silent empty array. Historical `submission_cases` rows are snapshots and are
 * never rewritten.
 */

import { eq } from "drizzle-orm";

import {
  argumentsFromDisplayStdin,
  type ArgValue,
} from "@/lib/harness/args";
import type { ProblemSignature } from "@/lib/problems";

export type PendingRow = {
  id: string;
  slug: string;
  number: number;
  position: number;
  stdin: string;
  signature: ProblemSignature;
};

export type BackfillUpdate = { id: string; args: ArgValue[] };

export type BackfillPlan =
  | { ok: true; updates: BackfillUpdate[] }
  | { ok: false; failures: string[] };

/** Names a bad row so a catalog bug is fixable without a silent empty array. */
export function describeBackfillFailure(row: PendingRow, error: string): string {
  return (
    `${row.slug} (problem ${row.number}) case ${row.position + 1}: ${error}\n` +
    `    stdin: ${JSON.stringify(row.stdin)}`
  );
}

export function formatBackfillFailures(failures: readonly string[]): string {
  return (
    `Could not backfill problem_testcases.arguments (${failures.length} ` +
    `row${failures.length === 1 ? "" : "s"}):\n  ${failures.join("\n  ")}\n` +
    `Fix the stored stdin or signature, then re-run pnpm db:migrate.`
  );
}

/**
 * Converts stored display stdin into argument lists, or collects every
 * diagnostic. One bad row does not hide the next; any failure means no updates.
 */
export function planTestcaseArgumentBackfill(
  rows: readonly PendingRow[],
): BackfillPlan {
  const failures: string[] = [];
  const updates: BackfillUpdate[] = [];

  for (const row of rows) {
    const converted = argumentsFromDisplayStdin(row.stdin, row.signature);
    if (!converted.ok) {
      failures.push(describeBackfillFailure(row, converted.error));
      continue;
    }
    updates.push({ id: row.id, args: converted.values });
  }

  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, updates };
}

/**
 * Fills null `arguments` from `stdin` + the problem signature.
 *
 * No-op once `stdin` is gone, or when every row already has arguments. Throws
 * after collecting every failure so one bad case does not hide the next.
 *
 * The database client is loaded here, not at module top-level, so planner
 * tests do not open a pool.
 */
export async function backfillTestcaseArguments(): Promise<{ updated: number }> {
  const { db, pool } = await import("./index");
  const { problemTestcases } = await import("./schema");

  async function publicColumnExists(table: string, column: string): Promise<boolean> {
    const result = await pool.query(
      `select 1
         from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
        limit 1`,
      [table, column],
    );
    return (result.rowCount ?? 0) > 0;
  }

  if (!(await publicColumnExists("problem_testcases", "stdin"))) {
    return { updated: 0 };
  }
  if (!(await publicColumnExists("problem_testcases", "arguments"))) {
    return { updated: 0 };
  }

  const pending = await pool.query<PendingRow>(
    `select
       t.id,
       p.slug,
       p.number,
       t.position,
       t.stdin,
       p.signature
     from problem_testcases t
     join problems p on p.id = t.problem_id
     where t.arguments is null
     order by p.number, t.position`,
  );

  const plan = planTestcaseArgumentBackfill(pending.rows);
  if (!plan.ok) {
    throw new Error(formatBackfillFailures(plan.failures));
  }

  const { updates } = plan;
  if (updates.length === 0) return { updated: 0 };

  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(problemTestcases)
        .set({ args: update.args })
        .where(eq(problemTestcases.id, update.id));
    }
  });

  return { updated: updates.length };
}
