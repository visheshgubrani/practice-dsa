import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caseLabel, isVerifiedAcceptance } from "@/lib/runner/types";

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
