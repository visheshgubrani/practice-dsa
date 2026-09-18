/**
 * Docker-free catalog conformance.
 *
 * Runs each problem's Python reference through the production harness against
 * every authored case (visible and hidden), then compares with the production
 * comparator. Missing expectations print a ready-to-paste candidate and fail
 * until someone adds it by hand. A mismatch is never rewritten.
 *
 * When an oracle can solve a small input, it must agree with the reference and
 * with any authored expected value. Generated small inputs (not in the catalog)
 * are checked the same way.
 */

import { spawnSync } from "node:child_process";

import { encodeJsonArgs, formatArguments } from "@/lib/harness/args";
import {
  compareOutput,
  resolveCompare,
  splitHarnessOutput,
} from "@/lib/harness/compare";
import { buildPythonProgram } from "@/lib/harness/python";
import type { AuthoredProblem, AuthoredTestcase } from "@/lib/problems/authoring";
import {
  generatedOracleCases,
  oracleAnswer,
} from "@/lib/problems/oracles";
import { validateCatalog } from "@/lib/problems/validate";

export const CASE_TIMEOUT_MS = 2000;
export const OUTPUT_LIMIT = 65_536;
export const MIN_VISIBLE = 2;
export const MAX_VISIBLE = 3;
export const MIN_HIDDEN = 8;

const PYTHON = process.env.PYTHON?.trim() || "python3";

export type ConformanceIssue = {
  slug: string;
  kind:
    | "validation"
    | "strength"
    | "missing_expected"
    | "mismatch"
    | "oracle_disagreement"
    | "runtime"
    | "timeout"
    | "output_limit"
    | "python";
  message: string;
};

export type ConformanceReport = {
  ok: boolean;
  issues: ConformanceIssue[];
  checked: number;
};

type LocalRun =
  | { ok: true; encoded: string }
  | { ok: false; kind: ConformanceIssue["kind"]; detail: string };

function candidateLine(testcase: AuthoredTestcase, actual: string): string {
  const parts = [
    `args: ${JSON.stringify(testcase.args)}`,
    `expected: ${JSON.stringify(actual)}`,
  ];
  if (testcase.hidden) parts.push("hidden: true");
  if (testcase.compare) parts.push(`compare: ${JSON.stringify(testcase.compare)}`);
  if (testcase.note) parts.push(`note: ${JSON.stringify(testcase.note)}`);
  return `{ ${parts.join(", ")} },`;
}

function runReference(
  problem: AuthoredProblem,
  args: readonly unknown[],
): LocalRun {
  const { source } = buildPythonProgram(problem.reference, problem.signature);
  const result = spawnSync(PYTHON, ["-c", source], {
    encoding: "utf8",
    input: encodeJsonArgs(args as Parameters<typeof encodeJsonArgs>[0]),
    timeout: CASE_TIMEOUT_MS,
    maxBuffer: OUTPUT_LIMIT + 1024,
    killSignal: "SIGKILL",
  });

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        ok: false,
        kind: "python",
        detail: `python is required (${PYTHON} was not found). Install Python 3.`,
      };
    }
    if (err.code === "ETIMEDOUT") {
      return {
        ok: false,
        kind: "timeout",
        detail: `exceeded the ${CASE_TIMEOUT_MS} ms time limit`,
      };
    }
    return { ok: false, kind: "runtime", detail: err.message };
  }

  if (result.signal === "SIGKILL" || result.status === null) {
    return {
      ok: false,
      kind: "timeout",
      detail: `exceeded the ${CASE_TIMEOUT_MS} ms time limit`,
    };
  }

  const stdout = result.stdout ?? "";
  const stderr = (result.stderr ?? "").trim();
  if (stdout.length > OUTPUT_LIMIT || (result.stderr ?? "").length > OUTPUT_LIMIT) {
    return {
      ok: false,
      kind: "output_limit",
      detail: `printed more than the ${OUTPUT_LIMIT} byte output limit`,
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      kind: "runtime",
      detail: stderr || `exit ${result.status}`,
    };
  }

  const { encoded } = splitHarnessOutput(stdout);
  if (encoded.length === 0) {
    return {
      ok: false,
      kind: "runtime",
      detail: "reference produced no serialized return",
    };
  }
  return { ok: true, encoded };
}

function describeCase(
  problem: AuthoredProblem,
  index: number,
  testcase: AuthoredTestcase,
): string {
  const visibility = testcase.hidden ? "hidden" : "visible";
  const input = formatArguments(testcase.args, problem.signature);
  return `${problem.slug} case ${index + 1} (${visibility})\n  arguments: ${JSON.stringify(testcase.args)}\n  input:     ${input.replace(/\n/g, " | ")}`;
}

function strengthIssues(problem: AuthoredProblem): ConformanceIssue[] {
  const visible = problem.testcases.filter((testcase) => !testcase.hidden).length;
  const hidden = problem.testcases.filter((testcase) => testcase.hidden).length;
  const issues: ConformanceIssue[] = [];

  if (visible < MIN_VISIBLE || visible > MAX_VISIBLE) {
    issues.push({
      slug: problem.slug,
      kind: "strength",
      message: `${problem.slug}: ${visible} visible cases; need ${MIN_VISIBLE}–${MAX_VISIBLE}`,
    });
  }
  if (hidden < MIN_HIDDEN) {
    issues.push({
      slug: problem.slug,
      kind: "strength",
      message: `${problem.slug}: ${hidden} hidden cases; need at least ${MIN_HIDDEN}`,
    });
  }
  if (!(problem.sourceUrl ?? "").trim()) {
    issues.push({
      slug: problem.slug,
      kind: "strength",
      message: `${problem.slug}: missing sourceUrl`,
    });
  }

  const unexplained = problem.testcases
    .map((testcase, index) => ({ testcase, index }))
    .filter(
      ({ testcase }) =>
        !testcase.hidden && (testcase.note ?? "").trim().length === 0,
    );
  if (unexplained.length > 0) {
    issues.push({
      slug: problem.slug,
      kind: "strength",
      message: `${problem.slug}: visible cases ${unexplained.map(({ index }) => index + 1).join(", ")} have no explanation (note)`,
    });
  }

  return issues;
}

function checkAuthoredCase(
  problem: AuthoredProblem,
  testcase: AuthoredTestcase,
  index: number,
  issues: ConformanceIssue[],
): number {
  const header = describeCase(problem, index, testcase);
  const run = runReference(problem, testcase.args);
  if (!run.ok) {
    issues.push({
      slug: problem.slug,
      kind: run.kind,
      message: `${header}\n  error:     ${run.detail}`,
    });
    return 1;
  }

  const actual = run.encoded;
  const oracle = oracleAnswer(problem.slug, testcase.args);
  const compare = resolveCompare(testcase.compare, problem.compare);
  const expected = testcase.expected?.trim() ?? "";

  if (oracle !== null) {
    const vsOracle = compareOutput(actual, oracle, compare);
    if (!vsOracle.matches) {
      issues.push({
        slug: problem.slug,
        kind: "oracle_disagreement",
        message: [
          header,
          `  expected:  ${expected.length > 0 ? expected : "(missing)"}`,
          `  actual:    ${actual}`,
          `  oracle:    ${oracle}`,
          "  review the testcase, the reference solution, and the comparator — nothing was rewritten.",
        ].join("\n"),
      });
    }
  }

  if (expected.length === 0) {
    issues.push({
      slug: problem.slug,
      kind: "missing_expected",
      message: [
        header,
        `  expected:  (missing)`,
        `  actual:    ${actual}`,
        oracle !== null ? `  oracle:    ${oracle}` : undefined,
        "  candidate to paste (review, then add by hand):",
        `    ${candidateLine(testcase, actual)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return 1;
  }

  const vsExpected = compareOutput(actual, expected, compare);
  if (!vsExpected.matches) {
    issues.push({
      slug: problem.slug,
      kind: "mismatch",
      message: [
        header,
        `  expected:  ${expected}`,
        `  actual:    ${actual}`,
        oracle !== null ? `  oracle:    ${oracle}` : undefined,
        `  compared:  ${vsExpected.detail}`,
        "  not replaced — review the testcase, the reference solution, and the comparator.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } else if (oracle !== null) {
    const expectedVsOracle = compareOutput(expected, oracle, compare);
    if (!expectedVsOracle.matches) {
      issues.push({
        slug: problem.slug,
        kind: "oracle_disagreement",
        message: [
          header,
          `  expected:  ${expected}`,
          `  actual:    ${actual}`,
          `  oracle:    ${oracle}`,
          "  authored expected disagrees with the oracle. Review; nothing was rewritten.",
        ].join("\n"),
      });
    }
  }

  return 1;
}

function checkGenerated(
  problem: AuthoredProblem,
  issues: ConformanceIssue[],
): number {
  let checked = 0;
  for (const generated of generatedOracleCases(problem.slug)) {
    const oracle = oracleAnswer(problem.slug, generated.args);
    if (oracle === null) continue;
    const run = runReference(problem, generated.args);
    checked += 1;
    if (!run.ok) {
      issues.push({
        slug: problem.slug,
        kind: run.kind,
        message: `${problem.slug} ${generated.label}\n  arguments: ${JSON.stringify(generated.args)}\n  error:     ${run.detail}`,
      });
      continue;
    }
    const compare = resolveCompare(undefined, problem.compare);
    const vsOracle = compareOutput(run.encoded, oracle, compare);
    if (!vsOracle.matches) {
      issues.push({
        slug: problem.slug,
        kind: "oracle_disagreement",
        message: [
          `${problem.slug} ${generated.label}`,
          `  arguments: ${JSON.stringify(generated.args)}`,
          `  actual:    ${run.encoded}`,
          `  oracle:    ${oracle}`,
          "  review the reference solution and the comparator — nothing was rewritten.",
        ].join("\n"),
      });
    }
  }
  return checked;
}

function checkExampleAnchors(
  problem: AuthoredProblem,
  issues: ConformanceIssue[],
): number {
  let checked = 0;
  for (const [index, example] of problem.examples.entries()) {
    const run = runReference(problem, example.args);
    checked += 1;
    if (!run.ok) {
      issues.push({
        slug: problem.slug,
        kind: run.kind,
        message: `${problem.slug} example ${index + 1}\n  arguments: ${JSON.stringify(example.args)}\n  error:     ${run.detail}`,
      });
      continue;
    }
    const compare = resolveCompare(undefined, problem.compare);
    const vsOutput = compareOutput(run.encoded, example.output, compare);
    if (!vsOutput.matches) {
      issues.push({
        slug: problem.slug,
        kind: "mismatch",
        message: [
          `${problem.slug} example ${index + 1} (hand-verified anchor)`,
          `  arguments: ${JSON.stringify(example.args)}`,
          `  example:   ${example.output}`,
          `  actual:    ${run.encoded}`,
          "  not replaced — review the example, the reference solution, and the comparator.",
        ].join("\n"),
      });
    }
  }
  return checked;
}

/** Structural validation, strength, reference vs suite, oracle, and example anchors. */
export function checkCatalog(
  problems: readonly AuthoredProblem[],
): ConformanceReport {
  const issues: ConformanceIssue[] = [];
  let checked = 0;

  const invalid = validateCatalog(problems, { requireExpected: false });
  for (const message of invalid) {
    issues.push({ slug: "catalog", kind: "validation", message });
  }

  for (const problem of problems) {
    issues.push(...strengthIssues(problem));
    if ((problem.reference ?? "").trim().length === 0) continue;

    checked += checkExampleAnchors(problem, issues);

    for (const [index, testcase] of problem.testcases.entries()) {
      checked += checkAuthoredCase(problem, testcase, index, issues);
    }

    checked += checkGenerated(problem, issues);
  }

  return { ok: issues.length === 0, issues, checked };
}

export function formatConformanceReport(report: ConformanceReport): string {
  if (report.ok) {
    return `Catalog conformance passed (${report.checked} checks).`;
  }
  const body = report.issues.map((issue) => issue.message).join("\n\n");
  return [
    `Catalog conformance failed (${report.issues.length} issue${report.issues.length === 1 ? "" : "s"}, ${report.checked} checks).`,
    "",
    body,
    "",
    "Nothing was written. Add missing expectations by hand after review; never auto-replace a mismatch.",
  ].join("\n");
}
