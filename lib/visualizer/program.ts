import { encodeJsonArgs, type ArgValue } from "@/lib/harness/args";
import { PRELUDE_IMPORTS } from "@/lib/harness/python";
import type { ProblemSignature } from "@/lib/problems";

/**
 * The program the visualizer traces.
 *
 * It is the judging program with one line changed: `from typing import *`
 * becomes an inert annotation shim. That line is the whole reason this module
 * exists, and the reason is a measurement, not a preference —
 *
 *   - `from typing import *` binds ~100 names, and the tracer re-encodes every
 *     reachable global object at **every step**: 48 KB of trace per step, 29 MB
 *     for a 600-step loop, and ~3 s of tracing.
 *   - The same program with the shim below is **2 KB per step** (1.3 MB for 600
 *     steps, 0.27 s), because one inert object replaces ~337.
 *
 * The shim is semantically inert on purpose: these names are only ever read by
 * annotations, which the interpreter evaluates and then ignores. `cast` is the
 * one exception — it returns its value — so it is defined rather than shimmed.
 * Names the prelude already provides for real (Counter, defaultdict, deque,
 * OrderedDict) are deliberately absent: shadowing them would break user code.
 *
 * Everything else is exactly what judging runs: the same prelude imports, the
 * same `Solution().<name>(*_args)` call, the same JSON arguments. A trace that
 * rejected code the judge accepts would be worse than no trace at all, so
 * `lib/visualizer/program.test.ts` holds the two preludes in sync.
 */

/** The typing names the shim provides. Kept as data so a test can check coverage. */
export const TRACE_ANNOTATION_NAMES = [
  "List",
  "Dict",
  "Set",
  "FrozenSet",
  "Tuple",
  "Optional",
  "Union",
  "Any",
  "Callable",
  "Iterable",
  "Iterator",
  "Sequence",
  "Mapping",
  "MutableMapping",
  "Deque",
  "DefaultDict",
  "TypeVar",
  "Generic",
  "Literal",
  "Final",
] as const;

/**
 * One line, so the traced program's own line numbers stay close to the editor's.
 *
 * `_ann` is subscriptable (`List[int]`), callable (`TypeVar("T")`), and inert.
 */
export const TRACE_ANNOTATION_SHIM = [
  `_ann = type("_Ann", (), {"__getitem__": lambda self, item: self, `,
  `"__call__": lambda self, *a, **k: self})()`,
  `; ${TRACE_ANNOTATION_NAMES.join(" = ")} = _ann`,
  `; cast = lambda typ, value: value`,
].join("");

/** The judging prelude with the typing line swapped for the shim. */
export const TRACE_PRELUDE = [
  "# ---- runner prelude (added by the app; your code is below, unchanged) ----",
  PRELUDE_IMPORTS[0],
  TRACE_ANNOTATION_SHIM,
  PRELUDE_IMPORTS[1],
  "",
].join("\n");

/**
 * The driver that wraps the tracer.
 *
 * Sent as `main.py`, so it carries the extension its neighbours need: it
 * imports `pg_logger`, which imports `pg_encoder`. Piston runs the first file
 * of a job, and the traced program arrives on **stdin as data** — never
 * interpolated into this text, so a quote in a solution cannot break it.
 *
 * Two behaviours are deliberate:
 *
 *   - `MAX_EXECUTED_LINES` is set from the request. Python Tutor's own default
 *     is 1000 steps, which no browser and no engine buffer should carry for
 *     this app; the cap is a budget, and hitting it is reported, not hidden.
 *   - The trace is one line on stdout, and the engine kills a job that prints
 *     past its buffer. So the driver measures its own payload and re-traces
 *     with fewer steps rather than being killed. A trace is deterministic for a
 *     given program, so the retry produces the same prefix, and a solution with
 *     side effects is unaffected: it runs inside the tracer's captured stdout.
 */
export const TRACE_DRIVER = `# ---- visualizer driver (added by the app; the traced program is on stdin) ----
import json
import sys

import pg_logger

MIN_STEPS = 50


def _emit(prefix, payload):
    sys.stdout.write(prefix + " " + json.dumps(payload) + "\\n")


def _run():
    payload = json.loads(sys.stdin.read())
    script = payload["script"]
    budget = int(payload["maxBytes"])
    steps = int(payload["cap"])

    state = {}

    def finalize(executed_script, trace):
        state["trace"] = trace
        return trace

    while True:
        state.pop("trace", None)
        pg_logger.MAX_EXECUTED_LINES = steps
        try:
            trace = pg_logger.exec_script_str_local(
                script, None, False, False, finalize, None, True
            )
        except BaseException as error:
            _emit("TRACE_ERROR", "the tracer failed: %s: %s" % (type(error).__name__, error))
            return
        if trace is None:
            trace = state.get("trace")
        if not trace:
            _emit("TRACE_ERROR", "the tracer produced no steps")
            return
        encoded = json.dumps(trace)
        if len(encoded) <= budget or steps <= MIN_STEPS:
            break
        steps = max(MIN_STEPS, steps // 2)

    sys.stdout.write("TRACE " + encoded + "\\n")


_run()
`;

export const TRACE_ENTRY_FILE = "main.py";
export const TRACE_LOGGER_FILE = "pg_logger.py";
export const TRACE_ENCODER_FILE = "pg_encoder.py";

export type TraceFile = { name: string; content: string };

export type TraceProgram = {
  /** The file Piston runs. First in the job, and named `.py` so imports work. */
  entry: TraceFile;
  /** The vendored tracer, written beside the entry point. */
  extraFiles: TraceFile[];
  /** The driver's configuration, delivered as data. */
  stdin: string;
  /**
   * The full program the tracer ran: prelude, the editor buffer, then the call.
   * The frame does not display this. `sourceSpan` says which lines of it are
   * the buffer, and `presentTrace` shows only those.
   */
  displayCode: string;
  /**
   * Where the editor buffer sits inside `displayCode`, 1-based and inclusive.
   * Lines outside this span are the prelude and the call harness.
   */
  sourceSpan: { startLine: number; endLine: number };
};

export type TraceProgramInput = {
  /** The editor buffer, verbatim. */
  source: string;
  signature: ProblemSignature;
  /** One visible case's arguments, exactly as judging encodes them. */
  args: readonly ArgValue[];
  maxSteps: number;
  maxBytes: number;
  tracer: { logger: string; encoder: string };
};

/** Lines of `text`. A trailing newline ends the last line; it is not another one. */
function textLineCount(text: string): number {
  if (text.length === 0) return 0;
  const parts = text.split("\n");
  return text.endsWith("\n") ? parts.length - 1 : parts.length;
}

export function buildTraceProgram(input: TraceProgramInput): TraceProgram {
  const { source, signature, args, maxSteps, maxBytes, tracer } = input;

  // `json.loads` on a JSON *string literal* rather than inlined values: JSON's
  // true/false/null are not Python's, and this keeps one encoder for both paths.
  const argsLine = `_args = json.loads(${JSON.stringify(encodeJsonArgs(args))})`;
  const callLine =
    signature.returns === "void"
      ? `Solution().${signature.name}(*_args)`
      : `_result = Solution().${signature.name}(*_args)`;

  // The blank line before the call is load-bearing, exactly as it is in the
  // judging harness: a buffer that ends in an indented blank line would
  // otherwise attach the next line to the user's last block.
  const displayCode =
    TRACE_PRELUDE +
    source +
    (source.endsWith("\n") ? "" : "\n") +
    "\n" +
    argsLine +
    "\n" +
    callLine +
    "\n";

  const startLine = textLineCount(TRACE_PRELUDE) + 1;
  const endLine = startLine + textLineCount(source) - 1;

  return {
    entry: { name: TRACE_ENTRY_FILE, content: TRACE_DRIVER },
    extraFiles: [
      { name: TRACE_LOGGER_FILE, content: tracer.logger },
      { name: TRACE_ENCODER_FILE, content: tracer.encoder },
    ],
    stdin: JSON.stringify({ script: displayCode, cap: maxSteps, maxBytes }),
    displayCode,
    sourceSpan: { startLine, endLine },
  };
}
