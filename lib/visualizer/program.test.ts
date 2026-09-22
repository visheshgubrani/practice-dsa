import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodeJsonArgs } from "@/lib/harness/args";
import { PRELUDE_IMPORTS, PYTHON_PRELUDE } from "@/lib/harness/python";
import { PROBLEMS } from "@/lib/problems/catalog";
import type { ProblemSignature } from "@/lib/problems";
import {
  buildTraceProgram,
  TRACE_ANNOTATION_NAMES,
  TRACE_ANNOTATION_SHIM,
  TRACE_ENCODER_FILE,
  TRACE_ENTRY_FILE,
  TRACE_LOGGER_FILE,
  TRACE_PRELUDE,
} from "@/lib/visualizer/program";

/**
 * The trace program is the judging program with one line changed, and these
 * tests are what "with one line changed" means in practice. The line is the
 * expensive one: `from typing import *` binds ~100 names, and the tracer
 * re-encodes every reachable global at every step — 48 KB per step against
 * 2 KB. So the shim has to stay, and it has to stay *complete*.
 */

const SIGNATURE: ProblemSignature = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" },
    { name: "target", kind: "int" },
  ],
  returns: "int[]",
};

const ARGS = [[2, 7, 11, 15], 9];

function program(source = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n") {
  return buildTraceProgram({
    source,
    signature: SIGNATURE,
    args: ARGS,
    maxSteps: 500,
    maxBytes: 3_500_000,
    tracer: { logger: "# logger\n", encoder: "# encoder\n" },
  });
}

describe("the trace prelude", () => {
  const judging = PYTHON_PRELUDE.split("\n");
  const tracing = TRACE_PRELUDE.split("\n");

  it("is the judging prelude with exactly one line replaced", () => {
    assert.equal(judging.length, tracing.length);

    const differing = judging
      .map((line, index) => (line === tracing[index] ? -1 : index))
      .filter((index) => index !== -1);

    assert.deepEqual(differing, [2]);
    assert.equal(judging[2], "from typing import *");
    assert.equal(tracing[2], TRACE_ANNOTATION_SHIM);
  });

  it("keeps both module import lines verbatim", () => {
    assert.ok(tracing.includes(PRELUDE_IMPORTS[0]));
    assert.ok(tracing.includes(PRELUDE_IMPORTS[1]));
  });

  it("never shadows a name the prelude provides for real", () => {
    // `from collections import ...` binds Counter, defaultdict, deque and
    // OrderedDict. Shiming `Counter` would turn a working `Counter(nums)` into
    // a call on an inert annotation object.
    const provided = ["Counter", "defaultdict", "deque", "OrderedDict"];
    for (const name of provided) {
      assert.ok(
        !(TRACE_ANNOTATION_NAMES as readonly string[]).includes(name),
        `${name} must not be shimmed`,
      );
    }
  });

  it("provides every annotation name a starter uses", () => {
    // A starter that names a type the trace prelude does not define would
    // visualize as a NameError while Run accepted the same buffer.
    const used = new Set<string>();
    const subscript = /(?<![.\w])([A-Z][A-Za-z0-9_]*)\[/g;

    for (const problem of PROBLEMS) {
      const source = problem.starterCode.python;
      for (const match of source.matchAll(subscript)) {
        const name = match[1];
        if (name) used.add(name);
      }
    }

    assert.ok(used.size > 0, "no starter uses a subscripted annotation?");
    for (const name of used) {
      assert.ok(
        (TRACE_ANNOTATION_NAMES as readonly string[]).includes(name),
        `${name} is used by a starter but not shimmed`,
      );
    }
  });
});

describe("buildTraceProgram", () => {
  it("sends the driver first, then the vendored tracer beside it", () => {
    const built = program();

    assert.equal(built.entry.name, TRACE_ENTRY_FILE);
    assert.equal(built.entry.name, "main.py");
    assert.deepEqual(
      built.extraFiles.map((file) => file.name),
      [TRACE_LOGGER_FILE, TRACE_ENCODER_FILE],
    );
    // Piston writes exactly the names it is given, and the driver imports both
    // by name, so the extensions are load-bearing.
    assert.ok(built.extraFiles.every((file) => file.name.endsWith(".py")));
  });

  it("traces exactly the program it sends the tracer", () => {
    const built = program();
    const stdin = JSON.parse(built.stdin) as { script: string; cap: number; maxBytes: number };

    assert.equal(stdin.script, built.displayCode);
    assert.equal(stdin.cap, 500);
    assert.equal(stdin.maxBytes, 3_500_000);
    assert.ok(built.displayCode.startsWith(TRACE_PRELUDE));
  });

  it("records where the editor buffer sits inside the traced program", () => {
    const source = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n";
    const built = program(source);
    const lines = built.displayCode.split("\n");
    const { startLine, endLine } = built.sourceSpan;

    assert.equal(lines.slice(startLine - 1, endLine).join("\n") + "\n", source);
    assert.equal(lines[endLine], "");
    assert.match(lines[endLine + 1] ?? "", /^_args = /);

    const bare = program("class Solution:\n    pass");
    const bareLines = bare.displayCode.split("\n");
    assert.equal(
      bareLines.slice(bare.sourceSpan.startLine - 1, bare.sourceSpan.endLine).join("\n"),
      "class Solution:\n    pass",
    );
    assert.equal(bareLines[bare.sourceSpan.endLine], "");
  });

  it("calls the signature with the case's own arguments", () => {
    const built = program();

    assert.ok(built.displayCode.includes("class Solution:"));
    assert.ok(
      built.displayCode.includes(`_args = json.loads(${JSON.stringify(encodeJsonArgs(ARGS))})`),
    );
    assert.ok(built.displayCode.includes("_result = Solution().twoSum(*_args)"));
    // JSON's true/false/null are not Python's, which is why they arrive as a
    // string literal that `json.loads` reads rather than as inline values.
    const nulls = program("class Solution:\n    def twoSum(self, nums, target):\n        return None\n");
    assert.ok(nulls.displayCode.includes("json.loads("));
  });

  it("survives a buffer that ends in an indented blank line", () => {
    const opened = program("class Solution:\n    def twoSum(self, nums, target):\n        \n");
    const lines = opened.displayCode.trimEnd().split("\n");
    const argsLine = lines.findIndex((line) => line.startsWith("_args = "));

    assert.ok(argsLine > 0);
    assert.equal(lines[argsLine - 1], "");
  });

  it("omits a result binding for a void signature", () => {
    const built = buildTraceProgram({
      source: "class Solution:\n    def fill(self, grid):\n        pass\n",
      signature: {
        name: "fill",
        params: [{ name: "grid", kind: "int[][]" }],
        returns: "void",
      },
      args: [[[1, 2]]],
      maxSteps: 100,
      maxBytes: 1_000,
      tracer: { logger: "", encoder: "" },
    });

    assert.ok(built.displayCode.includes("Solution().fill(*_args)"));
    assert.ok(!built.displayCode.includes("_result = Solution()"));
  });
});
