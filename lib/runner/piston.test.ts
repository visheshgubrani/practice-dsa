import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JudgingProblem } from "@/lib/problems/authoring";
import { InvalidRunRequestError } from "@/lib/runner/errors";
import { runWithPiston } from "@/lib/runner/piston";
import type { RunRequest } from "@/lib/runner/types";

const PROBLEM: JudgingProblem = {
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  testcases: [
    {
      args: [[2, 7, 11, 15], 9],
      expected: "[0,1]",
      hidden: false,
    },
    {
      args: [[3, 2, 4], 6],
      expected: "[1,2]",
      hidden: false,
    },
  ],
  starterCode: { python: "class Solution:\n    pass\n" },
  signature: {
    name: "twoSum",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int[]",
  },
  compare: "exact",
};

function request(extras: Partial<RunRequest> = {}): RunRequest {
  return {
    slug: PROBLEM.slug,
    language: "python",
    source: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n",
    mode: "submit",
    ...extras,
  };
}

describe("runWithPiston judging data", () => {
  it("returns internal_error for an empty suite, never accepted", async () => {
    const result = await runWithPiston(request(), {
      ...PROBLEM,
      testcases: [],
    });

    assert.equal(result.runner, "piston");
    assert.equal(result.verdict, "internal_error");
    assert.equal(result.cases.length, 0);
  });

  it("returns internal_error when a case has no expected value", async () => {
    const result = await runWithPiston(request(), {
      ...PROBLEM,
      testcases: [{ args: [[1, 2], 3], expected: "", hidden: false }],
    });

    assert.equal(result.verdict, "internal_error");
    assert.match(result.compileOutput ?? "", /no expected value/);
  });

  it("rejects an out-of-range Run index instead of clamping", async () => {
    await assert.rejects(
      () =>
        runWithPiston(request({ mode: "run", testcaseIndex: 9 }), PROBLEM),
      InvalidRunRequestError,
    );
  });
});
