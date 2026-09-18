import { getLanguage } from "@/lib/languages";
import { normalizeSource } from "@/lib/problems";
import type { JudgingProblem } from "@/lib/problems/authoring";
import {
  caseDisplayInput,
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
 * Deterministic stand-in judge for the UI phase.
 *
 * It never executes code. Instead it maps recognizable shapes of the submitted
 * source onto real verdicts so every console state is reachable on demand:
 *
 *   - blank source                     -> compile_error
 *   - untouched starter template       -> compile_error
 *   - contains `force:wrong-answer`    -> wrong_answer (a later case fails)
 *   - contains `force:runtime-error`   -> runtime_error
 *   - contains `force:tle`             -> time_limit_exceeded
 *   - contains `force:output-limit`    -> runtime_error (output buffer overflow)
 *   - anything else                    -> accepted
 *
 * Forced markers are plain text, so they survive inside any comment syntax:
 * `# force:wrong-answer`, `# force:tle`, `# force:runtime-error`.
 *
 * It remains reachable on purpose: `RUNNER_KIND=mock` brings it back when the
 * point is to exercise a console state rather than a solution.
 *
 * Submit stops at the first failure, same as the Piston runner, and reports
 * `totalCount` for the whole suite. Hidden successes are redacted through
 * `publishCaseResult`.
 */

const FORCED_VERDICTS: Array<{ marker: string; verdict: Verdict }> = [
  { marker: "force:wrong-answer", verdict: "wrong_answer" },
  { marker: "force:runtime-error", verdict: "runtime_error" },
  { marker: "force:tle", verdict: "time_limit_exceeded" },
];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Stable pseudo-metrics so identical code reports identical numbers. */
function metricsFor(source: string, index: number) {
  const hash = fnv1a(`${index}:${source.length}:${source.slice(0, 64)}`);
  return {
    timeMs: 8 + (hash % 53),
    memoryKb: 9728 + (hash % 4800),
  };
}

function buildResult(
  request: RunRequest,
  problem: JudgingProblem,
  indices: number[],
  totalCount: number,
  verdict: Verdict,
  details: {
    compileOutput?: string;
    stderr?: string;
    /** Case index (position in `indices`) that receives the failure. */
    failingSlot?: number;
    stdoutForFailure?: string;
    expectedForFailure?: string;
  } = {},
): RunResult {
  const failingSlot = details.failingSlot ?? 0;
  const reached =
    verdict === "accepted"
      ? indices
      : indices.slice(0, Math.min(failingSlot, indices.length - 1) + 1);

  const cases: CaseResult[] = reached.map((caseIndex, slot) => {
    const testcase = problem.testcases[caseIndex];
    if (!testcase) {
      return {
        index: caseIndex,
        status: "internal_error" as const,
        hidden: false,
        input: "",
        expected: "",
      };
    }
    const passed = verdict === "accepted" || slot !== failingSlot;
    const metrics = metricsFor(request.source, caseIndex);
    const input = caseDisplayInput(problem, caseIndex);

    if (verdict === "compile_error" || verdict === "internal_error") {
      return publishCaseResult(problem, caseIndex, {
        status: verdict,
        input,
        expected: testcase.expected,
      });
    }

    if (passed) {
      return publishCaseResult(problem, caseIndex, {
        status: "accepted",
        input,
        expected: testcase.expected,
        stdout: testcase.expected,
        ...metrics,
      });
    }

    return publishCaseResult(problem, caseIndex, {
      status: verdict,
      input,
      expected: details.expectedForFailure ?? testcase.expected,
      stdout: details.stdoutForFailure ?? "",
      stderr: details.stderr,
      timeMs: verdict === "time_limit_exceeded" ? 1000 : 0,
      memoryKb: verdict === "time_limit_exceeded" ? metrics.memoryKb : undefined,
    });
  });

  const slowest = cases.reduce((worst, entry) => Math.max(worst, entry.timeMs ?? 0), 0);
  const hungriest = cases.reduce(
    (worst, entry) => Math.max(worst, entry.memoryKb ?? 0),
    0,
  );

  return {
    verdict,
    mode: request.mode,
    runner: "mock",
    cases,
    compileOutput: details.compileOutput,
    passedCount: cases.filter((entry) => entry.status === "accepted").length,
    totalCount,
    timeMs: verdict === "accepted" ? slowest : cases[failingSlot]?.timeMs,
    memoryKb: verdict === "accepted" ? hungriest : cases[failingSlot]?.memoryKb,
    at: new Date().toISOString(),
  };
}

export function runWithMock(
  request: RunRequest,
  problem: JudgingProblem,
): RunResult {
  const prepared = tryPrepareRun(request, "mock", problem);
  if ("result" in prepared) return prepared.result;
  const { indices, totalCount } = prepared;

  const language = getLanguage(request.language);

  const trimmed = request.source.trim();
  if (trimmed.length === 0) {
    return buildResult(request, problem, indices, totalCount, "compile_error", {
      compileOutput: `${language.label}: no source submitted.`,
    });
  }

  const submission = normalizeSource(request.source);
  const starter = normalizeSource(problem.starterCode[request.language]);

  if (submission === starter) {
    return buildResult(request, problem, indices, totalCount, "compile_error", {
      compileOutput: [
        `${language.label}: no implementation detected — the starter template is unmodified.`,
        "Write your solution in the editor, then run again.",
      ].join("\n"),
    });
  }

  const forced = FORCED_VERDICTS.find(({ marker }) =>
    request.source.includes(marker),
  );

  if (request.source.includes("force:output-limit")) {
    return buildResult(request, problem, indices, totalCount, "runtime_error", {
      stderr: "Printed more than the 65536 byte output limit.",
    });
  }

  if (forced?.verdict === "wrong_answer") {
    const failingSlot = Math.min(1, indices.length - 1);
    const failingIndex = indices[failingSlot] ?? 0;
    return buildResult(request, problem, indices, totalCount, "wrong_answer", {
      failingSlot,
      stdoutForFailure: "[]",
      expectedForFailure: problem.testcases[failingIndex]?.expected,
    });
  }

  if (forced?.verdict === "runtime_error") {
    return buildResult(request, problem, indices, totalCount, "runtime_error", {
      stderr: [
        `IndexError: list index out of range`,
        `  at line 4 in Solution.${language.extension} (${problem.slug})`,
      ].join("\n"),
    });
  }

  if (forced?.verdict === "time_limit_exceeded") {
    return buildResult(request, problem, indices, totalCount, "time_limit_exceeded", {
      stderr: "Exceeded the 1000 ms time limit.",
    });
  }

  return buildResult(request, problem, indices, totalCount, "accepted");
}
