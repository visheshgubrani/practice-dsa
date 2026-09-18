#!/usr/bin/env node

/**
 * Development probe for the generated harness.
 *
 * Builds one program, hands it to Piston directly, and prints what came back. It
 * exists so the harness can be exercised without a running app or database —
 * `pnpm piston:check` is the assertion, this is the microscope.
 *
 * Usage:
 *   npx tsx scripts/probe-envelope.mts <slug> [solutionPath]
 *
 * With no solutionPath the problem's starter template is used, which is the
 * fastest way to see exactly what an untouched editor sends.
 */

import { readFileSync } from "node:fs";

import { loadPistonEnv } from "@/lib/piston/env";

// `PISTON_URL` is read when the config module is first imported, and static
// imports are hoisted, so the environment is loaded before the runner is.
loadPistonEnv();

const { buildPythonProgram } = await import("@/lib/harness/python");
const { getLanguage } = await import("@/lib/languages");
const { PISTON_URL, RUNTIMES } = await import("@/lib/piston/config");
const { encodeJsonArgs } = await import("@/lib/harness/args");
const { PROBLEMS } = await import("@/lib/problems/catalog");

const [slug, solutionPath] = process.argv.slice(2);
const problem = PROBLEMS.find((entry) => entry.slug === slug);
if (!problem) {
  console.error("usage: probe-envelope.mts <slug> [solutionPath]");
  process.exit(2);
}

const language = getLanguage("python");
const source = solutionPath
  ? readFileSync(solutionPath, "utf8")
  : problem.starterCode[language.id];

const program = buildPythonProgram(source, problem.signature);
const authoredCase = problem.testcases[0];
if (!authoredCase) {
  console.error(`${slug} has no testcases`);
  process.exit(2);
}

const harnessStdin = encodeJsonArgs(authoredCase.args);

const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    language: language.pistonName,
    version: RUNTIMES[language.id],
    files: [{ name: program.fileName, content: program.source }],
    stdin: harnessStdin,
    run_timeout: 2000,
    compile_timeout: 20_000,
  }),
  signal: AbortSignal.timeout(60_000),
});

if (!response.ok) {
  console.error(`HTTP ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const result = (await response.json()) as {
  run?: {
    code: number | null;
    status: string | null;
    signal: string | null;
    stdout: string;
    stderr: string;
    wall_time?: number;
  };
};

console.log("--- harness stdin ---");
console.log(harnessStdin);
console.log("--- expected ---");
console.log(authoredCase.expected);
console.log(
  "--- run " +
    JSON.stringify({
      code: result.run?.code,
      status: result.run?.status,
      signal: result.run?.signal,
      wall_time: result.run?.wall_time,
    }) +
    " ---",
);
console.log("stdout:", JSON.stringify(result.run?.stdout));
if (result.run?.stderr) console.log("stderr:", result.run.stderr.slice(0, 4000));
