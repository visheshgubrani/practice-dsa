import { encodeJsonArgs } from "@/lib/harness/args";
import { resolveCompare } from "@/lib/harness/compare";
import { buildPythonProgram } from "@/lib/harness/python";
import { getLanguage } from "@/lib/languages";
import { CASE_DEADLINE_MS, LIMITS } from "@/lib/piston/config";
import { execute, type EngineResult } from "@/lib/piston/client";
import { compileFailure, isSyntaxFailure, toCaseResult } from "@/lib/piston/map";
import type { JudgingProblem } from "@/lib/problems/authoring";
import { RunnerError } from "@/lib/runner/errors";
import {
  caseDisplayInput,
  internalErrorResult,
  publishCaseResult,
  tryPrepareRun,
} from "@/lib/runner/suite";
import type {
  CaseResult,
  RunRequest,
  RunResult,
  Verdict,
} from "@/lib/runner/types";

/**
 * Judging, from the app's point of view.
 *
 * One `Run` evaluates the visible case the console has selected; one `Submit`
 * evaluates visible cases first, then hidden cases, stopping at the first
 * failure. `totalCount` is the entire suite, so "1/11 cases" means ten were
 * not reached rather than ten were not counted.
 *
 * Cases run one at a time rather than in a batch. The engine is happy either
 * way, but a case's time is measured while it runs, and nothing competes for
 * the CPU if nothing else is running.
 *
 * Hidden successes leave this path as status and metrics only. The first
 * failing hidden case keeps input, expected, output, and diagnostics. That is
 * the same `CaseResult` the console and later history/AI will store.
 */

/**
 * Which verdict wins when cases disagree.
 *
 * Higher loses. A program that never parsed outranks everything because nothing
 * ran; a timeout outranks a runtime error because it is the more specific
 * diagnosis; an internal failure outranks all of them because it is the app's
 * fault, not the solution's, and must never be reported as a wrong answer.
 */
const SEVERITY: Record<Verdict, number> = {
  accepted: 0,
  wrong_answer: 1,
  time_limit_exceeded: 2,
  runtime_error: 3,
  compile_error: 4,
  internal_error: 5,
};

function worst(a: Verdict, b: Verdict): Verdict {
  return SEVERITY[b] > SEVERITY[a] ? b : a;
}

export async function runWithPiston(
  request: RunRequest,
  problem: JudgingProblem,
): Promise<RunResult> {
  const prepared = tryPrepareRun(request, "piston", problem);
  if ("result" in prepared) return prepared.result;
  const { indices, totalCount } = prepared;

  const language = getLanguage(request.language);
  const program = buildPythonProgram(request.source, problem.signature);

  const cases: CaseResult[] = [];
  let verdict: Verdict = "accepted";
  let compileOutput: string | undefined;
  let engineVersion: string | undefined;

  for (const [slot, catalogIndex] of indices.entries()) {
    const testcase = problem.testcases[catalogIndex];
    if (!testcase) {
      return internalErrorResult(
        request,
        "piston",
        `Problem "${problem.slug}" is missing testcase ${catalogIndex + 1}.`,
      );
    }
    const compare = resolveCompare(testcase.compare, problem.compare);
    const input = caseDisplayInput(problem, catalogIndex);

    const outcome: EngineResult = await execute(
      {
        language: language.id,
        source: program.source,
        fileName: program.fileName,
        stdin: encodeJsonArgs(testcase.args),
        runMs: LIMITS.runMs,
        compileMs: LIMITS.compileMs,
        memoryBytes: LIMITS.memoryBytes,
      },
      {
        timeoutMs: CASE_DEADLINE_MS,
        concurrency: LIMITS.concurrency,
        queueLimit: LIMITS.queueLimit,
      },
    );

    engineVersion = outcome.response.version;

    // A compile failure is one verdict for the whole submission: report it on
    // the first reached case, with the compiler's own words carried up separately.
    const failedToCompile = compileFailure(outcome.response);
    if (failedToCompile) {
      compileOutput = failedToCompile.output;
      verdict = worst(verdict, "compile_error");
      cases.push(
        publishCaseResult(problem, catalogIndex, {
          status: "compile_error",
          input,
          expected: testcase.expected,
        }),
      );
      break;
    }

    const stage = outcome.response.run;
    if (!stage) {
      throw new RunnerError(
        "The execution engine answered without a result for this case.",
      );
    }

    // Python has no compile stage, so a syntax error arrives as a run failure on
    // the first case. It is the whole program's fault, so it is reported once,
    // like a compiler error, instead of as case 1's crash.
    if (slot === 0 && isSyntaxFailure(outcome.response, language.id)) {
      compileOutput = stage.stderr.trim() || stage.output.trim();
      verdict = worst(verdict, "compile_error");
      cases.push(
        publishCaseResult(problem, catalogIndex, {
          status: "compile_error",
          input,
          expected: testcase.expected,
        }),
      );
      break;
    }

    const { result } = toCaseResult(
      catalogIndex,
      input,
      testcase.expected,
      stage,
      compare,
    );
    cases.push(publishCaseResult(problem, catalogIndex, result));
    verdict = worst(verdict, result.status);

    if (result.status !== "accepted") break;
  }

  const passed = cases.filter((entry) => entry.status === "accepted").length;
  const slowest = cases.reduce((value, entry) => Math.max(value, entry.timeMs ?? 0), 0);
  const hungriest = cases.reduce(
    (value, entry) => Math.max(value, entry.memoryKb ?? 0),
    0,
  );
  const firstFailure = cases.find((entry) => entry.status !== "accepted");

  return {
    verdict,
    mode: request.mode,
    runner: "piston",
    cases,
    compileOutput,
    passedCount: passed,
    totalCount,
    timeMs: verdict === "accepted" ? slowest : firstFailure?.timeMs,
    memoryKb: verdict === "accepted" ? hungriest : firstFailure?.memoryKb,
    at: new Date().toISOString(),
    pistonVersion: engineVersion,
  };
}
