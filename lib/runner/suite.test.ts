import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JudgingProblem } from "@/lib/problems/authoring";
import { InvalidRunRequestError } from "@/lib/runner/errors";
import {
  discloseCaseResult,
  prepareRun,
  publishCaseResult,
  tryPrepareRun,
} from "@/lib/runner/suite";
import type { CaseResult, RunRequest } from "@/lib/runner/types";

function problem(overrides: Partial<JudgingProblem> = {}): JudgingProblem {
  return {
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
    ...overrides,
  };
}

/** Visible, hidden, visible — Submit must not keep catalog order. */
function interleaved(): JudgingProblem {
  return problem({
    testcases: [
      { args: [[2, 7], 9], expected: "[0,1]", hidden: false },
      { args: [[1, 2, 3], 5], expected: "[1,2]", hidden: true },
      { args: [[3, 2, 4], 6], expected: "[1,2]", hidden: false },
      { args: [[3, 3], 6], expected: "[0,1]", hidden: true },
    ],
  });
}

function request(extras: Partial<RunRequest> = {}): RunRequest {
  return {
    slug: "two-sum",
    language: "python",
    source: "class Solution:\n    pass\n",
    mode: "submit",
    ...extras,
  };
}

describe("prepareRun", () => {
  it("selects every case on Submit, visible first then hidden", () => {
    const prepared = prepareRun(request({ mode: "submit" }), interleaved());
    assert.deepEqual(prepared.indices, [0, 2, 1, 3]);
    assert.equal(prepared.totalCount, 4);
  });

  it("selects the named visible case on Run, not a catalog slot", () => {
    const prepared = prepareRun(
      request({ mode: "run", testcaseIndex: 1 }),
      interleaved(),
    );
    assert.deepEqual(prepared.indices, [2]);
    assert.equal(prepared.totalCount, 1);
  });

  it("rejects an out-of-range Run index instead of clamping", () => {
    assert.throws(
      () => prepareRun(request({ mode: "run", testcaseIndex: 9 }), problem()),
      (error: unknown) => {
        assert.ok(error instanceof InvalidRunRequestError);
        assert.match(error.message, /out of range/);
        return true;
      },
    );
    assert.throws(
      () => prepareRun(request({ mode: "run", testcaseIndex: -1 }), problem()),
      InvalidRunRequestError,
    );
  });

  it("rejects a Run index that would address a hidden case", () => {
    assert.throws(
      () =>
        prepareRun(request({ mode: "run", testcaseIndex: 2 }), interleaved()),
      InvalidRunRequestError,
    );
  });
});

describe("tryPrepareRun", () => {
  it("turns an empty suite into internal_error, never accepted", () => {
    const prepared = tryPrepareRun(
      request({ mode: "submit" }),
      "piston",
      problem({ testcases: [] }),
    );

    assert.ok("result" in prepared);
    assert.equal(prepared.result.verdict, "internal_error");
    assert.equal(prepared.result.passedCount, 0);
    assert.equal(prepared.result.totalCount, 0);
    assert.match(prepared.result.compileOutput ?? "", /no testcases/);
  });

  it("turns a missing expected value into internal_error, never accepted", () => {
    const prepared = tryPrepareRun(
      request({ mode: "submit" }),
      "piston",
      problem({
        testcases: [{ args: [[1, 2], 3], expected: "   ", hidden: false }],
      }),
    );

    assert.ok("result" in prepared);
    assert.equal(prepared.result.verdict, "internal_error");
    assert.match(prepared.result.compileOutput ?? "", /no expected value/);
  });

  it("does not swallow an invalid Run index", () => {
    assert.throws(
      () =>
        tryPrepareRun(
          request({ mode: "run", testcaseIndex: 4 }),
          "mock",
          problem(),
        ),
      InvalidRunRequestError,
    );
  });
});

describe("discloseCaseResult", () => {
  const revealed: CaseResult = {
    index: 0,
    status: "accepted",
    hidden: false,
    input: "nums = [2,7]\ntarget = 9",
    expected: "[0,1]",
    stdout: "[0,1]",
    debug: "trace",
    timeMs: 12,
    memoryKb: 10240,
  };

  it("keeps visible successes intact", () => {
    assert.deepEqual(discloseCaseResult(revealed), revealed);
  });

  it("redacts hidden successes to status and metrics", () => {
    const disclosed = discloseCaseResult({ ...revealed, hidden: true, index: 0 });
    assert.deepEqual(disclosed, {
      index: 0,
      status: "accepted",
      hidden: true,
      timeMs: 12,
      memoryKb: 10240,
    });
  });

  it("reveals the first failing hidden case", () => {
    const failure: CaseResult = {
      index: 0,
      status: "wrong_answer",
      hidden: true,
      input: "nums = [1,2,3]\ntarget = 5",
      expected: "[1,2]",
      stdout: "[]",
      debug: "trace",
      stderr: "boom",
      timeMs: 9,
    };
    assert.deepEqual(discloseCaseResult(failure), failure);
  });
});

describe("publishCaseResult", () => {
  it("remaps catalog indices onto visible and hidden public slots", () => {
    const published = publishCaseResult(interleaved(), 3, {
      status: "wrong_answer",
      input: "nums = [3,3]\ntarget = 6",
      expected: "[0,1]",
      stdout: "[]",
      debug: "trace",
      timeMs: 9,
    });

    assert.equal(published.index, 1);
    assert.equal(published.hidden, true);
    assert.equal(published.input, "nums = [3,3]\ntarget = 6");
    assert.equal(published.expected, "[0,1]");
    assert.equal(published.stdout, "[]");
  });

  it("redacts a hidden success through the same public helper", () => {
    const published = publishCaseResult(interleaved(), 1, {
      status: "accepted",
      input: "secret",
      expected: "[1,2]",
      stdout: "[1,2]",
      debug: "trace",
      timeMs: 5,
      memoryKb: 1024,
    });

    assert.deepEqual(published, {
      index: 0,
      status: "accepted",
      hidden: true,
      timeMs: 5,
      memoryKb: 1024,
    });
  });
});
