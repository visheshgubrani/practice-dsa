#!/usr/bin/env node

/**
 * Phase 4.4 Submit latency checkpoint.
 *
 * Picks the largest seeded suite, warms the runtime, then times ten successful
 * Submits of the reference solution with the in-process execution cache cleared
 * before each measured run. Wall time is the end-to-end `runWithPiston` wait;
 * per-case CPU is what Piston reports on each case (`cpu_time`). Sequential,
 * one-case-per-job execution is unchanged.
 *
 * Usage: pnpm piston:latency
 */

import { loadEnv } from "@/lib/db/env";
import { loadPistonEnv } from "@/lib/piston/env";

loadEnv();
loadPistonEnv();

const { getProblemForJudging } = await import("@/lib/db/queries/problems");
const { pool } = await import("@/lib/db/index");
const { PROBLEMS } = await import("@/lib/problems/catalog");
const { clearCache, forgetRuntimes, missingRuntimes } = await import(
  "@/lib/piston/client"
);
const { runWithPiston } = await import("@/lib/runner/piston");
const { DEFAULT_LANGUAGE } = await import("@/lib/languages");

const MEASURED_RUNS = 10;

type Sample = {
  wallMs: number;
  cpuSumMs: number;
  cpuMaxMs: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function formatMs(value: number): string {
  return `${value.toFixed(1)} ms`;
}

function largestProblem() {
  return PROBLEMS.reduce((best, problem) =>
    problem.testcases.length > best.testcases.length ? problem : best,
  );
}

async function main(): Promise<void> {
  const missing = await missingRuntimes();
  if (missing.length > 0) {
    throw new Error(
      `The engine is missing: ${missing.join(", ")}\n` +
        `Install it with: pnpm piston:runtimes, then restart the engine.`,
    );
  }

  const authored = largestProblem();
  const problem = await getProblemForJudging(authored.slug);
  if (!problem) {
    throw new Error(
      `${authored.slug} is not in the database. Run: pnpm db:migrate && pnpm db:seed`,
    );
  }

  const suiteSize = problem.testcases.length;
  const language = DEFAULT_LANGUAGE;
  const request = {
    slug: problem.slug,
    language,
    source: authored.reference,
    mode: "submit" as const,
  };

  console.log(
    `${problem.number}. ${problem.title} (${problem.slug}) — ${suiteSize} cases`,
  );
  console.log("Warm-up Submit (discarded)");

  const warm = await runWithPiston(request, problem);
  if (warm.verdict !== "accepted") {
    throw new Error(
      `Warm-up was ${warm.verdict} (${warm.passedCount}/${warm.totalCount}), not accepted.`,
    );
  }
  console.log(
    `  ok    ${warm.passedCount}/${warm.totalCount} · CPU max ${warm.timeMs ?? "?"} ms`,
  );

  const samples: Sample[] = [];
  for (let n = 1; n <= MEASURED_RUNS; n += 1) {
    clearCache();
    const started = performance.now();
    const result = await runWithPiston(request, problem);
    const wallMs = performance.now() - started;
    if (result.verdict !== "accepted") {
      throw new Error(
        `Measured run ${n} was ${result.verdict} (${result.passedCount}/${result.totalCount}), not accepted.`,
      );
    }
    if (result.cases.length !== suiteSize) {
      throw new Error(
        `Measured run ${n} returned ${result.cases.length} cases, expected ${suiteSize}.`,
      );
    }
    const cpuTimes = result.cases.map((entry) => entry.timeMs ?? 0);
    const sample: Sample = {
      wallMs,
      cpuSumMs: cpuTimes.reduce((sum, value) => sum + value, 0),
      cpuMaxMs: Math.max(0, ...cpuTimes),
    };
    samples.push(sample);
    console.log(
      `  run ${String(n).padStart(2, " ")}  wall ${formatMs(sample.wallMs).padStart(10)}  ` +
        `CPU sum ${formatMs(sample.cpuSumMs).padStart(9)}  ` +
        `CPU max ${formatMs(sample.cpuMaxMs).padStart(9)}`,
    );
  }

  const walls = samples.map((sample) => sample.wallMs).sort((a, b) => a - b);
  const cpuSums = samples.map((sample) => sample.cpuSumMs).sort((a, b) => a - b);
  const cpuMaxes = samples.map((sample) => sample.cpuMaxMs).sort((a, b) => a - b);
  const p95Wall = percentile(walls, 95);

  console.log("");
  console.log(`Problem / suite size:  ${problem.slug} · ${suiteSize} cases`);
  console.log(`Median wall time:      ${formatMs(percentile(walls, 50))}`);
  console.log(`p95 wall time:         ${formatMs(p95Wall)}`);
  console.log(`Median CPU sum:        ${formatMs(percentile(cpuSums, 50))}`);
  console.log(`Median CPU max:        ${formatMs(percentile(cpuMaxes, 50))}`);
  console.log(
    `Wall samples (ms):     ${walls.map((value) => value.toFixed(1)).join(", ")}`,
  );
  console.log(
    `Batching milestone?    ${p95Wall > 2000 ? "yes (p95 above ~2s)" : "no"}`,
  );
}

try {
  forgetRuntimes();
  await main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
