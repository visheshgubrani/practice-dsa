import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import type { ActivityDay } from "@/lib/progress/calendar";
import type { ProblemStatus, ProgressLookup } from "@/lib/progress/summary";

import { db } from "../index";
import { problemProgress, problems, submissions } from "../schema";

/**
 * The dashboard's reads: which days were practised, and where each problem
 * stands.
 *
 * "Practised" is a verified Piston Submit — `mode: "submit"` and
 * `runner: "piston"`, the same filter that decides whether a problem is solved.
 * A Run, a mock verdict, or a visualize trace judges nothing, so none of them
 * moves the streak; the invariant that keeps a simulated verdict from marking a
 * problem solved also keeps it from faking a day. A **revision** submit counts:
 * it is a real Submit, and revisiting is the practice the streak is meant to
 * reward.
 *
 * Solved state is read from `problem_progress`, not from a browser key, so the
 * dashboard survives a restart and a different browser.
 */

export const activityRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((range) => range.from <= range.to, {
    message: "from must not be after to.",
  });

export type ActivityRange = z.infer<typeof activityRangeSchema>;

/**
 * One row per practice day, oldest first.
 *
 * Grouped in SQL rather than in the app: a year of practice is still a table
 * scan away from a count, and the dashboard should not ship every submission
 * row to find five distinct days.
 */
export async function listActivityDays(
  range: ActivityRange,
): Promise<ActivityDay[]> {
  return db
    .select({
      day: submissions.day,
      submits: count(),
      // `filter` keeps this a single pass: the accepted column is the same
      // aggregate with a narrower predicate.
      accepted: sql<number>`count(*) filter (where ${submissions.verdict} = 'accepted')::int`,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.runner, "piston"),
        eq(submissions.mode, "submit"),
        gte(submissions.day, range.from),
        lte(submissions.day, range.to),
      ),
    )
    .groupBy(submissions.day)
    .orderBy(asc(submissions.day))
    .then((rows) =>
      rows
        // `day` is nullable on rows written before the column existed; a
        // migration stamped those, so a null here means a hand-written row.
        .filter((row): row is { day: string; submits: number; accepted: number } =>
          row.day !== null,
        )
        .map((row) => ({
          day: row.day,
          submits: row.submits,
          accepted: row.accepted,
        })),
    );
}

/** The first and last day with any practice, or nulls when there is none. */
export async function activityBounds(): Promise<{
  first: string | null;
  last: string | null;
}> {
  const [row] = await db
    .select({
      first: sql<string | null>`min(${submissions.day})`,
      last: sql<string | null>`max(${submissions.day})`,
    })
    .from(submissions)
    .where(
      and(eq(submissions.runner, "piston"), eq(submissions.mode, "submit")),
    );

  return { first: row?.first ?? null, last: row?.last ?? null };
}

/** `slug -> status`, for the dashboard's solved ticks and its counters. */
export async function listProgressStatuses(): Promise<ProgressLookup> {
  const rows = await db
    .select({ slug: problems.slug, status: problemProgress.status })
    .from(problemProgress)
    .innerJoin(problems, eq(problems.id, problemProgress.problemId));

  return new Map(rows.map((row) => [row.slug, row.status]));
}

/**
 * One problem's standing, for a page that needs it before the browser has
 * loaded anything — the workspace's Revise action, which would otherwise only
 * appear after a client fetch.
 */
export async function getProblemStatus(
  slug: string,
): Promise<ProblemStatus> {
  const row = await db.query.problemProgress.findFirst({
    where: { problem: { slug } },
    columns: { status: true },
  });
  return row?.status ?? "todo";
}

export type DashboardTotals = {
  /** Every stored attempt, Run and Submit alike. */
  submissions: number;
  /** Verified Piston Submits. */
  submits: number;
  /** Of those, how many were accepted. */
  accepts: number;
  /** Submits made in a revise session. */
  revisions: number;
  /** When the newest attempt happened, ISO, or null with no history. */
  lastAttemptAt: string | null;
};

/**
 * The header's one-line history summary. Counted in SQL because it spans all
 * history, which the calendar's window deliberately does not.
 */
export async function dashboardTotals(): Promise<DashboardTotals> {
  const [row] = await db
    .select({
      submissions: count(),
      submits: sql<number>`count(*) filter (where ${submissions.mode} = 'submit' and ${submissions.runner} = 'piston')::int`,
      accepts: sql<number>`count(*) filter (where ${submissions.mode} = 'submit' and ${submissions.runner} = 'piston' and ${submissions.verdict} = 'accepted')::int`,
      revisions: sql<number>`count(*) filter (where ${submissions.isRevision})::int`,
      lastAttemptAt: sql<Date | null>`max(${submissions.createdAt})`,
    })
    .from(submissions);

  return {
    submissions: row?.submissions ?? 0,
    submits: row?.submits ?? 0,
    accepts: row?.accepts ?? 0,
    revisions: row?.revisions ?? 0,
    lastAttemptAt:
      row?.lastAttemptAt != null
        ? new Date(row.lastAttemptAt).toISOString()
        : null,
  };
}
