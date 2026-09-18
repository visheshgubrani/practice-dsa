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
 * Fresh install on an empty volume: `pnpm db:migrate && pnpm db:seed`. Do not
 * wipe this database to prove that path.
 *
 * Run through `pnpm db:seed`.
 */

const STARTER_LANGUAGES = STORED_LANGUAGES;

type SeedTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function seedProblem(
  tx: SeedTx,
  problem: AuthoredProblem,
  position: number,
): Promise<void> {
  const compiled = compileForSeed(problem);
  const fields = {
    number: problem.number,
    position,
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

  console.log(`Seeding ${PROBLEMS.length} problems`);
  await db.transaction(async (tx) => {
    for (const [position, problem] of PROBLEMS.entries()) {
      await seedProblem(tx, problem, position);
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
