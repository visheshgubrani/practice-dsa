import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JudgingProblem } from "@/lib/problems/authoring";
import { InvalidRunRequestError } from "@/lib/runner/errors";
import { runWithMock } from "@/lib/runner/mock";
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
  starterCode: {
    python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
  },
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

const WITH_HIDDEN: JudgingProblem = {
  ...PROBLEM,
  testcases: [
    ...PROBLEM.testcases,
    {
      args: [[3, 3], 6],
      expected: "[0,1]",
      hidden: true,
    },
    {
      args: [[1, 2, 3], 5],
      expected: "[1,2]",
      hidden: true,
    },
  ],
};

function request(source: string, extras: Partial<RunRequest> = {}): RunRequest {
  return {
    slug: PROBLEM.slug,
    language: "python",
    source,
    mode: "submit",
    ...extras,
  };
}

const IMPLEMENTED = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return [0, 1]
`;

describe("runWithMock", () => {
  it("accepts an implemented solution", () => {
    const result = runWithMock(request(IMPLEMENTED), PROBLEM);

    assert.equal(result.runner, "mock");
    assert.equal(result.verdict, "accepted");
    assert.equal(result.passedCount, 2);
    assert.equal(result.totalCount, 2);
  });

  it("maps force:wrong-answer", () => {
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:wrong-answer\n`),
      PROBLEM,
    );

    assert.equal(result.verdict, "wrong_answer");
  });

  it("maps an unmodified starter to a compile error", () => {
    const result = runWithMock(
      request(PROBLEM.starterCode.python),
      PROBLEM,
    );

    assert.equal(result.verdict, "compile_error");
  });

  it("maps empty source to a compile error", () => {
    const result = runWithMock(request("   \n"), PROBLEM);

    assert.equal(result.verdict, "compile_error");
  });

  it("maps force:runtime-error", () => {
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:runtime-error\n`),
      PROBLEM,
    );

    assert.equal(result.verdict, "runtime_error");
  });

  it("maps force:tle", () => {
    const result = runWithMock(request(`${IMPLEMENTED}\n# force:tle\n`), PROBLEM);

    assert.equal(result.verdict, "time_limit_exceeded");
  });

  it("maps force:output-limit to a runtime error", () => {
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:output-limit\n`),
      PROBLEM,
    );

    assert.equal(result.verdict, "runtime_error");
    assert.match(result.cases[0]?.stderr ?? "", /output limit/);
  });

  it("returns internal_error for an empty suite, never accepted", () => {
    const result = runWithMock(request(IMPLEMENTED), {
      ...PROBLEM,
      testcases: [],
    });

    assert.equal(result.verdict, "internal_error");
    assert.notEqual(result.verdict, "accepted");
  });

  it("rejects an out-of-range Run index instead of clamping", () => {
    assert.throws(
      () =>
        runWithMock(
          request(IMPLEMENTED, { mode: "run", testcaseIndex: 9 }),
          PROBLEM,
        ),
      InvalidRunRequestError,
    );
  });

  it("redacts hidden successes and counts the whole suite", () => {
    const result = runWithMock(request(IMPLEMENTED), WITH_HIDDEN);

    assert.equal(result.verdict, "accepted");
    assert.equal(result.passedCount, 4);
    assert.equal(result.totalCount, 4);
    assert.equal(result.cases.length, 4);

    const visible = result.cases.filter((entry) => !entry.hidden);
    const hidden = result.cases.filter((entry) => entry.hidden);
    assert.equal(visible.length, 2);
    assert.equal(hidden.length, 2);
    for (const entry of visible) {
      assert.ok(entry.input);
      assert.ok(entry.expected);
    }
    for (const entry of hidden) {
      assert.equal(entry.status, "accepted");
      assert.equal(entry.input, undefined);
      assert.equal(entry.expected, undefined);
      assert.equal(entry.stdout, undefined);
      assert.equal(entry.debug, undefined);
      assert.equal(entry.stderr, undefined);
      assert.ok(entry.timeMs !== undefined);
    }
  });

  it("stops at the first failure and still reports the full suite size", () => {
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:wrong-answer\n`),
      WITH_HIDDEN,
    );

    assert.equal(result.verdict, "wrong_answer");
    assert.equal(result.totalCount, 4);
    assert.equal(result.cases.length, 2);
    assert.equal(result.passedCount, 1);
    assert.equal(result.cases[1]?.status, "wrong_answer");
    assert.equal(result.cases[1]?.hidden, false);
    assert.ok(result.cases[1]?.input);
    assert.ok(result.cases[1]?.expected);
  });

  it("reports Submit cases visible-first even when the catalog interleaves them", () => {
    const interleaved: JudgingProblem = {
      ...PROBLEM,
      testcases: [
        { args: [[2, 7], 9], expected: "[0,1]", hidden: false },
        { args: [[1, 2, 3], 5], expected: "[1,2]", hidden: true },
        { args: [[3, 2, 4], 6], expected: "[1,2]", hidden: false },
        { args: [[3, 3], 6], expected: "[0,1]", hidden: true },
      ],
    };
    const result = runWithMock(request(IMPLEMENTED), interleaved);

    assert.equal(result.totalCount, 4);
    assert.deepEqual(
      result.cases.map((entry) => ({ index: entry.index, hidden: entry.hidden })),
      [
        { index: 0, hidden: false },
        { index: 1, hidden: false },
        { index: 0, hidden: true },
        { index: 1, hidden: true },
      ],
    );
  });

  it("passes visible cases, reveals the first hidden failure, and skips the rest", () => {
    const problem: JudgingProblem = {
      ...PROBLEM,
      testcases: [
        { args: [[2, 7], 9], expected: "[0,1]", hidden: false },
        { args: [[3, 3], 6], expected: "[0,1]", hidden: true },
        { args: [[1, 2, 3], 5], expected: "[1,2]", hidden: true },
      ],
    };
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:wrong-answer\n`),
      problem,
    );

    assert.equal(result.verdict, "wrong_answer");
    assert.equal(result.totalCount, 3);
    assert.equal(result.cases.length, 2);
    assert.equal(result.passedCount, 1);

    const visible = result.cases[0];
    assert.equal(visible?.hidden, false);
    assert.equal(visible?.status, "accepted");
    assert.ok(visible?.input);
    assert.ok(visible?.expected);

    const hidden = result.cases[1];
    assert.equal(hidden?.hidden, true);
    assert.equal(hidden?.index, 0);
    assert.equal(hidden?.status, "wrong_answer");
    assert.ok(hidden?.input);
    assert.equal(hidden?.expected, "[0,1]");
    assert.equal(hidden?.stdout, "[]");
  });

  it("reveals the first failing hidden case", () => {
    const hiddenFirst: JudgingProblem = {
      ...PROBLEM,
      testcases: [
        { args: [[3, 3], 6], expected: "[0,1]", hidden: true },
        { args: [[1, 2, 3], 5], expected: "[1,2]", hidden: true },
      ],
    };
    const result = runWithMock(
      request(`${IMPLEMENTED}\n# force:wrong-answer\n`),
      hiddenFirst,
    );

    assert.equal(result.verdict, "wrong_answer");
    assert.equal(result.totalCount, 2);
    assert.equal(result.cases.length, 2);
    const failure = result.cases[1];
    assert.equal(failure?.hidden, true);
    assert.equal(failure?.status, "wrong_answer");
    assert.ok(failure?.input);
    assert.equal(failure?.expected, "[1,2]");
    assert.equal(failure?.stdout, "[]");
  });
});
