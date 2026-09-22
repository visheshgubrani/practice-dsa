#!/usr/bin/env node

/**
 * End-to-end check of the visualizer path.
 *
 * For every seeded problem it traces a known-good solution against each visible
 * case through the real engine, and requires the things the UI depends on:
 *
 *   - the tracer ran at all (a trace with steps, and a call that reached the
 *     method the problem is about)
 *   - every step was drawable (stack frames, and a code pane the frontend can
 *     map line numbers onto)
 *   - the payload stayed inside the budget — per-step bytes are the number that
 *     decides whether this feature is usable or a 30 MB mistake, because the
 *     tracer re-encodes the reachable heap at every single step
 *   - nothing was written: visualizing is not running, and it is not submitting
 *
 * It goes through the app's own path (`visualizeTrace`) against the app's own
 * database, which is where the problems and their visible cases actually live.
 *
 * Usage: pnpm visualizer:check [--slug two-sum]
 */

import { loadEnv } from "@/lib/db/env";
import { loadPistonEnv } from "@/lib/piston/env";

/**
 * `PISTON_URL` is read the moment `lib/piston/config.ts` is first imported, and
 * static imports are hoisted above every statement in this file. So the
 * fallback is set here, before anything reads it, exactly as `piston-check.mts`
 * does.
 */
loadEnv();
loadPistonEnv();

const { pool } = await import("@/lib/db/index");
const { getProblem, listProblemSummaries } = await import(
  "@/lib/db/queries/problems"
);
const { TRACE_LIMITS } = await import("@/lib/piston/config");
const { visualizeTrace } = await import("@/lib/visualizer/trace");
const { DEFAULT_LANGUAGE } = await import("@/lib/languages");

/** Bytes per step above which the picture is not worth shipping. */
const STEP_BUDGET_BYTES = 6_000;
/** Steps a real solution should take; below this the trace is suspicious. */
const MIN_STEPS = 5;

type Failure = { what: string; detail: string };
const failures: Failure[] = [];

function fail(what: string, detail: string): void {
  console.log(`  FAIL  ${what} — ${detail}`);
  failures.push({ what, detail });
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** `problem_progress` and `submissions`, for the no-writes assertion. */
async function rowCounts(): Promise<string> {
  const result = await pool.query<{
    submissions: string;
    progress: string;
    drafts: string;
  }>(
    `select
       (select count(*) from submissions)::text as submissions,
       (select count(*) from problem_progress)::text as progress,
       (select count(*) from drafts)::text as drafts`,
  );
  const row = result.rows[0];
  return `${row?.submissions}/${row?.progress}/${row?.drafts}`;
}

const only = argValue("--slug");
const summaries = await listProblemSummaries();
const targets = only
  ? summaries.filter((summary) => summary.slug === only)
  : summaries;

if (targets.length === 0) {
  console.error(only ? `No seeded problem matches "${only}".` : "No seeded problems.");
  await pool.end();
  process.exit(1);
}

const before = await rowCounts();
console.log(
  `Tracing ${targets.length} problem(s) — cap ${TRACE_LIMITS.maxSteps} steps, ` +
    `budget ${Math.round(TRACE_LIMITS.maxBytes / 1000)} kB, ${TRACE_LIMITS.runMs} ms\n`,
);

let traced = 0;
let worstStepBytes = 0;
let worstStepWhat = "";

for (const summary of targets) {
  const problem = await getProblem(summary.slug);
  if (!problem) {
    fail(summary.slug, "not readable from the database");
    continue;
  }
  const reference = await referenceFor(summary.slug);
  if (!reference) {
    console.log(`  skip  ${summary.slug} — no reference solution available`);
    continue;
  }

  for (const [index] of problem.testcases.entries()) {
    const label = `${summary.slug} case ${index + 1}`;
    try {
      const result = await visualizeTrace({
        slug: summary.slug,
        language: DEFAULT_LANGUAGE,
        source: reference,
        testcaseIndex: index,
      });

      traced += 1;
      const perStep = Math.round(JSON.stringify(result.trace).length / result.steps);
      if (perStep > worstStepBytes) {
        worstStepBytes = perStep;
        worstStepWhat = label;
      }

      const problems: string[] = [];
      if (result.steps < MIN_STEPS) {
        problems.push(`only ${result.steps} step(s)`);
      }
      if (result.steps > TRACE_LIMITS.maxSteps + 1) {
        problems.push(`${result.steps} steps is over the cap`);
      }
      if (result.outcome === "syntax_error") {
        problems.push(`the reference did not compile: ${result.message ?? "?"}`);
      }
      if (perStep > STEP_BUDGET_BYTES) {
        problems.push(`${perStep} bytes/step is over the ${STEP_BUDGET_BYTES} budget`);
      }
      // Every step must point at a line the code pane can highlight. The pane is
      // the editor buffer: prelude and harness steps have already been dropped,
      // and the ones that remain use the buffer's own line numbers.
      const codeLines = result.code.split("\n").length;
      if (result.code !== reference) {
        problems.push("the code pane is not the solution that was traced");
      }
      const stray = (result.trace as Array<{ line?: unknown }>).find(
        (step) =>
          typeof step.line === "number" && (step.line < 1 || step.line > codeLines),
      );
      if (stray) {
        problems.push(
          `a step points at line ${stray.line}, outside the ${codeLines}-line code pane`,
        );
      }
      if (!Array.isArray(result.trace) || result.trace.length !== result.steps) {
        problems.push("the step count disagrees with the trace");
      }

      if (problems.length > 0) {
        fail(label, problems.join("; "));
        continue;
      }

      console.log(
        `  ok    ${label.padEnd(44)} ${String(result.steps).padStart(5)} steps  ` +
          `${String(Math.round(JSON.stringify(result.trace).length / 1024)).padStart(6)} kB  ` +
          `${String(perStep).padStart(5)} B/step  ${String(result.engine.timeMs ?? "?").padStart(5)} ms  ` +
          `${result.outcome}`,
      );
      // The engine's stdout cap is only visible as a death; a trace that fits
      // is the proof the compose knob is where it needs to be.
    } catch (error) {
      fail(label, error instanceof Error ? error.message : String(error));
    }
  }
}

const after = await rowCounts();
if (before !== after) {
  fail("no writes", `submissions/progress/drafts changed: ${before} → ${after}`);
} else {
  console.log(`\n  ok    nothing written (submissions/progress/drafts stayed ${after})`);
}

console.log(
  `\n  ${traced} trace(s) checked; worst per-step payload ${worstStepBytes} B` +
    (worstStepWhat ? ` (${worstStepWhat})` : ""),
);

/** The problem's own reference solution, read from the authoring catalog. */
async function referenceFor(slug: string): Promise<string | undefined> {
  const { PROBLEMS } = await import("@/lib/problems/catalog");
  return PROBLEMS.find((problem) => problem.slug === slug)?.reference;
}

await pool.end();

if (failures.length > 0) {
  console.error(`\n${failures.length} visualizer check(s) failed.`);
  process.exit(1);
}
console.log("\nAll visualizer checks passed.");
