import type { AuthoredProblem } from "./authoring";

export const containsDuplicate = {
  slug: "contains-duplicate",
  number: 217,
  title: "Contains Duplicate",
  difficulty: "easy",
  tags: ["array", "hash-table", "neetcode-150"],
  statement: [
    "Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 2, 3, 1]],
      output: "true",
      explanation: "1 appears twice.",
    },
    {
      args: [[1, 2, 3, 4]],
      output: "false",
      explanation: "Every value is unique.",
    },
    {
      args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]],
      output: "true",
      explanation: "Several values repeat.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁵`",
    "`-10⁹ <= nums[i] <= 10⁹`",
  ],
  testcases: [
    {
      args: [[1, 2, 3, 1]],
      expected: "true",
      note: "1 appears twice.",
    },
    {
      args: [[1, 2, 3, 4]],
      expected: "false",
      note: "Every value is unique.",
    },
    {
      args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]],
      expected: "true",
      note: "Several values repeat.",
    },
    { args: [[1]], expected: "false", hidden: true, note: "minimum length" },
    { args: [[0, 0]], expected: "true", hidden: true, note: "duplicate zeros" },
    {
      args: [[-1, -1]],
      expected: "true",
      hidden: true,
      note: "duplicate negatives",
    },
    {
      args: [[-1, 1]],
      expected: "false",
      hidden: true,
      note: "mixed signs, unique",
    },
    {
      args: [[2, 1, 2]],
      expected: "true",
      hidden: true,
      note: "duplicate is not adjacent",
    },
    {
      args: [[1_000_000_000, -1_000_000_000]],
      expected: "false",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 9]],
      expected: "true",
      hidden: true,
      note: "duplicate at the end",
    },
    {
      args: [[1, 2, 3, 1, 2, 3]],
      expected: "true",
      hidden: true,
      note: "each value twice, interleaved",
    },
  ],
  starterCode: {
    python: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        `,
  },
  notes: {
    approach:
      "A set of values seen so far answers the question in one pass. Insert each number; a hit means a duplicate, a miss means it is new. The empty leftover of the set at the end is uniqueness.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "containsDuplicate",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/contains-duplicate/",
  reference: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        seen = set()
        for value in nums:
            if value in seen:
                return True
            seen.add(value)
        return False
`,
} satisfies AuthoredProblem;
