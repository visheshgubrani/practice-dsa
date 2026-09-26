/**
 * Stamps `submissions.day` for rows that predate the column.
 *
 * The streak calendar groups by `day`, so a submission row with a null day is
 * invisible to it. Before the column existed there was no recorded offset
 * either, so the only honest answer is the UTC day of `created_at` — which is
 * what the column default of 0 means for those rows, and why this stamps them
 * rather than inventing a local day nobody recorded.
 *
 * No-op once the column is gone or every row already has a day, so it is safe
 * to run after every migration, exactly like the testcase-arguments backfill.
 *
 * The database client is loaded inside the executor, not at module top-level,
 * so planner tests do not open a pool.
 */

import { dayKey } from "@/lib/practice/days";

export type PendingSubmissionDay = {
  id: string;
  createdAt: Date;
  utcOffsetMinutes: number;
};

export type DayUpdate = { id: string; day: string };

/**
 * The day each pending row belongs to, from its own timestamp and offset.
 *
 * Pure for the same reason the testcase planner is: the rule is worth testing
 * without a database, and the executor stays a loop over the plan.
 */
export function planSubmissionDayBackfill(
  rows: readonly PendingSubmissionDay[],
): DayUpdate[] {
  return rows.map((row) => ({
    id: row.id,
    day: dayKey(row.createdAt, row.utcOffsetMinutes),
  }));
}

export async function backfillSubmissionDays(): Promise<{ updated: number }> {
  const { pool } = await import("./index");

  async function columnExists(column: string): Promise<boolean> {
    const result = await pool.query(
      `select 1
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'submissions'
          and column_name = $1
        limit 1`,
      [column],
    );
    return (result.rowCount ?? 0) > 0;
  }

  if (!(await columnExists("day"))) return { updated: 0 };
  if (!(await columnExists("utc_offset_minutes"))) return { updated: 0 };

  const pending = await pool.query<PendingSubmissionDay>(
    `select id, created_at as "createdAt", utc_offset_minutes as "utcOffsetMinutes"
       from submissions
      where day is null
      order by created_at`,
  );

  const updates = planSubmissionDayBackfill(pending.rows);
  if (updates.length === 0) return { updated: 0 };

  // One statement: every row is stamped from its own timestamp, so the updates
  // are independent and there is nothing to serialize between them.
  await pool.query(
    `update submissions
        set day = data.day::date
       from (select unnest($1::uuid[]) as id, unnest($2::text[]) as day) as data
      where submissions.id = data.id`,
    [updates.map((update) => update.id), updates.map((update) => update.day)],
  );

  return { updated: updates.length };
}
