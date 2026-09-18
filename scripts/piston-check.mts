#!/usr/bin/env node

/**
 * End-to-end check of the judging path.
 *
 * For every problem it runs a known-good Python solution through the real engine
 * and requires `accepted`, then runs deliberately broken ones and requires the
 * verdict each is supposed to produce. That covers the two things which can
 * silently rot:
 *
 *   - a generated harness that no longer produces a runnable program
 *   - an engine whose installed runtime has drifted from `lib/piston/config.ts`
 *
 * It goes through the app's own judging path (`runWithPiston`) against the
 * database the app uses, because that is where the problems and their testcases
 * actually live — `lib/problems/catalog.ts` is only the seed input. Hidden
 * cases are included via `getProblemForJudging`.
 *
 * Usage: pnpm piston:check
 */

import { loadEnv } from "@/lib/db/env";
import { loadPistonEnv } from "@/lib/piston/env";

/**
 * `PISTON_URL` is read the moment `lib/piston/config.ts` is first imported, and
 * static imports are hoisted above every statement in this file. So the fallback
 * is set here, before anything reads it; `loadEnv` then loads `.env.local` and
 * `.env` underneath it, and dotenv never overrides a variable that is already
 * set.
 */
loadEnv();
loadPistonEnv();

const { getProblemForJudging } = await import("@/lib/db/queries/problems");
const { pool } = await import("@/lib/db/index");
const { FIXTURES } = await import("@/lib/harness/fixtures");
const { forgetRuntimes, missingRuntimes } = await import("@/lib/piston/client");
const { runWithPiston } = await import("@/lib/runner/piston");
const { DEFAULT_LANGUAGE } = await import("@/lib/languages");

const language = DEFAULT_LANGUAGE;

type Failure = { what: string; expected: string; actual: string };
const failures: Failure[] = [];
let checks = 0;

function record(what: string, expected: string, actual: string): void {
  checks += 1;
  if (expected === actual) {
    console.log(`  ok    ${what} → ${actual}`);
    return;
  }
  console.log(`  FAIL  ${what} → ${actual} (expected ${expected})`);
  failures.push({ what, expected, actual });
}

/** The first failing case's account of itself, for a readable failure. */
function explain(result: Awaited<ReturnType<typeof runWithPiston>>): string {
  const failing = result.cases.find((entry) => entry.status !== "accepted");
  if (!failing) return "";
  const lines = [
    `        case ${failing.index + 1}: expected ${JSON.stringify(failing.expected)}`,
    `        got      ${JSON.stringify(failing.stdout ?? "")}`,
  ];
  if (failing.debug) {
    lines.push(`        debug    ${JSON.stringify(failing.debug)}`);
  }
  if (failing.stderr) {
    lines.push(
      ...failing.stderr
        .split("\n")
        .slice(0, 8)
        .map((line) => `        | ${line}`),
    );
  }
  return `\n${lines.join("\n")}`;
}

async function main(): Promise<void> {
  console.log("Installed runtimes");
  const missing = await missingRuntimes();
  if (missing.length > 0) {
    throw new Error(
      `The engine is missing: ${missing.join(", ")}\n` +
        `Install it with: pnpm piston:runtimes, then restart the engine.`,
    );
  }
  console.log("  ok    the pinned Python runtime is installed");

  for (const fixture of FIXTURES) {
    const problem = await getProblemForJudging(fixture.slug);
    if (!problem) {
      throw new Error(
        `${fixture.slug} is not in the database. Run: pnpm db:migrate && pnpm db:seed`,
      );
    }

    console.log(`\n${problem.number}. ${problem.title} (${problem.slug})`);

    const accepted = await runWithPiston(
      { slug: problem.slug, language, source: fixture.accepted, mode: "submit" },
      problem,
    );
    record(
      `reference solution · ${accepted.passedCount}/${accepted.totalCount} cases · ` +
        `${accepted.timeMs ?? "?"} ms · Python ${accepted.pistonVersion ?? "?"}`,
      "accepted",
      accepted.verdict,
    );
    if (accepted.verdict !== "accepted") console.log(explain(accepted));

    for (const variant of fixture.acceptedVariants ?? []) {
      const result = await runWithPiston(
        { slug: problem.slug, language, source: variant.source, mode: "submit" },
        problem,
      );
      record(variant.label, "accepted", result.verdict);
      if (result.verdict !== "accepted") console.log(explain(result));
    }

    for (const broken of fixture.broken ?? []) {
      const result = await runWithPiston(
        { slug: problem.slug, language, source: broken.source, mode: "submit" },
        problem,
      );
      record(broken.label, broken.expect, result.verdict);
      if (result.verdict !== broken.expect) console.log(explain(result));
    }
  }

  // The starter template is the first thing the editor ever holds. An untouched
  // one must never report accepted: every starter is missing its body, so the
  // only correct outcomes are a crash or a wrong answer.
  console.log("\nUntouched starter templates");
  for (const fixture of FIXTURES) {
    const starter = await getProblemForJudging(fixture.slug);
    if (!starter) continue;
    const result = await runWithPiston(
      {
        slug: starter.slug,
        language,
        source: starter.starterCode[language],
        mode: "submit",
      },
      starter,
    );
    record(
      `${starter.slug} starter is not accepted (${result.verdict})`,
      "true",
      String(result.verdict !== "accepted"),
    );
  }
}

try {
  forgetRuntimes();
  await main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  failures.push({ what: "check run", expected: "complete", actual: "aborted" });
} finally {
  await pool.end();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${checks} checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks} checks passed.`);
}
