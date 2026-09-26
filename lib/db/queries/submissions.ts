import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { StoredLanguageId } from "@/lib/languages";
import { dayKey, utcOffsetMinutesFor } from "@/lib/practice/days";
import type { PracticeProgress } from "@/lib/practice/types";
import { discloseCaseResult } from "@/lib/runner/suite";
import {
  isVerifiedAcceptance,
  type CaseResult,
  type RunMode,
  type RunResult,
  type RunnerKind,
  type Verdict,
} from "@/lib/runner/types";
import type {
  SubmissionDetail,
  SubmissionList,
  SubmissionSummary,
} from "@/lib/submissions/types";

import { db } from "../index";
import { problemProgress, submissionCases, submissions } from "../schema";

export type {
  SubmissionDetail,
  SubmissionList,
  SubmissionSummary,
} from "@/lib/submissions/types";

/**
 * Submission history reads. Detail (and only detail) returns executed cases,
 * always through `discloseCaseResult` — the same public shape the live console
 * uses. Hidden successes stay status-and-metrics; the first failing hidden
 * case is revealed. The unrevealed suite is never returned.
 */

export const submissionListQuerySchema = z.object({
  slug: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const submissionIdSchema = z.string().uuid();

type StoredCase = {
  caseIndex: number;
  status: Verdict;
  hidden: boolean;
  input: string;
  expected: string;
  stdout: string | null;
  debug: string | null;
  stderr: string | null;
  timeMs: number | null;
  memoryKb: number | null;
};

type StoredSubmission = {
  id: string;
  language: StoredLanguageId;
  mode: RunMode;
  runner: RunnerKind;
  verdict: Verdict;
  source: string;
  testcaseIndex: number | null;
  passedCount: number;
  totalCount: number;
  timeMs: number | null;
  memoryKb: number | null;
  compileOutput: string | null;
  pistonVersion: string | null;
  catalogRevision: string;
  requestId: string | null;
  isRevision: boolean;
  day: string | null;
  createdAt: Date;
};

/** The SQL filter for "latest verified accepted" matches this helper. */
export function isVerifiedAcceptedRow(
  row: Pick<StoredSubmission, "mode" | "runner" | "verdict">,
): boolean {
  return isVerifiedAcceptance(row);
}

/**
 * Map a stored case onto the public `CaseResult`. Hidden successes drop input,
 * expected, output, and diagnostics even if the row still holds them.
 */
export function toPublicCaseResult(row: StoredCase): CaseResult {
  return discloseCaseResult({
    index: row.caseIndex,
    status: row.status,
    hidden: row.hidden,
    input: row.input,
    expected: row.expected,
    stdout: row.stdout ?? undefined,
    debug: row.debug ?? undefined,
    stderr: row.stderr ?? undefined,
    timeMs: row.timeMs ?? undefined,
    memoryKb: row.memoryKb ?? undefined,
  });
}

export function toSubmissionSummary(
  row: StoredSubmission,
  slug: string,
): SubmissionSummary {
  return {
    id: row.id,
    slug,
    language: row.language,
    mode: row.mode,
    runner: row.runner,
    verdict: row.verdict,
    source: row.source,
    passedCount: row.passedCount,
    totalCount: row.totalCount,
    timeMs: row.timeMs,
    memoryKb: row.memoryKb,
    catalogRevision: row.catalogRevision,
    requestId: row.requestId,
    isRevision: row.isRevision,
    day: row.day,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSubmissionDetail(
  row: StoredSubmission,
  cases: StoredCase[],
  slug: string,
): SubmissionDetail {
  return {
    ...toSubmissionSummary(row, slug),
    testcaseIndex: row.testcaseIndex,
    compileOutput: row.compileOutput,
    pistonVersion: row.pistonVersion,
    cases: cases.map(toPublicCaseResult),
  };
}

export async function listSubmissions(
  slug: string,
  limit: number,
  offset: number,
): Promise<SubmissionList | null> {
  const problem = await db.query.problems.findFirst({
    where: { slug },
    columns: { id: true, slug: true },
  });
  if (!problem) return null;

  const where = eq(submissions.problemId, problem.id);
  const [items, totals] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(where)
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(submissions).where(where),
  ]);

  return {
    items: items.map((row) => toSubmissionSummary(row, problem.slug)),
    total: totals[0]?.total ?? 0,
    limit,
    offset,
  };
}

export async function getSubmission(
  id: string,
): Promise<SubmissionDetail | null> {
  const row = await db.query.submissions.findFirst({
    where: { id },
    with: {
      cases: { orderBy: { position: "asc" } },
      problem: { columns: { slug: true } },
    },
  });
  if (!row?.problem) return null;

  return toSubmissionDetail(row, row.cases, row.problem.slug);
}

export function toRunResult(detail: SubmissionDetail): RunResult {
  return {
    verdict: detail.verdict,
    mode: detail.mode,
    runner: detail.runner,
    cases: detail.cases,
    compileOutput: detail.compileOutput ?? undefined,
    passedCount: detail.passedCount,
    totalCount: detail.totalCount,
    timeMs: detail.timeMs ?? undefined,
    memoryKb: detail.memoryKb ?? undefined,
    at: detail.createdAt,
    pistonVersion: detail.pistonVersion ?? undefined,
    persisted: true,
    submissionId: detail.id,
  };
}

export async function getSubmissionByRequestId(
  requestId: string,
): Promise<SubmissionDetail | null> {
  const row = await db.query.submissions.findFirst({
    where: { requestId },
    columns: { id: true },
  });
  if (!row) return null;
  return getSubmission(row.id);
}

export type ProgressSnapshot = {
  status: PracticeProgress["status"];
  solvedAt: Date | null;
};

export type ProgressWrite = {
  writes: boolean;
  status: PracticeProgress["status"];
  solvedAt: Date | null;
};

/**
 * Genuine progress is Piston-only. Mock rows are stored as simulated history
 * and never change status / solvedAt. A later failure keeps an existing solve
 * and the original `solvedAt`.
 */
export function nextProgressFromRun(
  existing: ProgressSnapshot | null,
  result: Pick<RunResult, "mode" | "runner" | "verdict">,
  now: Date,
): ProgressWrite {
  if (result.runner !== "piston") {
    return {
      writes: false,
      status: existing?.status ?? "todo",
      solvedAt: existing?.solvedAt ?? null,
    };
  }

  if (isVerifiedAcceptance(result)) {
    if (existing?.status === "solved") {
      return {
        writes: false,
        status: "solved",
        solvedAt: existing.solvedAt,
      };
    }
    return {
      writes: true,
      status: "solved",
      solvedAt: existing?.solvedAt ?? now,
    };
  }

  if (existing?.status === "solved") {
    return {
      writes: false,
      status: "solved",
      solvedAt: existing.solvedAt,
    };
  }
  if (existing?.status === "attempted") {
    return {
      writes: false,
      status: "attempted",
      solvedAt: existing.solvedAt,
    };
  }
  return { writes: true, status: "attempted", solvedAt: null };
}

export type PersistRunInput = {
  slug: string;
  language: StoredLanguageId;
  source: string;
  testcaseIndex?: number;
  requestId?: string;
  /** The viewer's UTC offset when this ran; see `utcOffsetMinutesFor`. */
  utcOffsetMinutes?: number;
  /** A revisit of an already-solved problem. */
  revision?: boolean;
  result: RunResult;
};

/**
 * Write submission, cases, and progress in one transaction. The engine must
 * already have returned — never call Piston from inside this function.
 */
export async function persistRunResult(
  input: PersistRunInput,
): Promise<{ id: string; duplicate: boolean }> {
  const problem = await db.query.problems.findFirst({
    where: { slug: input.slug },
    columns: { id: true, updatedAt: true },
  });
  if (!problem) {
    throw new Error(`Unknown problem: ${input.slug}`);
  }

  const catalogRevision = problem.updatedAt.toISOString();
  const now = new Date();
  const result = input.result;
  // The day is computed here, once, and stored: the streak then reads a plain
  // `group by` and never has to re-derive a timezone at query time.
  const offsetMinutes = input.utcOffsetMinutes ?? utcOffsetMinutesFor(now);
  const day = dayKey(now, offsetMinutes);

  return db.transaction(async (tx) => {
    if (input.requestId) {
      const existing = await tx.query.submissions.findFirst({
        where: { requestId: input.requestId },
        columns: { id: true },
      });
      if (existing) return { id: existing.id, duplicate: true };
    }

    const values = {
      problemId: problem.id,
      language: input.language,
      mode: result.mode,
      runner: result.runner,
      verdict: result.verdict,
      source: input.source,
      testcaseIndex: result.mode === "run" ? (input.testcaseIndex ?? null) : null,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      timeMs: result.timeMs ?? null,
      memoryKb: result.memoryKb ?? null,
      compileOutput: result.compileOutput ?? null,
      pistonVersion: result.pistonVersion ?? null,
      catalogRevision,
      requestId: input.requestId ?? null,
      utcOffsetMinutes: offsetMinutes,
      day,
      isRevision: input.revision ?? false,
    };

    const insert = tx.insert(submissions).values(values);
    const inserted = input.requestId
      ? await insert
          .onConflictDoNothing({ target: submissions.requestId })
          .returning({ id: submissions.id })
      : await insert.returning({ id: submissions.id });

    const insertedId = inserted[0]?.id;
    if (!insertedId) {
      if (input.requestId) {
        const raced = await tx.query.submissions.findFirst({
          where: { requestId: input.requestId },
          columns: { id: true },
        });
        if (raced) return { id: raced.id, duplicate: true };
      }
      throw new Error("Could not store the submission.");
    }
    const submissionId = insertedId;

    if (result.cases.length > 0) {
      await tx.insert(submissionCases).values(
        result.cases.map((entry, position) => ({
          submissionId,
          position,
          caseIndex: entry.index,
          status: entry.status,
          hidden: entry.hidden,
          input: entry.input ?? "",
          expected: entry.expected ?? "",
          stdout: entry.stdout ?? null,
          debug: entry.debug ?? null,
          stderr: entry.stderr ?? null,
          timeMs: entry.timeMs ?? null,
          memoryKb: entry.memoryKb ?? null,
        })),
      );
    }

    const existingProgress = await tx.query.problemProgress.findFirst({
      where: { problemId: problem.id },
    });
    const next = nextProgressFromRun(
      existingProgress
        ? {
            status: existingProgress.status,
            solvedAt: existingProgress.solvedAt,
          }
        : null,
      result,
      now,
    );
    if (!next.writes) return { id: submissionId, duplicate: false };

    if (!existingProgress) {
      await tx.insert(problemProgress).values({
        problemId: problem.id,
        status: next.status,
        solvedAt: next.solvedAt,
        revision: 1,
      });
    } else {
      await tx
        .update(problemProgress)
        .set({
          status: next.status,
          solvedAt: next.solvedAt,
          revision: sql`${problemProgress.revision} + 1`,
        })
        .where(eq(problemProgress.id, existingProgress.id));
    }

    return { id: submissionId, duplicate: false };
  });
}
