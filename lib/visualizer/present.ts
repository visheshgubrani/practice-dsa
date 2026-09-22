import { PRELUDE_IMPORTS } from "@/lib/harness/python";

import { TRACE_ANNOTATION_NAMES } from "@/lib/visualizer/program";

/**
 * The picture, as opposed to the program that was traced.
 *
 * The tracer still runs the prelude, the editor buffer, and the call harness,
 * because a trace that rejected code the judge accepts would be worse than no
 * trace. None of that scaffolding belongs on screen. This module rewrites the
 * trace the frame is given:
 *
 *   - the code pane is the editor buffer, and step line numbers are shifted
 *     onto it
 *   - steps that execute only in the prelude or the harness are dropped
 *   - names those lines bind (`sys`, the annotation shim, `_args`, …) are
 *     removed from the global frame
 *
 * A method frame is left alone: `self`, `nums`, and anything the solution
 * binds are the picture. Heap objects stay in the JSON; the frame only draws
 * an object a visible name still points at, so the modules leave with the
 * names that referenced them.
 */

/** The bound name of one import clause: `json as j` binds `j`, `json` binds `json`. */
function namesBoundByImport(line: string): string[] {
  const imported = line.match(/^(?:from\s+\S+\s+)?import\s+(.+)$/)?.[1];
  if (!imported) return [];

  return imported.split(",").flatMap((part) => {
    const trimmed = part.trim().replace(/[()]/g, "");
    if (!trimmed) return [];
    const alias = trimmed.match(/\bas\s+([A-Za-z_]\w*)\s*$/);
    if (alias?.[1]) return [alias[1]];
    const name = trimmed.match(/([A-Za-z_]\w*)\s*$/);
    return name?.[1] ? [name[1]] : [];
  });
}

/**
 * Globals the picture must not list.
 *
 * Derived from the prelude's own import lines plus the shim and the two names
 * the harness binds, so a new import cannot appear in the Global frame without
 * being named here.
 */
export const HIDDEN_GLOBAL_NAMES: ReadonlySet<string> = new Set([
  ...PRELUDE_IMPORTS.flatMap(namesBoundByImport),
  ...TRACE_ANNOTATION_NAMES,
  "_ann",
  "cast",
  "_args",
  "_result",
]);

const EXCEPTION_EVENTS = new Set(["exception", "uncaught_exception"]);

export type PresentedTrace = {
  /** The editor buffer. This is the code pane. */
  code: string;
  /** Steps the frame can draw, with line numbers in `code`. */
  trace: unknown[];
};

export type PresentTraceInput = {
  /** The editor buffer, verbatim. */
  source: string;
  /** 1-based, inclusive, inside the program the tracer ran. */
  sourceStartLine: number;
  sourceEndLine: number;
  /** The tracer's own steps, unread except for line, event, and globals. */
  trace: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function lineOf(step: Record<string, unknown>): number | undefined {
  return typeof step.line === "number" && Number.isFinite(step.line) ? step.line : undefined;
}

function isException(step: Record<string, unknown>): boolean {
  return typeof step.event === "string" && EXCEPTION_EVENTS.has(step.event);
}

function stripHiddenGlobals(step: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...step };

  if (isRecord(step.globals)) {
    const globals: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(step.globals)) {
      if (!HIDDEN_GLOBAL_NAMES.has(name)) globals[name] = value;
    }
    next.globals = globals;
  }

  if (Array.isArray(step.ordered_globals)) {
    next.ordered_globals = step.ordered_globals.filter(
      (name): name is string => typeof name === "string" && !HIDDEN_GLOBAL_NAMES.has(name),
    );
  }

  return next;
}

/**
 * The trace the frame should draw.
 *
 * Steps outside the buffer are scaffolding and are dropped. A step with no
 * line (`instruction_limit_reached`) stays, because it is the reason the
 * picture stopped. If the only exception landed on the harness call — `Solution`
 * was never defined, for instance — that step stays too, pointed at the last
 * line of the buffer, so the error is still drawn.
 */
export function presentTrace(input: PresentTraceInput): PresentedTrace {
  const { source, sourceStartLine, sourceEndLine, trace } = input;
  const lastUserLine = Math.max(1, sourceEndLine - sourceStartLine + 1);

  const inSpan = (line: number) => line >= sourceStartLine && line <= sourceEndLine;

  const exceptionInBuffer = trace.some((entry) => {
    if (!isRecord(entry) || !isException(entry)) return false;
    const line = lineOf(entry);
    return line !== undefined && inSpan(line);
  });

  const presented: unknown[] = [];

  for (const entry of trace) {
    if (!isRecord(entry)) {
      presented.push(entry);
      continue;
    }

    const line = lineOf(entry);
    let shown: Record<string, unknown>;

    if (line === undefined) {
      shown = stripHiddenGlobals(entry);
    } else if (inSpan(line)) {
      shown = stripHiddenGlobals(entry);
      shown.line = line - sourceStartLine + 1;
    } else if (isException(entry) && !exceptionInBuffer) {
      shown = stripHiddenGlobals(entry);
      shown.line = lastUserLine;
    } else {
      continue;
    }

    presented.push(shown);
  }

  return { code: source, trace: presented };
}
