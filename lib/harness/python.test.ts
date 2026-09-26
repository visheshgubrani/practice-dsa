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

  it("round-trips encode and decode on two instances", () => {
    const signature: ProblemSignature = {
      name: "encode",
      params: [{ name: "strs", kind: "string[]" }],
      returns: "string[]",
      roundTrip: { encode: "encode", decode: "decode" },
    };
    const source = `class Solution:
    def __init__(self):
        self.seen = None
    def encode(self, strs):
        self.seen = strs
        return "".join(f"{len(s)}#{s}" for s in strs)
    def decode(self, s):
        if self.seen is not None:
            return ["stashed"]
        out = []
        i = 0
        while i < len(s):
            j = s.find("#", i)
            length = int(s[i:j])
            i = j + 1
            out.append(s[i:i + length])
            i += length
        return out
`;
    const { source: program } = buildPythonProgram(source, signature);
    assert.match(program, /_wire = Solution\(\)\.encode\(\*_args\)/);
    assert.match(program, /_result = Solution\(\)\.decode\(_wire\)/);
    assert.match(program, /encode must return a str/);

    const result = runLocal(source, [["Hello", "World"]], signature);
    assert.equal(result.status, 0, result.stderr);
    const { encoded } = splitHarnessOutput(result.stdout);
    assert.equal(encoded, JSON.stringify(["Hello", "World"]));
  });

  it("rejects an encode result that is not a string", () => {
    const signature: ProblemSignature = {
      name: "encode",
      params: [{ name: "strs", kind: "string[]" }],
      returns: "string[]",
      roundTrip: { encode: "encode", decode: "decode" },
    };
    const result = runLocal(
      `class Solution:
    def encode(self, strs):
        return strs
    def decode(self, s):
        return s
`,
      [["Hello"]],
      signature,
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TypeError/);
    assert.match(result.stderr, /encode must return a str/);
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

  it("runs a call script on one instance", () => {
    const signature: ProblemSignature = {
      name: "MinStack",
      params: [],
      returns: "void",
      calls: {
        className: "MinStack",
        constructorParams: [],
        methods: {
          push: { params: ["int"], returns: "void" },
          pop: { params: [], returns: "void" },
          top: { params: [], returns: "int" },
          getMin: { params: [], returns: "int" },
        },
      },
    };
    const source = `class MinStack:
    def __init__(self):
        self.values = []
        self.mins = []
    def push(self, val):
        self.values.append(val)
        if not self.mins or val <= self.mins[-1]:
            self.mins.append(val)
    def pop(self):
        if self.values.pop() == self.mins[-1]:
            self.mins.pop()
    def top(self):
        return self.values[-1]
    def getMin(self):
        return self.mins[-1]
`;
    const script = [
      ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"],
      [[], [-2], [0], [-3], [], [], [], []],
    ];
    const { source: program } = buildPythonProgram(source, signature);
    assert.match(program, /_obj = MinStack\(\*_argv\[0\]\)/);
    assert.match(program, /_name not in _spec/);
    assert.doesNotMatch(program, /Solution\(\)/);

    const result = runLocal(source, script, signature);
    assert.equal(result.status, 0, result.stderr);
    const { encoded } = splitHarnessOutput(result.stdout);
    assert.equal(encoded, "[null,null,null,null,-3,null,0,-2]");
  });

  it("records a wrong getMin after the minimum is popped", () => {
    const signature: ProblemSignature = {
      name: "MinStack",
      params: [],
      returns: "void",
      calls: {
        className: "MinStack",
        constructorParams: [],
        methods: {
          push: { params: ["int"], returns: "void" },
          pop: { params: [], returns: "void" },
          getMin: { params: [], returns: "int" },
        },
      },
    };
    const result = runLocal(
      `class MinStack:
    def __init__(self):
        self.values = []
    def push(self, val):
        self.values.append(val)
    def pop(self):
        self.values.pop()
    def getMin(self):
        return self.values[-1]
`,
      [
        ["MinStack", "push", "push", "pop", "getMin"],
        [[], [1], [0], [], []],
      ],
      signature,
    );
    assert.equal(result.status, 0, result.stderr);
    const { encoded } = splitHarnessOutput(result.stdout);
    assert.equal(encoded, "[null,null,null,null,1]");
  });

  it("rejects a call the signature does not allow", () => {
    const signature: ProblemSignature = {
      name: "MinStack",
      params: [],
      returns: "void",
      calls: {
        className: "MinStack",
        constructorParams: [],
        methods: {
          push: { params: ["int"], returns: "void" },
        },
      },
    };
    const result = runLocal(
      `class MinStack:
    def __init__(self):
        pass
    def push(self, val):
        pass
    def peek(self):
        return 1
`,
      [
        ["MinStack", "push", "peek"],
        [[], [1], []],
      ],
      signature,
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unknown method peek/);
  });
});
