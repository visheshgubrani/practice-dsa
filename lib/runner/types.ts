import { z } from "zod";

/**
 * The contract between the UI and whatever executes code. The Piston runner and
 * the deterministic mock both satisfy it, and `lib/runner/index.ts` picks
 * between them.
 */

export const VERDICTS = [
  "accepted",
  "wrong_answer",
  "compile_error",
  "runtime_error",
  "time_limit_exceeded",
  "internal_error",
] as const;

export type Verdict = (typeof VERDICTS)[number];

export const RUN_MODES = ["run", "submit"] as const;
export type RunMode = (typeof RUN_MODES)[number];

/**
 * Which executor produced a run.
 *
 * `judge0` is a leftover: Judge0 was the original phase-2 plan, the database
 * enum still carries the value for rows written before this one, and nothing
 * writes it.
 */
export const RUNNER_KINDS = ["mock", "piston", "judge0"] as const;
export type RunnerKind = (typeof RUNNER_KINDS)[number];

export const runRequestSchema = z.object({
  slug: z.string().min(1).max(200),
  /**
   * Only the languages with a harness. The client is the only source of this
   * value, and `components/workspace/language-picker.tsx` offers exactly these.
   */
  language: z.enum(["python"]),
  source: z.string().max(200_000),
  mode: z.enum(RUN_MODES),
  /** Only meaningful for `mode: "run"` — the case selected in the console. */
  testcaseIndex: z.number().int().min(0).max(50).optional(),
  /** Idempotency key so a retry cannot insert a second history row. */
  requestId: z.string().uuid().optional(),
});

export type RunRequest = z.infer<typeof runRequestSchema>;

export type CaseResult = {
  /**
   * 0-based index within the visible group, or within the hidden group.
   * Console sample tabs are visible indices; hidden rows do not share that list.
   */
  index: number;
  status: Verdict;
  /** Hidden catalog case. Successes keep status and metrics only. */
  hidden: boolean;
  /**
   * Display input generated from arguments. Omitted for hidden successes;
   * present on visible cases and on the first failing hidden case.
   */
  input?: string;
  /**
   * Expected JSON text. Omitted for hidden successes; present on visible
   * cases and on the first failing hidden case.
   */
  expected?: string;
  /** The serialized return value that was compared. */
  stdout?: string;
  /** User `print()` output, captured separately from the return value. */
  debug?: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
};

export type RunResult = {
  verdict: Verdict;
  mode: RunMode;
  runner: RunnerKind;
  cases: CaseResult[];
  /** Compiler diagnostics, when the language has a compile step. */
  compileOutput?: string;
  passedCount: number;
  totalCount: number;
  timeMs?: number;
  memoryKb?: number;
  at: string;
  /** The engine's version of the language, when a real engine judged this run. */
  pistonVersion?: string;
  /**
   * False when judging succeeded but the history / progress write did not.
   * Missing on results that never went through `/api/run`.
   */
  persisted?: boolean;
  submissionId?: string;
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  compile_error: "Compile Error",
  runtime_error: "Runtime Error",
  time_limit_exceeded: "Time Limit Exceeded",
  internal_error: "Internal Error",
};

export type VerdictTone = "success" | "danger" | "info";

export function verdictTone(verdict: Verdict): VerdictTone {
  if (verdict === "accepted") return "success";
  if (verdict === "internal_error") return "info";
  return "danger";
}

export function summarizeRun(result: RunResult): string {
  const parts = [
    VERDICT_LABEL[result.verdict],
    `${result.passedCount}/${result.totalCount}`,
  ];
  if (result.timeMs !== undefined) parts.push(`${result.timeMs} ms`);
  if (result.memoryKb !== undefined) {
    parts.push(`${(result.memoryKb / 1024).toFixed(1)} MB`);
  }
  return parts.join(" · ");
}

/** Console, copy-output, and later history/AI all label a case the same way. */
export function caseLabel(entry: Pick<CaseResult, "index" | "hidden">): string {
  return entry.hidden ? `Hidden ${entry.index + 1}` : `Case ${entry.index + 1}`;
}

/** Client-facing helper: the run result arrives as JSON, so narrow it. */
export function isRunResult(value: unknown): value is RunResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RunResult>;
  return (
    typeof candidate.verdict === "string" &&
    VERDICTS.includes(candidate.verdict as Verdict) &&
    Array.isArray(candidate.cases)
  );
}

/**
 * Only a successful Piston Submit counts as solving a problem.
 *
 * A sample Run that happens to pass, and any mock / simulated result, do not.
 */
export function isVerifiedAcceptance(
  result: Pick<RunResult, "mode" | "runner" | "verdict">,
): boolean {
  return (
    result.mode === "submit" &&
    result.runner === "piston" &&
    result.verdict === "accepted"
  );
}
