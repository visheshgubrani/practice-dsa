import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthoredProblem } from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";
import { checkCatalog, formatConformanceReport } from "@/lib/problems/conformance";
import { FIXTURES } from "@/lib/harness/fixtures";

function mini(overrides: Partial<AuthoredProblem> = {}): AuthoredProblem {
  return {
    slug: "two-sum",
    number: 1,
    title: "Two Sum",
    difficulty: "easy",
    tags: ["array"],
    statement: "Find two indices.",
    constraints: ["`n >= 2`"],
    examples: [
      {
        args: [[2, 7], 9],
        output: "[0,1]",
        explanation: "hand-verified",
      },
    ],
    testcases: [
      {
        args: [[2, 7], 9],
        expected: "[0,1]",
        note: "hand-verified",
      },
      {
        args: [[3, 2, 4], 6],
        expected: "[1,2]",
        note: "second visible",
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        args: [[1, 2], 3],
        expected: "[0,1]",
        hidden: true as const,
        note: `hidden ${index}`,
      })),
    ],
    starterCode: {
      python: "class Solution:\n    def twoSum(self, nums, target):\n        \n",
    },
    notes: { approach: "", timeComplexity: "", spaceComplexity: "" },
    signature: {
      name: "twoSum",
      params: [
        { name: "nums", kind: "int[]" },
        { name: "target", kind: "int" },
      ],
      returns: "int[]",
    },
    compare: "index_pair",
    sourceUrl: "https://leetcode.com/problems/two-sum/",
    reference: `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, value in enumerate(nums):
            if target - value in seen:
                return [seen[target - value], i]
            seen[value] = i
        return []
`,
    ...overrides,
  };
}

describe("checkCatalog", () => {
  it("accepts the authored catalog", () => {
    const report = checkCatalog(PROBLEMS);
    assert.equal(report.ok, true, formatConformanceReport(report));
  });

  it("prints a candidate for a missing expected and does not invent one", () => {
    const report = checkCatalog([
      mini({
        testcases: [
          {
            args: [[2, 7], 9],
            note: "visible",
          },
          {
            args: [[3, 2, 4], 6],
            expected: "[1,2]",
            note: "second",
          },
          ...Array.from({ length: 8 }, () => ({
            args: [[1, 2], 3],
            expected: "[0,1]",
            hidden: true as const,
          })),
        ],
      }),
    ]);

    assert.equal(report.ok, false);
    const missing = report.issues.find((issue) => issue.kind === "missing_expected");
    assert.ok(missing);
    assert.match(missing.message, /candidate to paste/);
    assert.match(missing.message, /"\[0,1\]"/);
    assert.equal(
      report.issues.some((issue) => issue.message.includes("auto-replace")),
      false,
    );
  });

  it("does not replace a mismatching expectation", () => {
    const report = checkCatalog([
      mini({
        testcases: [
          {
            args: [[2, 7], 9],
            expected: "[9,9]",
            note: "wrong on purpose",
          },
          {
            args: [[3, 2, 4], 6],
            expected: "[1,2]",
            note: "second",
          },
          ...Array.from({ length: 8 }, () => ({
            args: [[1, 2], 3],
            expected: "[0,1]",
            hidden: true as const,
          })),
        ],
      }),
    ]);

    assert.equal(report.ok, false);
    const mismatch = report.issues.find((issue) => issue.kind === "mismatch");
    assert.ok(mismatch);
    assert.match(mismatch.message, /not replaced/);
    assert.match(mismatch.message, /\[9,9\]/);
    assert.match(mismatch.message, /\[0,1\]/);
  });
});

describe("fixtures", () => {
  it("uses each problem module's reference as the accepted program", () => {
    for (const problem of PROBLEMS) {
      const fixture = FIXTURES.find((entry) => entry.slug === problem.slug);
      assert.equal(fixture?.accepted, problem.reference);
      assert.ok(
        (fixture?.broken?.length ?? 0) > 0,
        `${problem.slug} needs a broken implementation`,
      );
    }
  });
});
