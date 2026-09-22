import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getProblem } from "@/lib/db/queries/problems";
import {
  ENGINE_OUTPUT_LIMIT,
  LIMITS,
  TRACE_DEADLINE_MS,
  TRACE_LIMITS,
} from "@/lib/piston/config";
import { execute } from "@/lib/piston/client";
import { stageStatus, type Stage } from "@/lib/piston/types";
import { runnerKind } from "@/lib/runner";
import { VisualizerError } from "@/lib/visualizer/errors";
import { presentTrace } from "@/lib/visualizer/present";
import {
  buildTraceProgram,
  TRACE_ENCODER_FILE,
  TRACE_LOGGER_FILE,
} from "@/lib/visualizer/program";
import type {
  TraceOutcome,
  VisualizeRequest,
  VisualizeResponse,
} from "@/lib/visualizer/types";

/**
 * One visible case, traced in the judging sandbox.
 *
 * The boundaries this module refuses to cross:
 *
 *   - **Visible cases only.** The case is looked up by index in *public*
 *     problem content (`getProblem`), so a hidden case is not addressable from
 *     this path even if a client asks for a large index — it is out of range.
 *   - **The real engine only.** A mock run executes nothing, and a picture
 *     drawn from a simulation would teach the wrong thing.
 *   - **No writes.** Nothing here imports a submissions, practice, or progress
 *     query: visualizing is not running, and it is certainly not submitting.
 *   - **Data, not interpolation.** The program is built by
 *     `lib/visualizer/program.ts` and travels to the engine on stdin; the
 *     tracer's own source is read from `vendor/python-tutor`, never generated.
 */

/** The committed tracer, read per request but re-read only when it changes. */
const TRACER_DIR = path.join(process.cwd(), "vendor", "python-tutor");

type CachedFile = { stamp: string; content: string };
let tracerCache: { logger: CachedFile; encoder: CachedFile } | null = null;

async function readTracerFile(
  name: string,
  cached: CachedFile | undefined,
): Promise<CachedFile> {
  const full = path.join(TRACER_DIR, name);
  let stamp: string;
  try {
    const info = await stat(full);
    stamp = `${info.size}:${info.mtimeMs}`;
  } catch {
    throw new VisualizerError(
      `The vendored tracer is missing at ${path.relative(process.cwd(), full)}. ` +
        `Re-vendor it, or restore the file from git.`,
      500,
    );
  }
  if (cached && cached.stamp === stamp) return cached;
  return { stamp, content: await readFile(full, "utf8") };
}

export async function readTracer(): Promise<{ logger: string; encoder: string }> {
  const logger = await readTracerFile(TRACE_LOGGER_FILE, tracerCache?.logger);
  const encoder = await readTracerFile(TRACE_ENCODER_FILE, tracerCache?.encoder);
  tracerCache = { logger, encoder };
  return { logger: logger.content, encoder: encoder.content };
}

/* -------------------------------------------------------------------------- */
/* Reading what the driver printed                                            */
/* -------------------------------------------------------------------------- */

const TRACE_PREFIX = "TRACE ";
const TRACE_ERROR_PREFIX = "TRACE_ERROR ";

export type DriverOutput =
  | { ok: true; trace: unknown[] }
  | { ok: false; error: string };

/**
 * The driver's last word, whichever it was.
 *
 * Scanned from the end because the payload is the last thing written, and
 * prefixed so that anything a solution printed cannot be mistaken for it.
 */
export function parseDriverOutput(stdout: string): DriverOutput {
  const lines = stdout.split("\n");

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];

    if (line.startsWith(TRACE_ERROR_PREFIX)) {
      return { ok: false, error: jsonString(line.slice(TRACE_ERROR_PREFIX.length)) };
    }

    if (line.startsWith(TRACE_PREFIX)) {
      const parsed = safeParse(line.slice(TRACE_PREFIX.length));
      if (!Array.isArray(parsed)) {
        return { ok: false, error: "the tracer's output could not be read" };
      }
      return { ok: true, trace: parsed };
    }
  }

  return { ok: false, error: "the tracer produced no output" };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function jsonString(text: string): string {
  const parsed = safeParse(text);
  return typeof parsed === "string" ? parsed : text.trim();
}

type TraceStep = {
  event?: unknown;
  exception_msg?: unknown;
  stack_to_render?: unknown;
};

export type TraceSummary = {
  steps: number;
  truncated: boolean;
  outcome: TraceOutcome;
  /** The tracer's own words for a limit or a syntax error, when it has them. */
  message?: string;
};

/**
 * What the trace says happened, in the vocabulary the panel speaks.
 *
 * A syntax error is a trace with nothing drawable in it — the program never
 * became a program — while a runtime exception is a full trace whose last
 * frames carry the failure. The distinction decides whether the frame renders
 * at all, so it is made here rather than in the component.
 */
export function summarizeTrace(trace: unknown[]): TraceSummary {
  const steps = trace.length;
  const entries = trace as TraceStep[];
  const last = entries[steps - 1];
  const lastEvent = last?.event;

  if (lastEvent === "instruction_limit_reached" || lastEvent === "step_limit") {
    return {
      steps,
      truncated: true,
      outcome: "step_limit",
      message: stringOrUndefined(last?.exception_msg),
    };
  }

  const drawable = entries.some(
    (entry) => Array.isArray(entry?.stack_to_render) && entry.stack_to_render.length > 0,
  );
  if (!drawable) {
    return {
      steps,
      truncated: false,
      outcome: "syntax_error",
      message: entries.map((entry) => stringOrUndefined(entry?.exception_msg)).find(Boolean),
    };
  }

  const failed = entries.some(
    (entry) => entry?.event === "exception" || entry?.event === "uncaught_exception",
  );

  return {
    steps,
    truncated: false,
    outcome: failed ? "exception" : "completed",
    message: failed
      ? entries
          .map((entry) => stringOrUndefined(entry?.exception_msg))
          .find(Boolean)
      : undefined,
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Why there is no trace, in terms the user can act on.
 *
 * The output-cap branch is the one that matters: the engine kills a job whose
 * stdout passes `PISTON_OUTPUT_MAX_SIZE`, and the driver's own budget normally
 * prevents that. When it happens anyway — one enormous step, a compose file
 * that was never recreated after the cap was raised, or a step floor that is
 * still too many bytes — the message names the size that actually came back,
 * because that is what distinguishes the two.
 */
export function explainTraceFailure(error: string, stage: Stage | undefined): string {
  const stderr = stage?.stderr ?? "";
  const message = stage?.message ?? "";
  const stdoutBytes = stage?.stdout?.length ?? 0;
  const status = stageStatus(stage);

  if (status === "TO") {
    return `The trace ran longer than its ${TRACE_LIMITS.runMs} ms budget, so it was stopped before the step limit.`;
  }

  const overflow =
    status === "OL" ||
    status === "EL" ||
    /stdout length exceeded/i.test(message) ||
    /Sandbox keeper/.test(stderr);

  if (overflow) {
    return (
      `The engine killed the trace at its ${stdoutBytes}-byte output cap. ` +
      `If PISTON_OUTPUT_MAX_SIZE was just raised, the piston service has to be ` +
      `recreated for it to take effect (pnpm piston:up); otherwise visualize a ` +
      `smaller case.`
    );
  }

  const engineSaid = stderr.trim() || message.trim();
  if (engineSaid) return engineSaid;
  return `Could not trace this case: ${error}.`;
}

/* -------------------------------------------------------------------------- */
/* The trace                                                                  */
/* -------------------------------------------------------------------------- */

export async function visualizeTrace(
  request: VisualizeRequest,
): Promise<VisualizeResponse> {
  if (request.source.trim() === "") {
    throw new VisualizerError("There is nothing to trace yet — the editor is empty.");
  }

  if (runnerKind() === "mock") {
    throw new VisualizerError(
      "The visualizer needs the real execution engine, and this app is running " +
        "the mock runner (PISTON_URL is unset). Start the engine with: pnpm piston:up",
    );
  }

  const problem = await getProblem(request.slug);
  if (!problem) {
    throw new VisualizerError(`Unknown problem: ${request.slug}`, 404);
  }

  // The public shape: visible cases and nothing else. A hidden case is not a
  // refused index here, it is an index that does not exist.
  const testcase = problem.testcases[request.testcaseIndex];
  if (!testcase) {
    throw new VisualizerError(
      `Case ${request.testcaseIndex + 1} is out of range: ${problem.slug} has ` +
        `${problem.testcases.length} visible case(s) to visualize.`,
    );
  }
  if (!testcase.args) {
    throw new VisualizerError(
      `Case ${request.testcaseIndex + 1} has no stored arguments, so there is ` +
        `nothing to call ${problem.signature.name} with.`,
      500,
    );
  }

  const program = buildTraceProgram({
    source: request.source,
    signature: problem.signature,
    args: testcase.args,
    maxSteps: TRACE_LIMITS.maxSteps,
    // The driver shortens the trace when its own payload is too big, and the
    // engine kills it when *its* buffer is too small. Leave the smaller of the
    // two as the budget, with a line's worth of slack.
    maxBytes: Math.min(TRACE_LIMITS.maxBytes, ENGINE_OUTPUT_LIMIT - 65_536),
    tracer: await readTracer(),
  });

  const outcome = await execute(
    {
      language: request.language,
      source: program.entry.content,
      fileName: program.entry.name,
      extraFiles: program.extraFiles,
      stdin: program.stdin,
      runMs: TRACE_LIMITS.runMs,
      compileMs: LIMITS.compileMs,
      memoryBytes: LIMITS.memoryBytes,
    },
    {
      timeoutMs: TRACE_DEADLINE_MS,
      concurrency: LIMITS.concurrency,
      queueLimit: LIMITS.queueLimit,
      // A trace is megabytes; the cache is for verdicts.
      cache: false,
    },
  );

  const stage = outcome.response.run;
  const parsed = parseDriverOutput(stage?.stdout ?? "");
  if (!parsed.ok) {
    throw new VisualizerError(explainTraceFailure(parsed.error, stage), 500);
  }

  // Outcome comes from the raw trace: a limit step or an error on the harness
  // call must survive even when those steps are not drawn.
  const summary = summarizeTrace(parsed.trace);
  const presented = presentTrace({
    source: request.source,
    sourceStartLine: program.sourceSpan.startLine,
    sourceEndLine: program.sourceSpan.endLine,
    trace: parsed.trace,
  });

  return {
    trace: presented.trace,
    code: presented.code,
    steps: presented.trace.length,
    truncated: summary.truncated,
    outcome: summary.outcome,
    ...(summary.message ? { message: summary.message } : {}),
    engine: {
      version: outcome.response.version,
      ...(stage && stage.cpu_time !== null
        ? { timeMs: Math.round(stage.cpu_time) }
        : {}),
    },
  };
}
