import { getProblemForJudging } from "@/lib/db/queries/problems";
import { RunnerError } from "@/lib/runner/errors";
import { runWithMock } from "@/lib/runner/mock";
import { runWithPiston } from "@/lib/runner/piston";
import type { RunRequest, RunResult, RunnerKind } from "@/lib/runner/types";

/**
 * The single seam between the UI and code execution.
 *
 * Two executors satisfy `RunResult`, and which one ran is part of the result —
 * the console shows a badge for the mock and a version for the engine, so a
 * simulated verdict is never mistaken for a real one.
 *
 * The choice is `PISTON_URL`:
 *
 *   - set                → the real engine
 *   - unset              → the deterministic mock
 *   - `RUNNER_KIND=mock` → the mock, even with an engine configured
 *
 * A configured-but-unreachable engine is a hard failure, not a silent fallback.
 * Quietly answering with simulated verdicts while the user believes their code
 * just ran is the one outcome worth being loud about.
 */

export {
  InvalidRunRequestError,
  JudgingDataError,
  RunnerError,
} from "@/lib/runner/errors";

export function runnerKind(): RunnerKind {
  const override = process.env.RUNNER_KIND?.trim().toLowerCase();

  if (override === "mock") return "mock";
  if (override === "piston") return "piston";
  return process.env.PISTON_URL ? "piston" : "mock";
}

export async function runSubmission(request: RunRequest): Promise<RunResult> {
  const problem = await getProblemForJudging(request.slug);
  if (!problem) {
    throw new RunnerError(`Unknown problem: ${request.slug}`);
  }

  if (runnerKind() === "piston") {
    return runWithPiston(request, problem);
  }

  // A touch of latency so the running state is observable in the UI.
  await new Promise((resolve) => setTimeout(resolve, 220));

  return runWithMock(request, problem);
}
