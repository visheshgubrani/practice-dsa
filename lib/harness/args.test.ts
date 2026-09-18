import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  argumentsFromDisplayStdin,
  describeKindMismatch,
  encodeJsonArgs,
  formatArguments,
  formatSampleInput,
  jsonHarnessInput,
  matchesKind,
  parseArguments,
} from "@/lib/harness/args";
import type { ProblemSignature } from "@/lib/problems";

const TWO_SUM: ProblemSignature = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" },
    { name: "target", kind: "int" },
  ],
  returns: "int[]",
};

describe("formatArguments", () => {
  it("renders one name = json line per parameter", () => {
    assert.equal(
      formatArguments([[2, 7, 11, 15], 9], TWO_SUM),
      "nums = [2,7,11,15]\ntarget = 9",
    );
  });

  it("round-trips through parseArguments", () => {
    const args = [[3, 2, 4], 6];
    const parsed = parseArguments(formatArguments(args, TWO_SUM), TWO_SUM);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.values, [[3, 2, 4], 6]);
  });
});

describe("formatSampleInput", () => {
  it("joins the same fragments with commas", () => {
    assert.equal(
      formatSampleInput([[2, 7, 11, 15], 9], TWO_SUM),
      "nums = [2,7,11,15], target = 9",
    );
  });
});

describe("encodeJsonArgs", () => {
  it("serializes a JSON array for the harness", () => {
    assert.equal(encodeJsonArgs([[2, 7, 11, 15], 9]), "[[2,7,11,15],9]");
  });

  it("recovers that array from display stdin", () => {
    const result = jsonHarnessInput(
      "nums = [2,7,11,15]\ntarget = 9",
      TWO_SUM,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.encoded, "[[2,7,11,15],9]");
  });
});

describe("matchesKind", () => {
  it("accepts booleans only as bool", () => {
    assert.equal(matchesKind(true, "bool"), true);
    assert.equal(matchesKind(false, "bool"), true);
    assert.equal(matchesKind(true, "int"), false);
    assert.equal(matchesKind(0, "bool"), false);
  });

  it("rejects a boolean where an int is required", () => {
    assert.equal(matchesKind(true, "int"), false);
    assert.equal(matchesKind([1, true], "int[]"), false);
  });

  it("rejects non-finite numbers and out-of-range ints", () => {
    assert.equal(matchesKind(Number.NaN, "double"), false);
    assert.equal(matchesKind(Number.POSITIVE_INFINITY, "int"), false);
    assert.equal(matchesKind(3_000_000_000, "int"), false);
    assert.equal(matchesKind(3_000_000_000, "long"), true);
  });

  it("checks nested arrays recursively", () => {
    assert.equal(matchesKind([["a"], ["b", "c"]], "string[][]"), true);
    assert.equal(matchesKind([["a"], [1]], "string[][]"), false);
    assert.equal(matchesKind([[1, 2], [3]], "int[][]"), true);
  });

  it("names invalid nested types with a path", () => {
    assert.deepEqual(describeKindMismatch([[1, true], [3]], "int[][]", "grid"), [
      "grid[0][1] = true is not int",
    ]);
    assert.deepEqual(describeKindMismatch(["ok", 1], "string[]", "strs"), [
      "strs[1] = 1 is not string",
    ]);
  });
});

describe("escaped strings, matrices, and booleans", () => {
  const echo: ProblemSignature = {
    name: "echo",
    params: [
      { name: "s", kind: "string" },
      { name: "flag", kind: "bool" },
    ],
    returns: "string[]",
  };
  const matrix: ProblemSignature = {
    name: "dims",
    params: [{ name: "grid", kind: "int[][]" }],
    returns: "int",
  };

  it("round-trips escaped strings and booleans without parsing display text on encode", () => {
    const args = ['say "hi"\nnext', true] as const;
    const displayed = formatArguments(args, echo);
    assert.equal(displayed, 's = "say \\"hi\\"\\nnext"\nflag = true');
    const parsed = parseArguments(displayed, echo);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.values, [...args]);
    assert.equal(encodeJsonArgs(args), JSON.stringify([...args]));
  });

  it("round-trips a matrix as nested JSON arrays", () => {
    const args = [[[1, 2], [3, 4]]];
    const displayed = formatArguments(args, matrix);
    assert.equal(displayed, "grid = [[1,2],[3,4]]");
    const parsed = parseArguments(displayed, matrix);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.values, [[[1, 2], [3, 4]]]);
    assert.equal(encodeJsonArgs(args), "[[[1,2],[3,4]]]");
  });
});

describe("argumentsFromDisplayStdin", () => {
  it("recovers the argument list from stored display stdin", () => {
    const result = argumentsFromDisplayStdin(
      "nums = [2,7,11,15]\ntarget = 9",
      TWO_SUM,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.values, [[2, 7, 11, 15], 9]);
  });

  it("names the parse error so a bad row can be fixed", () => {
    const result = argumentsFromDisplayStdin("not an argument list", TWO_SUM);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /not "name = value"/);
    }
  });

  it("rejects a value that does not match the signature kind", () => {
    const result = argumentsFromDisplayStdin(
      "nums = [2,true]\ntarget = 9",
      TWO_SUM,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /nums\[1\] = true is not int/);
  });
});
