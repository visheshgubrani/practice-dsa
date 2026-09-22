import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { TRACE_LIMITS } from "@/lib/piston/config";
import type { Stage } from "@/lib/piston/types";
import { VisualizerError } from "@/lib/visualizer/errors";
import {
  explainTraceFailure,
  parseDriverOutput,
  readTracer,
  summarizeTrace,
} from "@/lib/visualizer/trace";

/**
 * The visualizer's reading of what the tracer said.
 *
 * These are the pure parts of the path: the driver's last line, the summary the
 * panel renders, and the explanation shown when there is no trace at all. The
 * engine and the database are not involved — `pnpm visualizer:check` is what
 * exercises those against the real thing.
 */

function stage(overrides: Partial<Stage> = {}): Stage {
  return {
    stdout: "",
    stderr: "",
    output: "",
    code: 0,
    signal: null,
    message: null,
    status: null,
    cpu_time: null,
    wall_time: null,
    memory: null,
    ...overrides,
  };
}

/** A step as Python Tutor's tracer writes it, reduced to what we read. */
function step(overrides: Record<string, unknown> = {}) {
  return {
    line: 3,
    event: "step_line",
    func_name: "twoSum",
    stack_to_render: [{ frame_id: 1, func_name: "twoSum" }],
    heap: {},
    globals: {},
    ordered_globals: [],
    stdout: "",
    ...overrides,
  };
}

describe("parseDriverOutput", () => {
  it("reads the trace from the driver's prefixed line", () => {
    const parsed = parseDriverOutput('TRACE [{"line": 2}]\n');
    assert.equal(parsed.ok, true);
    assert.ok(parsed.ok && parsed.trace.length === 1);
  });

  it("finds the payload after anything the program printed", () => {
    const parsed = parseDriverOutput('hello from print()\nTRACE [{"line": 1}]\n');
    assert.equal(parsed.ok, true);
  });

  it("reports the driver's own error rather than guessing", () => {
    const parsed = parseDriverOutput('TRACE_ERROR "the tracer failed: Boom: x"\n');
    assert.equal(parsed.ok, false);
    assert.ok(!parsed.ok && parsed.error.includes("Boom"));
  });

  it("refuses an unreadable payload", () => {
    const parsed = parseDriverOutput("TRACE not-json\n");
    assert.equal(parsed.ok, false);
    assert.ok(!parsed.ok && parsed.error.includes("could not be read"));
  });

  it("says so when the driver never spoke", () => {
    const parsed = parseDriverOutput("");
    assert.equal(parsed.ok, false);
    assert.ok(!parsed.ok && parsed.error.includes("no output"));
  });
});

describe("summarizeTrace", () => {
  it("calls a finished program completed", () => {
    const summary = summarizeTrace([step(), step({ event: "return" })]);
    assert.equal(summary.outcome, "completed");
    assert.equal(summary.steps, 2);
    assert.equal(summary.truncated, false);
    assert.equal(summary.message, undefined);
  });

  it("calls a runtime exception an exception, and keeps its words", () => {
    const summary = summarizeTrace([
      step(),
      step({ event: "exception", exception_msg: "ZeroDivisionError: division by zero" }),
    ]);
    assert.equal(summary.outcome, "exception");
    assert.equal(summary.truncated, false);
    assert.equal(summary.message, "ZeroDivisionError: division by zero");
  });

  it("treats a trace with nothing drawable as a syntax error", () => {
    const summary = summarizeTrace([
      {
        event: "uncaught_exception",
        line: 3,
        offset: 22,
        exception_msg: "SyntaxError: expected ':'",
      },
    ]);
    assert.equal(summary.outcome, "syntax_error");
    assert.equal(summary.message, "SyntaxError: expected ':'");
  });

  it("reports the step limit as truncation, not as a result", () => {
    const summary = summarizeTrace([
      step(),
      { event: "instruction_limit_reached", exception_msg: "Instruction limit of 500 exceeded" },
    ]);
    assert.equal(summary.outcome, "step_limit");
    assert.equal(summary.truncated, true);
    assert.equal(summary.steps, 2);
    assert.equal(summary.message, "Instruction limit of 500 exceeded");
  });
});

describe("explainTraceFailure", () => {
  it("names the byte cap, the size that came back, and the restart", () => {
    const message = explainTraceFailure(
      "the tracer produced no output",
      stage({
        stdout: "x".repeat(65_536),
        stderr: "Sandbox keeper received fatal signal 6\n",
        code: null,
        signal: "SIGKILL",
        status: "OL",
        message: "stdout length exceeded",
      }),
    );

    assert.match(message, /65536-byte output cap/);
    assert.match(message, /pnpm piston:up/);
  });

  it("distinguishes a timeout from an output cap", () => {
    const message = explainTraceFailure(
      "the tracer produced no output",
      stage({ code: null, signal: "SIGKILL", status: "TO" }),
    );

    assert.match(message, new RegExp(String(TRACE_LIMITS.runMs)));
    assert.match(message, /budget/);
    assert.doesNotMatch(message, /output cap/);
  });

  it("prefers the engine's own stderr when it has some", () => {
    const message = explainTraceFailure(
      "the tracer produced no output",
      stage({ code: 1, stderr: "ModuleNotFoundError: No module named 'pg_logger'\n" }),
    );

    assert.match(message, /pg_logger/);
  });
});

describe("the vendored tracer", () => {
  it("is readable from the repository, with both files present", async () => {
    const tracer = await readTracer();

    assert.match(tracer.logger, /MAX_EXECUTED_LINES/);
    assert.match(tracer.encoder, /class PGEncoder|def encode/);
  });
});

describe("visualizeTrace refusals before any lookup", () => {
  it("refuses an empty buffer", async () => {
    const { visualizeTrace } = await import("@/lib/visualizer/trace");

    await assert.rejects(
      () =>
        visualizeTrace({
          slug: "two-sum",
          language: "python",
          source: "   \n",
          testcaseIndex: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof VisualizerError);
        assert.match(error.message, /nothing to trace/);
        return true;
      },
    );
  });

  it("refuses to draw a picture the mock runner never executed", async () => {
    const previous = process.env.RUNNER_KIND;
    process.env.RUNNER_KIND = "mock";
    try {
      const { visualizeTrace } = await import("@/lib/visualizer/trace");

      await assert.rejects(
        () =>
          visualizeTrace({
            slug: "two-sum",
            language: "python",
            source: "class Solution:\n    pass\n",
            testcaseIndex: 0,
          }),
        (error: unknown) => {
          assert.ok(error instanceof VisualizerError);
          assert.match(error.message, /real execution engine/);
          assert.match(error.message, /piston:up/);
          return true;
        },
      );
    } finally {
      if (previous === undefined) delete process.env.RUNNER_KIND;
      else process.env.RUNNER_KIND = previous;
    }
  });
});

describe("the visualizer never writes", () => {
  it("imports no submissions, practice, or progress module", () => {
    // The strongest form of "visualizing is not submitting" available without a
    // database: the route's whole server path cannot reach a write.
    for (const file of ["./trace.ts", "./program.ts", "./types.ts", "./errors.ts"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.doesNotMatch(source, /queries\/(submissions|practice)/);
      assert.doesNotMatch(source, /persistRunResult|problem_progress/);
    }
  });
});
