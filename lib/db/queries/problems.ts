import { asc, desc, gt, lt } from "drizzle-orm";

import { formatArguments } from "@/lib/harness/args";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import type { Problem, ProblemSummary } from "@/lib/problems";
import type { JudgingProblem } from "@/lib/problems/authoring";

import { db } from "../index";
import { problems } from "../schema";

/**
 * The catalog reads.
 *
 * This module is the only place the app turns problem rows into the public
 * shapes (`Problem`, `ProblemSummary` from `@/lib/problems`) and the server
 * judging shape (`JudgingProblem`). Pages and the chat route use `getProblem`
 * — visible cases only, no reference source. The runner uses
 * `getProblemForJudging`, which includes every testcase.
 *
 * Everything is ordered by the authored `position`, with `number` as a
 * deterministic tie-break. Submit reorders to visible-first in `lib/runner/suite.ts`.
 */

const SUMMARY_COLUMNS = {
  slug: problems.slug,
  number: problems.number,
  title: problems.title,
  difficulty: problems.difficulty,
  tags: problems.tags,
};

const NEIGHBOUR_COLUMNS = {
  slug: problems.slug,
  title: problems.title,
  number: problems.number,
};

export type ProblemNeighbour = Pick<
  ProblemSummary,
  "slug" | "title" | "number"
>;

/** What the list page needs, and nothing more. */
export async function listProblemSummaries(): Promise<ProblemSummary[]> {
  return db
    .select(SUMMARY_COLUMNS)
    .from(problems)
    .orderBy(asc(problems.position), asc(problems.number));
}

function starterRecord(
  rows: { language: string; source: string }[],
): Record<LanguageId, string> {
  const starters = new Map(
    rows.map((entry) => [entry.language, entry.source]),
  );
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language.id,
      starters.get(language.id) ?? "",
    ]),
  ) as Record<LanguageId, string>;
}

async function selectProblemRow(slug: string) {
  return db.query.problems.findFirst({
    where: { slug },
    with: {
      examples: { orderBy: { position: "asc" } },
      testcases: { where: { isHidden: false }, orderBy: { position: "asc" } },
      starterCode: true,
    },
  });
}

async function selectJudgingRow(slug: string) {
  return db.query.problems.findFirst({
    where: { slug },
    with: {
      testcases: { orderBy: { position: "asc" } },
      starterCode: true,
    },
  });
}

type ProblemRow = NonNullable<Awaited<ReturnType<typeof selectProblemRow>>>;
type JudgingRow = NonNullable<Awaited<ReturnType<typeof selectJudgingRow>>>;

function toProblem(row: ProblemRow): Problem {
  return {
    slug: row.slug,
    number: row.number,
    title: row.title,
    difficulty: row.difficulty,
    tags: row.tags,
    statement: row.statement,
    constraints: row.constraints,
    examples: row.examples.map((example) => ({
      input: example.input,
      output: example.output,
      explanation: example.explanation ?? undefined,
    })),
    testcases: row.testcases.map((testcase) => ({
      stdin: formatArguments(testcase.args, row.signature),
      args: testcase.args,
      expected: testcase.expected,
      // Null means "no opinion of its own" — the problem's mode decides, and the
      // runner resolves it. Keeping the null instead of collapsing it here is
      // what lets a single case change its mind later.
      compare: testcase.compare ?? undefined,
    })),
    signature: row.signature,
    compare: row.compare,
    starterCode: starterRecord(row.starterCode),
    notes: {
      approach: row.referenceApproach,
      timeComplexity: row.referenceTimeComplexity,
      spaceComplexity: row.referenceSpaceComplexity,
    },
  };
}

function toJudgingProblemFromRow(row: JudgingRow): JudgingProblem {
  return {
    slug: row.slug,
    number: row.number,
    title: row.title,
    signature: row.signature,
    compare: row.compare,
    starterCode: starterRecord(row.starterCode),
    testcases: row.testcases.map((testcase) => ({
      args: testcase.args,
      expected: testcase.expected,
      hidden: testcase.isHidden,
      compare: testcase.compare ?? undefined,
      note: testcase.explanation ?? undefined,
    })),
  };
}

/** Public content and visible cases only. Never used to judge. */
export async function getProblem(slug: string): Promise<Problem | null> {
  const row = await selectProblemRow(slug);
  return row ? toProblem(row) : null;
}

/** Full suite for the server runner. Hidden cases never go to the client here. */
export async function getProblemForJudging(
  slug: string,
): Promise<JudgingProblem | null> {
  const row = await selectJudgingRow(slug);
  return row ? toJudgingProblemFromRow(row) : null;
}

/** The workspace header's previous/next arrows, in authored order. */
export async function getProblemNeighbours(slug: string): Promise<{
  previous?: ProblemNeighbour;
  next?: ProblemNeighbour;
}> {
  const current = await db.query.problems.findFirst({
    where: { slug },
    columns: { position: true },
  });
  if (!current) return {};

  const [previous] = await db
    .select(NEIGHBOUR_COLUMNS)
    .from(problems)
    .where(lt(problems.position, current.position))
    .orderBy(desc(problems.position), asc(problems.number))
    .limit(1);

  const [next] = await db
    .select(NEIGHBOUR_COLUMNS)
    .from(problems)
    .where(gt(problems.position, current.position))
    .orderBy(asc(problems.position), asc(problems.number))
    .limit(1);

  return { previous, next };
}
