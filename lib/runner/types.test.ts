import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caseLabel, isVerifiedAcceptance, runRequestSchema } from "@/lib/runner/types";

describe("caseLabel", () => {
  it("labels visible and hidden cases distinctly", () => {
    assert.equal(caseLabel({ index: 0, hidden: false }), "Case 1");
    assert.equal(caseLabel({ index: 2, hidden: true }), "Hidden 3");
  });
});

describe("isVerifiedAcceptance", () => {
  it("accepts only a successful Piston Submit", () => {
    assert.equal(
      isVerifiedAcceptance({
        mode: "submit",
        runner: "piston",
        verdict: "accepted",
      }),
      true,
    );
  });

  it("rejects a passing sample Run", () => {
    assert.equal(
      isVerifiedAcceptance({
        mode: "run",
        runner: "piston",
        verdict: "accepted",
      }),
      false,
    );
  });

  it("rejects a mock / simulated Submit", () => {
    assert.equal(
      isVerifiedAcceptance({
        mode: "submit",
        runner: "mock",
        verdict: "accepted",
      }),
      false,
    );
  });

  it("rejects a failing Piston Submit", () => {
    assert.equal(
      isVerifiedAcceptance({
        mode: "submit",
        runner: "piston",
        verdict: "wrong_answer",
      }),
      false,
    );
  });
});

describe("runRequestSchema", () => {
  it("accepts an optional request id and rejects a non-uuid", () => {
    const base = {
      slug: "two-sum",
      language: "python",
      source: "class Solution:\n    pass\n",
      mode: "submit",
    };
    assert.equal(runRequestSchema.safeParse(base).success, true);
    assert.equal(
      runRequestSchema.safeParse({
        ...base,
        requestId: "11111111-1111-4111-8111-111111111111",
      }).success,
      true,
    );
    assert.equal(
      runRequestSchema.safeParse({ ...base, requestId: "not-a-uuid" }).success,
      false,
    );
  });
});
