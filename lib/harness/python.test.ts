import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { encodeJsonArgs, type ArgValue } from "@/lib/harness/args";
import { splitHarnessOutput } from "@/lib/harness/compare";
import { buildPythonProgram } from "@/lib/harness/python";
import type { ProblemSignature } from "@/lib/problems";

const SIGNATURE: ProblemSignature = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" },
    { name: "target", kind: "int" },
  ],
  returns: "int[]",
};

const TWO_SUM = `class Solution:
    def twoSum(self, nums, target):
        return [0, 1]
`;

function runLocal(
  userSource: string,
  args: readonly ArgValue[],
  signature: ProblemSignature = SIGNATURE,
) {
  const { source } = buildPythonProgram(userSource, signature);
  return spawnSync("python3", ["-c", source], {
    encoding: "utf8",
    input: encodeJsonArgs(args),
    timeout: 5_000,
  });
}

describe("buildPythonProgram", () => {
  it("captures debug prints and emits the serialized return last", () => {
    const { source, fileName } = buildPythonProgram(TWO_SUM, SIGNATURE);

    assert.equal(fileName, "main");
    assert.match(source, /_debug_buf = io\.StringIO\(\)/);
    assert.match(source, /sys\.stdout = _debug_buf/);
    assert.match(source, /_runner_emit\(_debug_buf\.getvalue\(\), _encoded\)/);
    assert.match(source, /json\.dumps\(_result/);
    assert.match(source, /_args = json\.loads\(sys\.stdin\.read\(\)\)/);
    assert.match(source, /Solution\(\)\.twoSum\(\*_args\)/);
    assert.doesNotMatch(source, /splitlines/);
    assert.doesNotMatch(source, /partition/);
  });

  it("leaves the user's source unchanged between prelude and harness", () => {
    const { source } = buildPythonProgram(TWO_SUM, SIGNATURE);

    assert.ok(source.includes(TWO_SUM));
    assert.ok(source.indexOf(TWO_SUM) > source.indexOf("runner prelude"));
    assert.ok(source.indexOf("runner harness") > source.indexOf(TWO_SUM));
  });
});

describe("JSON-args harness", () => {
  it("calls the method with a JSON argument array", () => {
    const result = runLocal(TWO_SUM, [[2, 7, 11, 15], 9]);
    assert.equal(result.status, 0, result.stderr);
    const { debug, encoded } = splitHarnessOutput(result.stdout);
    assert.equal(debug, "");
    assert.equal(encoded, "[0,1]");
  });

  it("keeps debug prints off the comparison line", () => {
    const result = runLocal(
      `class Solution:
    def twoSum(self, nums, target):
        print("debugging")
        return [0, 1]
`,
      [[2, 7], 9],
    );
    assert.equal(result.status, 0, result.stderr);
    const { debug, encoded } = splitHarnessOutput(result.stdout);
    assert.equal(debug, "debugging");
    assert.equal(encoded, "[0,1]");
  });

  it("passes escaped strings and booleans without parsing display text", () => {
    const signature: ProblemSignature = {
      name: "echo",
      params: [
        { name: "s", kind: "string" },
        { name: "flag", kind: "bool" },
      ],
      returns: "string[]",
    };
    const result = runLocal(
      `class Solution:
    def echo(self, s, flag):
        return [s, str(flag)]
`,
      ['say "hi"\nnext', true],
      signature,
    );
    assert.equal(result.status, 0, result.stderr);
    const { encoded } = splitHarnessOutput(result.stdout);
    assert.equal(encoded, JSON.stringify(['say "hi"\nnext', "True"]));
  });

  it("treats an unserializable return as a harness failure, not a compared value", () => {
    const result = runLocal(
      `class Solution:
    def twoSum(self, nums, target):
        return {0, 1}
`,
      [[2, 7], 9],
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TypeError/);
    assert.match(result.stderr, /not JSON serializable/);
    assert.equal(result.stdout.trim(), "");
  });

  it("passes a matrix as nested JSON arrays", () => {
    const signature: ProblemSignature = {
      name: "dims",
      params: [{ name: "grid", kind: "int[][]" }],
      returns: "int",
    };
    const result = runLocal(
      `class Solution:
    def dims(self, grid):
        return len(grid) * len(grid[0])
`,
      [[[1, 2], [3, 4]]],
      signature,
    );
    assert.equal(result.status, 0, result.stderr);
    const { encoded } = splitHarnessOutput(result.stdout);
    assert.equal(encoded, "4");
  });
});
