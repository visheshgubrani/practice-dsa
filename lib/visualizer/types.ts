import { z } from "zod";

/**
 * What a visualize request may carry, and what comes back.
 *
 * Deliberately one visible case, named by index — the same shape Run uses. The
 * server resolves that index against *public* problem content, so an index a
 * client invents can only ever land on a case the user can already see in the
 * console; hidden cases are not reachable from this path at all.
 */

export const visualizeRequestSchema = z.object({
  slug: z.string().min(1).max(200),
  /** Only the languages with a harness. Python is the only one with a tracer. */
  language: z.enum(["python"]),
  source: z.string().max(200_000),
  /** The case selected in the console. Visible cases only. */
  testcaseIndex: z.number().int().min(0).max(50),
});

export type VisualizeRequest = z.infer<typeof visualizeRequestSchema>;

/** How the traced program ended. */
export const TRACE_OUTCOMES = [
  /** Ran to the end. */
  "completed",
  /** A runtime exception step — shown, never turned into an acceptance. */
  "exception",
  /** The program never compiled, so the trace is a single step. */
  "syntax_error",
  /** The step budget ran out. The picture is honest about stopping. */
  "step_limit",
] as const;

export type TraceOutcome = (typeof TRACE_OUTCOMES)[number];

export type VisualizeResponse = {
  /**
   * The trace the frame draws. Scaffolding steps are gone and line numbers are
   * the editor buffer's; the step shape is still Python Tutor's.
   */
  trace: unknown[];
  /** The editor buffer — the code pane. */
  code: string;
  steps: number;
  truncated: boolean;
  outcome: TraceOutcome;
  /**
   * The tracer's own words for a limit or a syntax error, when it has them.
   * Passed through so the panel never has to read the trace format.
   */
  message?: string;
  engine: {
    version: string;
    /** Milliseconds the engine spent, when it reported them. */
    timeMs?: number;
  };
};

export function isVisualizeResponse(value: unknown): value is VisualizeResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Partial<VisualizeResponse>;
  return (
    Array.isArray(body.trace) &&
    typeof body.code === "string" &&
    typeof body.steps === "number" &&
    typeof body.truncated === "boolean" &&
    typeof body.outcome === "string" &&
    (TRACE_OUTCOMES as readonly string[]).includes(body.outcome)
  );
}
