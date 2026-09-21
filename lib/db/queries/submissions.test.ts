import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isVerifiedAcceptedRow,
  nextProgressFromRun,
  toPublicCaseResult,
  toRunResult,
  toSubmissionDetail,
} from "@/lib/db/queries/submissions";

const hiddenSuccess = {
  caseIndex: 0,
  status: "accepted" as const,
  hidden: true,
  input: "nums = [1,2]\ntarget = 3",
  expected: "[0,1]",
  stdout: "[0,1]",
  debug: "trace",
  stderr: "boom",
  timeMs: 4,
  memoryKb: 1024,
};

describe("toPublicCaseResult", () => {
  it("redacts a hidden success to status and metrics", () => {
    assert.deepEqual(toPublicCaseResult(hiddenSuccess), {
      index: 0,
      status: "accepted",
      hidden: true,
      timeMs: 4,
      memoryKb: 1024,
    });
  });

  it("reveals the first failing hidden case", () => {
    const failure = {
      ...hiddenSuccess,
      status: "wrong_answer" as const,
      stdout: "[]",
    };
    assert.deepEqual(toPublicCaseResult(failure), {
      index: 0,
      status: "wrong_answer",
      hidden: true,
      input: "nums = [1,2]\ntarget = 3",
      expected: "[0,1]",
      stdout: "[]",
      debug: "trace",
      stderr: "boom",
      timeMs: 4,
      memoryKb: 1024,
    });
  });

  it("keeps visible successes intact", () => {
    const visible = { ...hiddenSuccess, hidden: false };
    assert.deepEqual(toPublicCaseResult(visible), {
      index: 0,
      status: "accepted",
      hidden: false,
      input: "nums = [1,2]\ntarget = 3",
      expected: "[0,1]",
      stdout: "[0,1]",
      debug: "trace",
      stderr: "boom",
      timeMs: 4,
      memoryKb: 1024,
    });
  });
});

describe("toSubmissionDetail", () => {
  it("never returns the unrevealed hidden suite", () => {
    const detail = toSubmissionDetail(
      {
        id: "11111111-1111-1111-1111-111111111111",
        language: "python",
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        source: "class Solution:\n    pass\n",
        testcaseIndex: null,
        passedCount: 2,
        totalCount: 2,
        timeMs: 9,
        memoryKb: 2048,
        compileOutput: null,
        pistonVersion: "3.12.0",
        catalogRevision: "2026-09-18T00:00:00.000Z",
        requestId: null,
        createdAt: new Date("2026-09-18T12:00:00.000Z"),
      },
      [
        { ...hiddenSuccess, hidden: false, caseIndex: 0 },
        hiddenSuccess,
      ],
      "two-sum",
    );

    assert.equal(detail.cases.length, 2);
    assert.equal(detail.cases[1]?.hidden, true);
    assert.equal(detail.cases[1]?.input, undefined);
    assert.equal(detail.cases[1]?.expected, undefined);
    assert.equal(detail.cases[1]?.stdout, undefined);
    assert.equal(detail.cases[1]?.debug, undefined);
    assert.equal(detail.cases[0]?.input, "nums = [1,2]\ntarget = 3");
  });
});

describe("isVerifiedAcceptedRow", () => {
  it("matches only a successful Piston Submit", () => {
    assert.equal(
      isVerifiedAcceptedRow({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
      }),
      true,
    );
    assert.equal(
      isVerifiedAcceptedRow({
        mode: "run",
        runner: "piston",
        verdict: "accepted",
      }),
      false,
    );
    assert.equal(
      isVerifiedAcceptedRow({
        mode: "submit",
        runner: "mock",
        verdict: "accepted",
      }),
      false,
    );
  });
});

describe("nextProgressFromRun", () => {
  const now = new Date("2026-09-19T12:00:00.000Z");

  it("does not treat mock or Run as genuine progress", () => {
    assert.deepEqual(
      nextProgressFromRun(null, {
        mode: "submit",
        runner: "mock",
        verdict: "accepted",
      }, now),
      { writes: false, status: "todo", solvedAt: null },
    );
    assert.equal(
      nextProgressFromRun(null, {
        mode: "run",
        runner: "piston",
        verdict: "accepted",
      }, now).status,
      "attempted",
    );
  });

  it("solves on a genuine Piston Submit and keeps the original solvedAt", () => {
    const first = nextProgressFromRun(
      null,
      { mode: "submit", runner: "piston", verdict: "accepted" },
      now,
    );
    assert.deepEqual(first, {
      writes: true,
      status: "solved",
      solvedAt: now,
    });

    const solvedAt = new Date("2026-01-01T00:00:00.000Z");
    const laterFail = nextProgressFromRun(
      { status: "solved", solvedAt },
      { mode: "submit", runner: "piston", verdict: "wrong_answer" },
      now,
    );
    assert.deepEqual(laterFail, {
      writes: false,
      status: "solved",
      solvedAt,
    });

    const laterAccept = nextProgressFromRun(
      { status: "solved", solvedAt },
      { mode: "submit", runner: "piston", verdict: "accepted" },
      now,
    );
    assert.deepEqual(laterAccept, {
      writes: false,
      status: "solved",
      solvedAt,
    });
  });
});

describe("toRunResult", () => {
  it("round-trips a stored detail into the console shape", () => {
    const detail = toSubmissionDetail(
      {
        id: "11111111-1111-1111-1111-111111111111",
        language: "python",
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
        source: "class Solution:\n    pass\n",
        testcaseIndex: null,
        passedCount: 2,
        totalCount: 2,
        timeMs: 9,
        memoryKb: 2048,
        compileOutput: null,
        pistonVersion: "3.12.0",
        catalogRevision: "2026-09-18T00:00:00.000Z",
        requestId: null,
        createdAt: new Date("2026-09-18T12:00:00.000Z"),
      },
      [{ ...hiddenSuccess, hidden: false, caseIndex: 0 }],
      "two-sum",
    );
    const result = toRunResult(detail);
    assert.equal(result.persisted, true);
    assert.equal(result.submissionId, detail.id);
    assert.equal(result.runner, "piston");
    assert.equal(result.at, "2026-09-18T12:00:00.000Z");
  });
});
