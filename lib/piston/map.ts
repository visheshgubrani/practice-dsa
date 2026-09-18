import {
  compareOutput,
  splitHarnessOutput,
  type CompareMode,
} from "@/lib/harness/compare";
import type { LanguageId } from "@/lib/languages";
import { LIMITS } from "@/lib/piston/config";
import { stageStatus, type ExecuteResponse, type Stage } from "@/lib/piston/types";
import type { CaseResult, Verdict } from "@/lib/runner/types";

/**
 * Turns one engine response into one console row.
 *
 * The engine reports *what happened to the process*; a judge needs *what that
 * means*. That translation is here, and it is deliberately the only place that
 * knows both vocabularies.
 */

/** The engine's stdout cap, mirrored for the message we show when it trips. */
const OUTPUT_LIMIT = 65_536;

const TRUNCATE = 8_000;

export function truncateForConsole(text: string): string {
  return text.length > TRUNCATE ? `${text.slice(0, TRUNCATE)}\n… truncated` : text;
}

/**
 * Whether a stage failed in a way that means "this program did not run".
 *
 * A non-zero exit code is the ordinary case; `status` is what the sandbox adds
 * when it intervened. Both count, because a program killed by the sandbox never
 * gets to set an exit code.
 */
export function stageFailed(stage: Stage): boolean {
  return stage.code !== 0 || stage.signal !== null || stageStatus(stage) !== null;
}

export type CaseOutcome = {
  status: Verdict;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
};

/**
 * The verdict for one run stage, before comparison.
 *
 * - `TO` — the CPU or wall budget ran out.
 * - `OL`/`EL` — the program printed more than the engine will buffer. Reported
 *   as a runtime error rather than a wrong answer, because a wrong answer is not
 *   what the user would learn from it.
 * - any signal or non-zero code — the program died.
 */
export function verdictForStage(stage: Stage): Verdict {
  const status = stageStatus(stage);

  if (status === "TO") return "time_limit_exceeded";
  if (status === "OL" || status === "EL") {
    return "runtime_error";
  }
  if (status === "XX") return "internal_error";
  if (stage.signal !== null || stage.code !== 0) return "runtime_error";

  return "accepted";
}

function metrics(stage: Stage): { timeMs?: number; memoryKb?: number } {
  return {
    timeMs: stage.cpu_time === null ? undefined : Math.round(stage.cpu_time),
    memoryKb: stage.memory === null ? undefined : Math.round(stage.memory / 1024),
  };
}

/**
 * The runtime error a user sees.
 *
 * The engine echoes the program's stderr; when it is empty (a signal, or a
 * timeout) the sandbox's own `message` is the only description there is.
 */
function describeFailure(stage: Stage, kind: Verdict): string | undefined {
  const stderr = stage.stderr.trim();
  if (stderr.length > 0) return truncateForConsole(stage.stderr);
  if (kind === "time_limit_exceeded") {
    return `Exceeded the ${LIMITS.runMs} ms time limit.`;
  }
  if (kind === "runtime_error" && stageStatus(stage) === "OL") {
    return `Printed more than the ${OUTPUT_LIMIT} byte output limit.`;
  }
  if (stage.message) return stage.message;
  if (stage.signal) return `Killed by ${stage.signal}.`;
  return undefined;
}

/** One case's row, given its stage and what was expected of it. */
export function toCaseResult(
  index: number,
  stdin: string,
  expected: string,
  stage: Stage,
  mode: CompareMode,
): { result: CaseResult; detail: string } {
  const verdict = verdictForStage(stage);
  const { timeMs, memoryKb } = metrics(stage);

  if (verdict !== "accepted") {
    const { debug, encoded } = splitHarnessOutput(stage.stdout);
    return {
      result: {
        index,
        status: verdict,
        hidden: false,
        input: stdin,
        expected,
        stdout:
          encoded.length > 0
            ? truncateForConsole(encoded)
            : stage.stdout.length > 0
              ? truncateForConsole(stage.stdout)
              : undefined,
        debug: debug.length > 0 ? truncateForConsole(debug) : undefined,
        stderr: describeFailure(stage, verdict),
        timeMs,
        memoryKb,
      },
      detail: verdict,
    };
  }

  const { debug, encoded } = splitHarnessOutput(stage.stdout);
  const comparison = compareOutput(encoded, expected, mode);
  const debugField = debug.length > 0 ? truncateForConsole(debug) : undefined;
  if (!comparison.matches) {
    return {
      result: {
        index,
        status: "wrong_answer",
        hidden: false,
        input: stdin,
        expected,
        stdout: truncateForConsole(encoded),
        debug: debugField,
        timeMs,
        memoryKb,
      },
      detail: `wrong_answer (${comparison.detail})`,
    };
  }

  return {
    result: {
      index,
      status: "accepted",
      hidden: false,
      input: stdin,
      expected,
      stdout: truncateForConsole(encoded),
      debug: debugField,
      timeMs,
      memoryKb,
    },
    detail: `accepted (${comparison.detail})`,
  };
}

/**
 * Whether a compile failure is really a compile failure.
 *
 * The engine answers a failed compile with *both* stages, and the second one is
 * just a copy of the first — so `run` looks like a runtime error that repeats the
 * compiler's message. The tell is the presence of `compile`, which Piston only
 * sends for a language that has a compile step at all.
 */
export function compileFailure(
  response: ExecuteResponse,
): { output: string } | null {
  const compile = response.compile;
  if (!compile || !stageFailed(compile)) return null;
  const output = (compile.output || compile.stderr || compile.stdout || "").trim();
  return {
    output:
      output.length > 0
        ? truncateForConsole(output)
        : compile.message ?? "Compilation failed.",
  };
}

/**
 * Whether an interpreter's syntax error should be reported as a compile error.
 *
 * Python and JavaScript have no compile stage — the engine omits `compile` for
 * them entirely, which is what tells the two cases apart — so a typo arrives as
 * a run-stage `SyntaxError` on every case. It is the whole program's fault, so it
 * is reported once, like a compiler error, instead of as case 1's crash.
 */
export function isSyntaxFailure(
  response: ExecuteResponse,
  language: LanguageId,
): boolean {
  if (language !== "python" && language !== "javascript") return false;
  const stage = response.run;
  if (!stage || !stageFailed(stage)) return false;
  return /SyntaxError/.test(stage.stderr) || /SyntaxError/.test(stage.stdout);
}
