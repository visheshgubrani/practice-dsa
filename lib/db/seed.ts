import { readFileSync } from "node:fs";

import { count, eq } from "drizzle-orm";

import { STORED_LANGUAGES } from "../languages";
import {
  compileForSeed,
  type AuthoredProblem,
} from "../problems/authoring";
import { PROBLEMS } from "../problems/catalog";
import {
  checkCatalog,
  formatConformanceReport,
} from "../problems/conformance";
import {
  PROBLEM_GROUPS,
  type ProblemGroup,
  topicForSlug,
} from "../problems/topics";
import { loadEnv } from "./env";
import { db, pool } from "./index";
import {
  problemExamples,
  problemStarterCode,
  problemTestcases,
  problems,
} from "./schema";

/**
 * Copies the authored catalog (`lib/problems/catalog.ts`) into the database.
 *
 * Conformance (`checkCatalog`) runs first, in this same command: a catalog that
 * fails the local Python gate is not written. After that, problems are upserted
 * by slug inside one transaction, so a mid-seed failure does not leave a
 * half-updated catalog. Re-running seed rewrites catalog children (examples,
 * testcases, starters) for those slugs and preserves problem IDs. User data
 * (drafts, progress, submissions, chat) is never touched.
 *
 * Each row's `topic` comes from the NeetCode sheet's own grouping
 * (`lib/problems/topics.ts`), not from a field in the problem module: a problem
 * moved within `catalog.ts` cannot then disagree with the roadmap group the
 * dashboard files it under.
 *
 * Fresh install on an empty volume: `pnpm db:migrate && pnpm db:seed`. Do not
 * wipe this database to prove that path.
 *
 * Run through `pnpm db:seed`.
 */

const STARTER_LANGUAGES = STORED_LANGUAGES;

/** The vendored sheet — the source of each problem's roadmap group. */
const SHEET_PATH = "docs/catalog/neetcode-150.json";

type SheetManifest = {
  groups: string[];
  problems: Array<{ slug: string; group: string; status: string }>;
};

/**
 * Which roadmap group each slug belongs to, per the sheet. Read here rather
 * than in `lib/problems/topics.ts` so this module stays a pure mapping and the
 * seed owns every file read.
 */
function readSheetGroups(): Map<string, string> {
  const manifest = JSON.parse(readFileSync(SHEET_PATH, "utf8")) as SheetManifest;
  return new Map(manifest.problems.map((entry) => [entry.slug, entry.group]));
}

type SeedTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function seedProblem(
  tx: SeedTx,
  problem: AuthoredProblem,
  position: number,
  topic: ProblemGroup,
): Promise<void> {
  const compiled = compileForSeed(problem);
  const fields = {
    number: problem.number,
    position,
    topic,
    title: problem.title,
    difficulty: problem.difficulty,
    statement: problem.statement,
    constraints: [...problem.constraints],
    tags: [...problem.tags],
    referenceApproach: problem.notes.approach,
    referenceTimeComplexity: problem.notes.timeComplexity,
    referenceSpaceComplexity: problem.notes.spaceComplexity,
    sourceUrl: problem.sourceUrl ?? null,
    signature: { ...problem.signature, params: [...problem.signature.params] },
    compare: problem.compare ?? "exact",
  };

  const [row] = await tx
    .insert(problems)
    .values({ slug: problem.slug, ...fields })
    .onConflictDoUpdate({
      target: problems.slug,
      set: { ...fields, updatedAt: new Date() },
    })
    .returning({ id: problems.id });

  const problemId = row.id;

  await tx.delete(problemExamples).where(eq(problemExamples.problemId, problemId));
  await tx.delete(problemTestcases).where(eq(problemTestcases.problemId, problemId));
  await tx
    .delete(problemStarterCode)
    .where(eq(problemStarterCode.problemId, problemId));

  if (compiled.examples.length > 0) {
    await tx.insert(problemExamples).values(
      compiled.examples.map((example, examplePosition) => ({
        problemId,
        position: examplePosition,
        input: example.input,
        output: example.output,
        explanation: example.explanation ?? null,
      })),
    );
  }

  if (compiled.testcases.length > 0) {
    await tx.insert(problemTestcases).values(
      compiled.testcases.map((testcase, casePosition) => ({
        problemId,
        position: casePosition,
        args: testcase.args,
        expected: testcase.expected,
        isHidden: testcase.isHidden,
        compare: testcase.compare ?? null,
        explanation: testcase.explanation ?? null,
      })),
    );
  }

  await tx.insert(problemStarterCode).values(
    STARTER_LANGUAGES.map((language) => ({
      problemId,
      language,
      source:
        language in problem.starterCode
          ? problem.starterCode[language as keyof typeof problem.starterCode]
          : "",
    })),
  );

  console.log(
    `  ${problem.number}. ${problem.title} — ${compiled.examples.length} examples, ` +
      `${compiled.testcases.length} testcases, ${STARTER_LANGUAGES.length} starters`,
  );
}

async function main() {
  loadEnv();

  console.log(`Checking ${PROBLEMS.length} problems from lib/problems/catalog.ts`);
  const report = checkCatalog(PROBLEMS);
  if (!report.ok) {
    throw new Error(formatConformanceReport(report));
  }
  console.log(formatConformanceReport(report));

  // A slug the sheet does not list needs GROUP_OVERRIDES, and a topic outside
  // PROBLEM_GROUPS would render as a section nothing else sorts into. Both are
  // authoring mistakes, so they are reported before the transaction opens.
  const sheet = readSheetGroups();
  const known = new Set<string>(PROBLEM_GROUPS);
  const topics = PROBLEMS.map((problem) => {
    const sheetGroup = sheet.get(problem.slug) as ProblemGroup | undefined;
    const topic = topicForSlug(problem.slug, sheetGroup);
    if (!known.has(topic)) {
      throw new Error(
        `${problem.slug}: topic "${topic}" is not in PROBLEM_GROUPS ` +
          `(lib/problems/topics.ts).`,
      );
    }
    return topic;
  });

  const perGroup = new Map<string, number>();
  for (const topic of topics) {
    perGroup.set(topic, (perGroup.get(topic) ?? 0) + 1);
  }
  console.log(
    `Topics: ${perGroup.size} groups, ${topics.length} problems — ` +
      [...perGroup].map(([group, n]) => `${group} ${n}`).join(", "),
  );

  console.log(`Seeding ${PROBLEMS.length} problems`);
  await db.transaction(async (tx) => {
    for (const [position, problem] of PROBLEMS.entries()) {
      await seedProblem(tx, problem, position, topics[position]!);
    }
  });

  const [[problemCount], [exampleCount], [testcaseCount], [starterCount]] =
    await Promise.all([
      db.select({ value: count() }).from(problems),
      db.select({ value: count() }).from(problemExamples),
      db.select({ value: count() }).from(problemTestcases),
      db.select({ value: count() }).from(problemStarterCode),
    ]);

  console.log(
    `Done: ${problemCount.value} problems, ${exampleCount.value} examples, ` +
      `${testcaseCount.value} testcases, ${starterCount.value} starter templates.`,
  );
}

/** drizzle wraps driver failures, so the useful message is on `cause`. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause =
    error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
}

async function run() {
  try {
    await main();
  } finally {
    // Closing the pool is what lets the process exit.
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error(describe(error));
  process.exitCode = 1;
});
