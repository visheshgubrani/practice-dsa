import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatArguments } from "@/lib/harness/args";
import * as publicProblems from "@/lib/problems";
import {
  compileForSeed,
  toJudgingProblem,
  toPublicProblem,
  type AuthoredProblem,
} from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";

const authored = {
  slug: "split-demo",
  number: 99,
  title: "Split Demo",
  difficulty: "easy",
  tags: ["array"],
  statement: "Demo.",
  constraints: ["`n >= 1`"],
  examples: [
    {
      args: [[2, 7], 9],
      output: "[0,1]",
      explanation: "Authored separately from the generated input.",
    },
  ],
  testcases: [
    {
      args: [[2, 7], 9],
      expected: "[0,1]",
      note: "visible pair",
    },
    {
      args: [[3, 3], 6],
      expected: "[0,1]",
      hidden: true,
      note: "hidden pair",
    },
  ],
  starterCode: {
    python: "class Solution:\n    pass\n",
  },
  notes: { approach: "hash map", timeComplexity: "O(n)", spaceComplexity: "O(n)" },
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
} satisfies AuthoredProblem;

describe("public interface", () => {
  it("does not re-export the catalog, authoring helpers, or reference solutions", () => {
    assert.equal("PROBLEMS" in publicProblems, false);
    assert.equal("toPublicProblem" in publicProblems, false);
    assert.equal("toJudgingProblem" in publicProblems, false);
    assert.equal("checkCatalog" in publicProblems, false);
  });
});

describe("toPublicProblem", () => {
  it("keeps visible cases only and generates console input from args", () => {
    const problem = toPublicProblem(authored);

    assert.equal(problem.testcases.length, 1);
    assert.equal(problem.testcases[0]?.stdin, "nums = [2,7]\ntarget = 9");
    assert.equal(problem.testcases[0]?.expected, "[0,1]");
    assert.equal(problem.examples[0]?.input, "nums = [2,7], target = 9");
    assert.equal(
      problem.examples[0]?.explanation,
      "Authored separately from the generated input.",
    );
  });
});

describe("toJudgingProblem", () => {
  it("includes hidden cases with args, expected, and note", () => {
    const problem = toJudgingProblem(authored);

    assert.equal(problem.testcases.length, 2);
    assert.equal(problem.number, 99);
    assert.equal(problem.title, "Split Demo");
    assert.equal(problem.starterCode.python, "class Solution:\n    pass\n");
    assert.deepEqual(problem.testcases[1], {
      args: [[3, 3], 6],
      expected: "[0,1]",
      hidden: true,
      compare: undefined,
      note: "hidden pair",
    });
  });

  it("refuses a case with no expected value", () => {
    assert.throws(
      () =>
        toJudgingProblem({
          ...authored,
          testcases: [{ args: [[1, 2], 3] }],
        }),
      /no expected value/,
    );
  });
});

describe("compileForSeed", () => {
  it("stores note as explanation, hidden as isHidden, and args not stdin", () => {
    const { examples, testcases } = compileForSeed(authored);

    assert.equal(examples[0]?.input, "nums = [2,7], target = 9");
    assert.equal(testcases[0]?.explanation, "visible pair");
    assert.equal(testcases[0]?.isHidden, false);
    assert.deepEqual(testcases[0]?.args, [[2, 7], 9]);
    assert.equal(testcases[1]?.explanation, "hidden pair");
    assert.equal(testcases[1]?.isHidden, true);
    assert.deepEqual(testcases[1]?.args, [[3, 3], 6]);
  });
});

describe("catalog", () => {
  it("generates the previous console and example strings from args", () => {
    // Found by slug, not by index: `PROBLEMS` order is the NeetCode 150 roadmap
    // order and shifts as batches land.
    const bySlug = new Map(
      PROBLEMS.map((problem) => [problem.slug, toPublicProblem(problem)]),
    );
    const twoSum = bySlug.get("two-sum");
    const validParentheses = bySlug.get("valid-parentheses");
    const groupAnagrams = bySlug.get("group-anagrams");
    const trappingRainWater = bySlug.get("trapping-rain-water");

    assert.deepEqual(
      twoSum?.testcases.map((testcase) => testcase.stdin),
      [
        "nums = [2,7,11,15]\ntarget = 9",
        "nums = [3,2,4]\ntarget = 6",
        "nums = [3,3]\ntarget = 6",
      ],
    );
    assert.deepEqual(
      twoSum?.examples.map((example) => example.input),
      [
        "nums = [2,7,11,15], target = 9",
        "nums = [3,2,4], target = 6",
        "nums = [3,3], target = 6",
      ],
    );
    assert.deepEqual(
      validParentheses?.testcases.map((testcase) => testcase.stdin),
      ['s = "()"', 's = "()[]{}"', 's = "(]"'],
    );
    assert.deepEqual(
      validParentheses?.examples.map((example) => example.input),
      ['s = "()"', 's = "()[]{}"', 's = "(]"'],
    );
    assert.equal(
      groupAnagrams?.testcases[0]?.stdin,
      'strs = ["eat","tea","tan","ate","nat","bat"]',
    );
    assert.equal(
      trappingRainWater?.testcases[0]?.stdin,
      "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
    );
    const authoredTwoSum = PROBLEMS.find((problem) => problem.slug === "two-sum");
    assert.ok(authoredTwoSum);
    assert.equal(
      formatArguments(authoredTwoSum.testcases[0]!.args, authoredTwoSum.signature),
      twoSum?.testcases[0]?.stdin,
    );
  });

  it("keeps hidden cases out of the public shape and does not leak the reference", () => {
    const problem = toPublicProblem(authored);
    assert.equal(problem.testcases.length, 1);
    assert.equal("reference" in problem, false);
  });

  it("authors 2–3 visible cases and at least 8 hidden cases", () => {
    for (const problem of PROBLEMS) {
      const visible = problem.testcases.filter((testcase) => !testcase.hidden);
      const hidden = problem.testcases.filter((testcase) => testcase.hidden);
      assert.ok(
        visible.length >= 2 && visible.length <= 3,
        `${problem.slug} visible=${visible.length}`,
      );
      assert.ok(hidden.length >= 8, `${problem.slug} hidden=${hidden.length}`);
      assert.ok(problem.reference.trim().length > 0);
      assert.ok((problem.sourceUrl ?? "").length > 0);
    }
  });
});
