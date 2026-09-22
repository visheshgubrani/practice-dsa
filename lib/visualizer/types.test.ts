import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isVisualizeResponse, visualizeRequestSchema } from "@/lib/visualizer/types";

const VALID = {
  slug: "two-sum",
  language: "python",
  source: "class Solution:\n    pass\n",
  testcaseIndex: 0,
} as const;

describe("visualizeRequestSchema", () => {
  it("accepts one visible case of one problem", () => {
    assert.equal(visualizeRequestSchema.safeParse(VALID).success, true);
    assert.equal(
      visualizeRequestSchema.safeParse({ ...VALID, testcaseIndex: 50 }).success,
      true,
    );
  });

  it("rejects a language with no tracer", () => {
    assert.equal(
      visualizeRequestSchema.safeParse({ ...VALID, language: "cpp" }).success,
      false,
    );
  });

  it("rejects a case index outside the range a run may name", () => {
    for (const testcaseIndex of [-1, 1.5, 51]) {
      assert.equal(
        visualizeRequestSchema.safeParse({ ...VALID, testcaseIndex }).success,
        false,
        `index ${testcaseIndex} should be refused`,
      );
    }
  });

  it("rejects an oversized buffer and a missing slug", () => {
    assert.equal(
      visualizeRequestSchema.safeParse({
        ...VALID,
        source: "x".repeat(200_001),
      }).success,
      false,
    );
    assert.equal(
      visualizeRequestSchema.safeParse({ ...VALID, slug: "" }).success,
      false,
    );
  });
});

describe("isVisualizeResponse", () => {
  const response = {
    trace: [{ line: 1, event: "step_line" }],
    code: "class Solution:\n",
    steps: 1,
    truncated: false,
    outcome: "completed",
    engine: { version: "3.12.0" },
  };

  it("accepts what the route returns", () => {
    assert.equal(isVisualizeResponse(response), true);
    assert.equal(
      isVisualizeResponse({ ...response, truncated: true, outcome: "step_limit" }),
      true,
    );
  });

  it("rejects a bare array, a missing field, and an unknown outcome", () => {
    assert.equal(isVisualizeResponse(response.trace), false);
    assert.equal(isVisualizeResponse(null), false);
    const { steps: _steps, ...withoutSteps } = response;
    assert.equal(isVisualizeResponse(withoutSteps), false);
    assert.equal(isVisualizeResponse({ ...response, outcome: "accepted" }), false);
  });
});
