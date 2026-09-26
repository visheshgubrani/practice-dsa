import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { db, pool } from "@/lib/db";
import {
  activityBounds,
  activityRangeSchema,
  dashboardTotals,
  getProblemStatus,
  listActivityDays,
  listProgressStatuses,
} from "@/lib/db/queries/dashboard";
import { persistRunResult } from "@/lib/db/queries/submissions";
import { problemProgress, problems, submissions } from "@/lib/db/schema";
import { addDays, dayKey, utcOffsetMinutesFor } from "@/lib/practice/days";
import type { RunResult } from "@/lib/runner/types";

/**
 * The dashboard's reads against a throwaway problem row.
 *
 * The fixture's submission rows are inserted directly on a fixed day in the
 * past with a matching local day stamped on them, rather than written through
 * `persistRunResult`. Two reasons: `persistRunResult` would stamp today, which
 * the seeded database also uses, so the assertions could not be exact; and a
 * fixture must not leave submission history behind in a real database. The
 * write path's own day stamping is covered by `persistence.test.ts`.
 */

/** A day nothing else can be practising on. */
const FIXTURE_DAY = "2019-01-01";
const FIXTURE_DAY_LATER = addDays(FIXTURE_DAY, 1);

const SIGNATURE = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" as const },
    { name: "target", kind: "int" as const },
  ],
  returns: "int[]" as const,
};

function result(
  overrides: Partial<RunResult> &
    Pick<RunResult, "mode" | "runner" | "verdict">,
): RunResult {
  return {
    cases: [
      {
        index: 0,
        status: overrides.verdict,
        hidden: false,
        input: "nums = [2,7]\ntarget = 9",
        expected: "[0,1]",
      },
    ],
    passedCount: overrides.verdict === "accepted" ? 1 : 0,
    totalCount: 1,
    at: "2019-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard reads", () => {
  let slug = "";
  let problemId = "";
  let reviseId = "";

  /** One stored attempt, placed on `day` by hand. */
  async function insertSubmission(
    overrides: Partial<typeof submissions.$inferInsert>,
  ): Promise<string> {
    const [row] = await db
      .insert(submissions)
      .values({
        problemId,
        language: "python",
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        source: "class Solution:\n    pass\n",
        passedCount: 1,
        totalCount: 1,
        day: FIXTURE_DAY,
        utcOffsetMinutes: 330,
        createdAt: new Date(`${FIXTURE_DAY}T06:00:00.000Z`),
        ...overrides,
      })
      .returning({ id: submissions.id });
    return row!.id;
  }

  before(async () => {
    slug = `__dash-${crypto.randomUUID()}`;
    const [problem] = await db
      .insert(problems)
      .values({
        slug,
        number: 9_500_000 + Math.floor(Math.random() * 40_000),
        position: 9_500_000,
        title: "Dashboard fixture",
        difficulty: "medium",
        topic: "Stack",
        statement: "fixture — not a catalog problem",
        signature: SIGNATURE,
      })
      .returning({ id: problems.id });
    problemId = problem!.id;

    // Two verified Submits — one accepted, one a revise — plus a Run and a mock
    // Submit that share the same day and the same problem and must not count.
    await insertSubmission({});
    reviseId = await insertSubmission({
      verdict: "wrong_answer",
      isRevision: true,
    });
    await insertSubmission({ mode: "run" });
    await insertSubmission({ runner: "mock" });

    await db.insert(problemProgress).values({
      problemId,
      status: "solved",
      solvedAt: new Date(`${FIXTURE_DAY}T06:00:00.000Z`),
    });
  });

  after(async () => {
    if (problemId) {
      // The last case wrote one more row through the real write path, so this
      // clears the problem's whole history rather than one known id, leaving
      // the database exactly as it was found.
      await db.delete(submissions).where(eq(submissions.problemId, problemId));
      await db.delete(problems).where(eq(problems.id, problemId));
    }
    await pool.end();
  });

  it("counts verified Submits into the day they were practised on", async () => {
    const days = await listActivityDays({
      from: addDays(FIXTURE_DAY, -1),
      to: addDays(FIXTURE_DAY, 1),
    });

    // Exactly one day in the window, with exactly the fixture's contribution:
    // the two verified Submits, one of them accepted.
    assert.deepEqual(days, [
      { day: FIXTURE_DAY, submits: 2, accepted: 1 },
    ]);
  });

  it("leaves Runs and mock verdicts out of the calendar", async () => {
    const days = await listActivityDays({
      from: FIXTURE_DAY,
      to: FIXTURE_DAY,
    });

    // Four rows exist on this day; only the two Submits above reached the count.
    const stored = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.problemId, problemId));
    assert.equal(stored.length, 4);
    assert.equal(days[0]?.submits, 2);
  });

  it("counts a revise as practice and marks it", async () => {
    const days = await listActivityDays({
      from: FIXTURE_DAY,
      to: FIXTURE_DAY,
    });
    // The wrong-answer revise is inside the count rather than filtered out of
    // it; only the accepted figure distinguishes it.
    assert.equal(days[0]?.submits, 2);
    assert.equal(days[0]?.accepted, 1);

    const totals = await dashboardTotals();
    assert.ok(totals.revisions >= 1, `revisions=${totals.revisions}`);

    const [row] = await db
      .select({ isRevision: submissions.isRevision })
      .from(submissions)
      .where(eq(submissions.id, reviseId));
    assert.equal(row?.isRevision, true);
  });

  it("keeps the day window closed at both ends", async () => {
    const empty = await listActivityDays({
      from: FIXTURE_DAY_LATER,
      to: addDays(FIXTURE_DAY_LATER, 2),
    });
    assert.deepEqual(empty, []);

    const oneDay = await listActivityDays({
      from: FIXTURE_DAY,
      to: FIXTURE_DAY,
    });
    assert.equal(oneDay.length, 1);
  });

  it("relates each problem to its status", async () => {
    const statuses = await listProgressStatuses();
    assert.equal(statuses.get(slug), "solved");

    // The workspace's Revise action reads one problem's status before the
    // browser has fetched anything, so it has to answer for both cases.
    assert.equal(await getProblemStatus(slug), "solved");
    assert.equal(await getProblemStatus(`${slug}-nope`), "todo");
  });

  it("totals the whole history and names the newest attempt", async () => {
    const totals = await dashboardTotals();
    assert.ok(totals.submissions >= 4, `submissions=${totals.submissions}`);
    assert.ok(totals.submits >= 2, `submits=${totals.submits}`);
    assert.ok(totals.accepts >= 1, `accepts=${totals.accepts}`);
    assert.ok(totals.lastAttemptAt);
  });

  it("reports the bounds of the practice history", async () => {
    const bounds = await activityBounds();
    assert.ok(bounds.first);
    assert.ok(bounds.last);
    assert.ok(bounds.first! <= bounds.last!);
  });

  it("stamps a request without an offset with the server's own", async () => {
    const stored = await persistRunResult({
      slug,
      language: "python",
      source: "class Solution:\n    pass\n",
      requestId: crypto.randomUUID(),
      result: result({ mode: "run", runner: "piston", verdict: "wrong_answer" }),
    });

    const [row] = await db
      .select({ day: submissions.day, createdAt: submissions.createdAt })
      .from(submissions)
      .where(eq(submissions.id, stored.id));
    const now = new Date(row!.createdAt);
    assert.equal(row?.day, dayKey(now, utcOffsetMinutesFor(now)));
  });
});

describe("activityRangeSchema", () => {
  it("accepts a well-formed, ordered range", () => {
    assert.equal(
      activityRangeSchema.safeParse({ from: "2026-01-01", to: "2026-12-31" })
        .success,
      true,
    );
  });

  it("rejects a malformed or backwards range", () => {
    for (const range of [
      { from: "2026-1-1", to: "2026-12-31" },
      { from: "2026-01-01", to: "31-12-2026" },
      { from: "today", to: "tomorrow" },
      { from: "2026-12-31", to: "2026-01-01" },
    ]) {
      assert.equal(
        activityRangeSchema.safeParse(range).success,
        false,
        JSON.stringify(range),
      );
    }
  });
});
