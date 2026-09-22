import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRELUDE_IMPORTS } from "@/lib/harness/python";
import { buildTraceProgram, TRACE_ANNOTATION_NAMES } from "@/lib/visualizer/program";
import { HIDDEN_GLOBAL_NAMES, presentTrace } from "@/lib/visualizer/present";
import type { ProblemSignature } from "@/lib/problems";

/**
 * What the frame is allowed to draw.
 *
 * The tracer runs the prelude and the call. These tests are the promise that
 * neither shows up: line numbers land in the editor buffer, prelude globals
 * are gone, and a method frame is left as the tracer wrote it.
 */

const SIGNATURE: ProblemSignature = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" },
    { name: "target", kind: "int" },
  ],
  returns: "int[]",
};

const SOURCE = "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        return [0, 1]\n";

function span() {
  const built = buildTraceProgram({
    source: SOURCE,
    signature: SIGNATURE,
    args: [[2, 7], 9],
    maxSteps: 50,
    maxBytes: 1_000,
    tracer: { logger: "", encoder: "" },
  });
  return built.sourceSpan;
}

function step(overrides: Record<string, unknown> = {}) {
  return {
    line: 1,
    event: "step_line",
    func_name: "<module>",
    stack_to_render: [],
    heap: { "1": ["IMPORTED_FAUX_PRIMITIVE", "imported module"] },
    globals: {
      sys: ["REF", 1],
      json: ["REF", 1],
      _ann: ["REF", 1],
      List: ["REF", 1],
      cast: ["REF", 1],
      Counter: ["REF", 1],
      Solution: ["REF", 2],
      _args: ["REF", 3],
      _result: ["REF", 4],
    },
    ordered_globals: [
      "sys",
      "json",
      "_ann",
      "List",
      "cast",
      "Counter",
      "Solution",
      "_args",
      "_result",
    ],
    stdout: "",
    ...overrides,
  };
}

describe("presentTrace", () => {
  it("shows the editor buffer and shifts user lines onto it", () => {
    const { startLine, endLine } = span();
    const method = {
      frame_id: 1,
      func_name: "twoSum",
      encoded_locals: { self: ["REF", 2], nums: [1, 2], seen: ["REF", 5] },
      ordered_varnames: ["self", "nums", "seen"],
    };
    const trace = [
      step({ line: 1, event: "step_line" }),
      step({ line: startLine, event: "step_line", func_name: "<module>" }),
      step({
        line: startLine + 2,
        event: "step_line",
        func_name: "twoSum",
        stack_to_render: [method],
      }),
      step({ line: endLine + 2, event: "step_line", func_name: "<module>" }),
    ];

    const presented = presentTrace({
      source: SOURCE,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      trace,
    });

    assert.equal(presented.code, SOURCE);
    assert.equal(presented.trace.length, 2);
    assert.equal((presented.trace[0] as { line: number }).line, 1);
    assert.equal((presented.trace[1] as { line: number }).line, 3);
    assert.deepEqual(
      (presented.trace[1] as { stack_to_render: unknown }).stack_to_render,
      [method],
    );
    // The tracer's own step is not rewritten in place.
    assert.equal(trace[1]?.line, startLine);
    assert.ok(trace[1]?.ordered_globals.includes("sys"));
  });

  it("drops prelude and harness names from the global frame", () => {
    const { startLine, endLine } = span();
    const presented = presentTrace({
      source: SOURCE,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      trace: [step({ line: startLine })],
    });

    const drawn = presented.trace[0] as {
      globals: Record<string, unknown>;
      ordered_globals: string[];
    };
    assert.deepEqual(drawn.ordered_globals, ["Solution"]);
    assert.deepEqual(Object.keys(drawn.globals), ["Solution"]);
    assert.equal("sys" in drawn.globals, false);
    assert.equal("_args" in drawn.globals, false);
  });

  it("hides every name the prelude and the harness bind", () => {
    for (const line of PRELUDE_IMPORTS) {
      const body = line.replace(/^from\s+\S+\s+import\s+/, "").replace(/^import\s+/, "");
      for (const name of body.split(",").map((part) => part.trim())) {
        assert.ok(HIDDEN_GLOBAL_NAMES.has(name), `${name} is bound by the prelude`);
      }
    }
    for (const name of TRACE_ANNOTATION_NAMES) {
      assert.ok(HIDDEN_GLOBAL_NAMES.has(name));
    }
    for (const name of ["_ann", "cast", "_args", "_result"]) {
      assert.ok(HIDDEN_GLOBAL_NAMES.has(name));
    }
    assert.equal(HIDDEN_GLOBAL_NAMES.has("Solution"), false);
  });

  it("keeps a harness-only exception on the last line of the buffer", () => {
    const { startLine, endLine } = span();
    const presented = presentTrace({
      source: SOURCE,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      trace: [
        step({ line: 2, event: "step_line" }),
        step({
          line: endLine + 3,
          event: "uncaught_exception",
          exception_msg: "NameError: name 'Solution' is not defined",
          stack_to_render: [],
        }),
      ],
    });

    assert.equal(presented.trace.length, 1);
    const kept = presented.trace[0] as { line: number; exception_msg: string };
    assert.equal(kept.line, endLine - startLine + 1);
    assert.match(kept.exception_msg, /Solution/);
  });

  it("drops a harness exception once the buffer already recorded one", () => {
    const { startLine, endLine } = span();
    const presented = presentTrace({
      source: SOURCE,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      trace: [
        step({
          line: startLine + 1,
          event: "exception",
          exception_msg: "TypeError: bad",
        }),
        step({
          line: endLine + 3,
          event: "uncaught_exception",
          exception_msg: "TypeError: bad",
        }),
      ],
    });

    assert.equal(presented.trace.length, 1);
    assert.equal((presented.trace[0] as { line: number }).line, 2);
    assert.equal((presented.trace[0] as { event: string }).event, "exception");
  });

  it("keeps a step limit that has no line", () => {
    const { startLine, endLine } = span();
    const presented = presentTrace({
      source: SOURCE,
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      trace: [
        step({ line: startLine }),
        { event: "instruction_limit_reached", exception_msg: "Stopped after 500 steps" },
      ],
    });

    assert.equal(presented.trace.length, 2);
    assert.equal("line" in (presented.trace[1] as object), false);
    assert.equal(
      (presented.trace[1] as { event: string }).event,
      "instruction_limit_reached",
    );
  });
});
