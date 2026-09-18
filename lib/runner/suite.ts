import { formatArguments } from "@/lib/harness/args";
import type { JudgingProblem } from "@/lib/problems/authoring";
import {
  InvalidRunRequestError,
  JudgingDataError,
} from "@/lib/runner/errors";
import type {
  CaseResult,
  RunRequest,
  RunResult,
  RunnerKind,
} from "@/lib/runner/types";

/**
 * Which cases a Run or Submit will judge, and the one public result shape.
 *
 * A Run names one **visible** case and must name it exactly — clamping a stale
 * index would silently judge the wrong thing, and a hidden index must never be
 * reachable this way. A Submit names the whole suite, visible cases first,
 * then hidden, and stops at the first failure.
 *
 * `totalCount` on Submit is the entire suite, including cases not reached.
 * Hidden successes keep status and metrics only; the first failing hidden case
 * reveals input, expected, output, and diagnostics. That disclosed `CaseResult`
 * is what the console, copy-output, and later history/AI all see.
 */

export type PreparedRun = {
  /** Catalog indices, visible first then hidden. */
  indices: number[];
  /** Entire suite on Submit (including unreached); 1 on Run. */
  totalCount: number;
};

export function visibleCatalogIndices(problem: JudgingProblem): number[] {
  return problem.testcases
    .map((testcase, index) => (testcase.hidden ? -1 : index))
    .filter((index) => index >= 0);
}

export function hiddenCatalogIndices(problem: JudgingProblem): number[] {
  return problem.testcases
    .map((testcase, index) => (testcase.hidden ? index : -1))
    .filter((index) => index >= 0);
}

export function orderedCatalogIndices(problem: JudgingProblem): number[] {
  return [...visibleCatalogIndices(problem), ...hiddenCatalogIndices(problem)];
}

export function publicCaseRef(
  problem: JudgingProblem,
  catalogIndex: number,
): { index: number; hidden: boolean } {
  const testcase = problem.testcases[catalogIndex];
  if (!testcase) {
    throw new JudgingDataError(
      `Problem "${problem.slug}" is missing testcase ${catalogIndex + 1}.`,
    );
  }
  if (testcase.hidden) {
    return {
      index: hiddenCatalogIndices(problem).indexOf(catalogIndex),
      hidden: true,
    };
  }
  return {
    index: visibleCatalogIndices(problem).indexOf(catalogIndex),
    hidden: false,
  };
}

/**
 * The one public case row. Hidden successes are status and metrics only.
 * Failures (and every visible case) keep input, expected, output, diagnostics.
 */
export function discloseCaseResult(result: CaseResult): CaseResult {
  const hidden = result.hidden;
  if (!hidden || result.status !== "accepted") {
    return { ...result, hidden };
  }
  return {
    index: result.index,
    status: result.status,
    hidden: true,
    timeMs: result.timeMs,
    memoryKb: result.memoryKb,
  };
}

export function publishCaseResult(
  problem: JudgingProblem,
  catalogIndex: number,
  result: Omit<CaseResult, "index" | "hidden">,
): CaseResult {
  const ref = publicCaseRef(problem, catalogIndex);
  return discloseCaseResult({
    ...result,
    index: ref.index,
    hidden: ref.hidden,
  });
}

export function prepareRun(
  request: RunRequest,
  problem: JudgingProblem,
): PreparedRun {
  if (problem.testcases.length === 0) {
    throw new JudgingDataError(
      `Problem "${problem.slug}" has no testcases to judge.`,
    );
  }

  const visible = visibleCatalogIndices(problem);
  const indices =
    request.mode === "run"
      ? [requireRunIndex(request.testcaseIndex ?? 0, problem, visible)]
      : orderedCatalogIndices(problem);

  for (const index of indices) {
    requireJudgingCase(problem, index);
  }

  return {
    indices,
    totalCount: request.mode === "run" ? 1 : problem.testcases.length,
  };
}

function requireRunIndex(
  index: number,
  problem: JudgingProblem,
  visible: number[],
): number {
  if (visible.length === 0) {
    throw new InvalidRunRequestError(
      `Testcase index ${index} is out of range (no visible cases).`,
    );
  }
  const last = visible.length - 1;
  if (!Number.isInteger(index) || index < 0 || index > last) {
    throw new InvalidRunRequestError(
      `Testcase index ${index} is out of range (0–${last}).`,
    );
  }
  const catalogIndex = visible[index];
  if (catalogIndex === undefined) {
    throw new InvalidRunRequestError(
      `Testcase index ${index} is out of range (0–${last}).`,
    );
  }
  return catalogIndex;
}

export function requireJudgingCase(problem: JudgingProblem, index: number) {
  const testcase = problem.testcases[index];
  if (!testcase) {
    throw new JudgingDataError(
      `Problem "${problem.slug}" is missing testcase ${index + 1}.`,
    );
  }
  if (!Array.isArray(testcase.args)) {
    throw new JudgingDataError(
      `Problem "${problem.slug}" case ${index + 1} has no arguments.`,
    );
  }
  if (testcase.expected.trim() === "") {
    throw new JudgingDataError(
      `Problem "${problem.slug}" case ${index + 1} has no expected value.`,
    );
  }
  return testcase;
}

export function caseDisplayInput(
  problem: JudgingProblem,
  catalogIndex: number,
): string {
  const testcase = requireJudgingCase(problem, catalogIndex);
  return formatArguments(testcase.args, problem.signature);
}

export function internalErrorResult(
  request: RunRequest,
  runner: RunnerKind,
  message: string,
): RunResult {
  return {
    verdict: "internal_error",
    mode: request.mode,
    runner,
    cases: [],
    compileOutput: message,
    passedCount: 0,
    totalCount: 0,
    at: new Date().toISOString(),
  };
}

/**
 * Catalog faults become an `internal_error` result. A bad Run index stays an
 * exception so the API can reject the request.
 */
export function tryPrepareRun(
  request: RunRequest,
  runner: RunnerKind,
  problem: JudgingProblem,
): PreparedRun | { result: RunResult } {
  try {
    return prepareRun(request, problem);
  } catch (error) {
    if (error instanceof JudgingDataError) {
      return { result: internalErrorResult(request, runner, error.message) };
    }
    throw error;
  }
}
