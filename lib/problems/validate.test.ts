import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthoredProblem } from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";
import {
  validateCatalog,
  validateProblem,
} from "@/lib/problems/validate";

function problem(overrides: Partial<AuthoredProblem> = {}): AuthoredProblem {
  return {
    slug: "split-demo",
    number: 99,
    title: "Split Demo",
    difficulty: "easy",
    tags: ["array"],
    statement: "Demo.",
    constraints: ["`n >= 1`"],
    examples: [{ args: [[2, 7], 9], output: "[0,1]" }],
    testcases: [{ args: [[2, 7], 9], expected: "[0,1]" }],
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
    },
    notes: { approach: "", timeComplexity: "", spaceComplexity: "" },
    reference: `class Solution:
    def twoSum(self, nums, target):
        return [0, 1]
`,
    signature: {
      name: "twoSum",
      params: [
        { name: "nums", kind: "int[]" },
        { name: "target", kind: "int" },
      ],
      returns: "int[]",
    },
    compare: "index_pair",
    ...overrides,
  };
}

describe("validateProblem", () => {
  it("accepts a well-formed problem", () => {
    assert.deepEqual(validateProblem(problem(), { requireExpected: true }), []);
  });

  it("requires argument count to match the signature", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7]], expected: "[0,1]" }] }),
    );
    assert.match(issues.join("\n"), /has 1 argument, signature expects 2/);
  });

  it("rejects a boolean in an integer array", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, true], 9], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /nums\[1\] = true is not int/);
  });

  it("rejects a non-finite number", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, 7], Number.POSITIVE_INFINITY], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /target = Infinity is not int/);
  });

  it("rejects an int outside 32-bit range", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, 7], 3_000_000_000], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /target = 3000000000 is not int/);
  });

  it("rejects an expected value whose shape does not match the return kind", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7], 9], expected: "true" }] }),
    );
    assert.match(issues.join("\n"), /expects true, which is not int\[\]/);
  });

  it("allows a missing expected when authoring", () => {
    assert.deepEqual(
      validateProblem(problem({ testcases: [{ args: [[2, 7], 9] }] })),
      [],
    );
  });

  it("requires expected for judging and does not invent one", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7], 9] }] }),
      { requireExpected: true },
    );
    assert.deepEqual(issues, ["split-demo: testcase 1 has no expected value"]);
  });

  it("requires python starter code", () => {
    const issues = validateProblem(
      problem({ starterCode: { python: "   " } }),
    );
    assert.match(issues.join("\n"), /no starter code for python/);
  });

  it("requires a python reference solution", () => {
    const issues = validateProblem(problem({ reference: "   " }));
    assert.match(issues.join("\n"), /no python reference solution/);
  });
});

describe("validateCatalog", () => {
  it("accepts the authored catalog for seed", () => {
    assert.deepEqual(validateCatalog(PROBLEMS, { requireExpected: true }), []);
  });

  it("rejects duplicate slugs and numbers", () => {
    const copy = problem({ slug: "two-sum", number: 1, title: "Copy" });
    const issues = validateCatalog([PROBLEMS[0]!, copy], {
      requireExpected: true,
    });
    assert.match(issues.join("\n"), /slug is reused/);
    assert.match(issues.join("\n"), /problem number 1 is used by both/);
  });
});
