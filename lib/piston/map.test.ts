import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSyntaxFailure,
  toCaseResult,
  verdictForStage,
} from "@/lib/piston/map";
import { stageSchema, type ExecuteResponse, type Stage } from "@/lib/piston/types";

function stage(overrides: Record<string, unknown> = {}): Stage {
  return stageSchema.parse(overrides);
}

describe("verdictForStage", () => {
  it("maps a clean run to accepted before comparison", () => {
    assert.equal(verdictForStage(stage({ code: 0, stdout: "[0,1]\n" })), "accepted");
  });

  it("maps a timeout", () => {
    assert.equal(
      verdictForStage(stage({ status: "TO", signal: "SIGKILL" })),
      "time_limit_exceeded",
    );
  });

  it("maps an output limit to a runtime error, not a wrong answer", () => {
    assert.equal(
      verdictForStage(stage({ status: "OL", signal: "SIGKILL" })),
      "runtime_error",
    );
  });

  it("maps a runtime crash", () => {
    assert.equal(
      verdictForStage(stage({ code: 1, stderr: "ValueError: deliberate failure\n" })),
      "runtime_error",
    );
  });

  it("maps a sandbox internal failure", () => {
    assert.equal(verdictForStage(stage({ status: "XX" })), "internal_error");
  });
});

describe("toCaseResult", () => {
  it("reports the output-limit message on the case", () => {
    const { result } = toCaseResult(
      0,
      "nums = [2,7]\ntarget = 9",
      "[0,1]",
      stage({ status: "OL", stdout: "x".repeat(100) }),
      "exact",
    );

    assert.equal(result.status, "runtime_error");
    assert.match(result.stderr ?? "", /output limit/);
  });

  it("does not accept a mismatched return", () => {
    const { result } = toCaseResult(
      0,
      "nums = [2,7]\ntarget = 9",
      "[0,1]",
      stage({ code: 0, stdout: "[0,2]\n" }),
      "exact",
    );

    assert.equal(result.status, "wrong_answer");
  });

  it("compares only the serialized return and keeps debug prints", () => {
    const { result } = toCaseResult(
      0,
      "nums = [2,7]\ntarget = 9",
      "[0,1]",
      stage({ code: 0, stdout: "debugging\n[1,0]\n" }),
      "index_pair",
    );

    assert.equal(result.status, "accepted");
    assert.equal(result.debug, "debugging");
    assert.equal(result.stdout, "[1,0]");
  });

  it("fails closed when the return line is not JSON", () => {
    const { result } = toCaseResult(
      0,
      "nums = [2,7]\ntarget = 9",
      "[0,1]",
      stage({ code: 0, stdout: "still running\n" }),
      "exact",
    );

    assert.equal(result.status, "wrong_answer");
  });
});

describe("isSyntaxFailure", () => {
  it("treats a Python SyntaxError as a compile error", () => {
    const response: ExecuteResponse = {
      language: "python",
      version: "3.12.0",
      run: stage({
        code: 1,
        stderr: '  File "main.py", line 4\n    return [0, 1\nSyntaxError: unmatched "["\n',
      }),
    };

    assert.equal(isSyntaxFailure(response, "python"), true);
  });
});
