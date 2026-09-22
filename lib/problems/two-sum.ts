import type { AuthoredProblem } from "./authoring";

export const twoSum = {
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  difficulty: "easy",
  tags: ["array", "hash-table", "neetcode-150"],
  statement: [
    "Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.",
    "",
    "You may assume that each input would have **exactly one solution**, and you may not use the same element twice.",
    "",
    "You can return the answer in any order.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 7, 11, 15], 9],
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      args: [[3, 2, 4], 6],
      output: "[1,2]",
      explanation: "nums[1] + nums[2] == 6, so the indices are 1 and 2.",
    },
    {
      args: [[3, 3], 6],
      output: "[0,1]",
      explanation: "The two 3s at distinct indices are the pair.",
    },
  ],
  constraints: [
    "`2 <= nums.length <= 10⁴`",
    "`-10⁹ <= nums[i] <= 10⁹`",
    "`-10⁹ <= target <= 10⁹`",
    "**Only one valid answer exists.**",
  ],
  testcases: [
    {
      args: [[2, 7, 11, 15], 9],
      expected: "[0,1]",
      note: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      args: [[3, 2, 4], 6],
      expected: "[1,2]",
      note: "nums[1] + nums[2] == 6, so the indices are 1 and 2.",
    },
    {
      args: [[3, 3], 6],
      expected: "[0,1]",
      note: "The two 3s at distinct indices are the pair.",
    },
    { args: [[1, 2], 3], expected: "[0,1]", hidden: true, note: "minimum length" },
    {
      args: [[0, 4, 3, 0], 0],
      expected: "[0,3]",
      hidden: true,
      note: "zeros at both ends",
    },
    {
      args: [[-1, -2, -3, -4, -5], -8],
      expected: "[2,4]",
      hidden: true,
      note: "all negatives",
    },
    {
      args: [[-3, 4, 3, 90], 0],
      expected: "[0,2]",
      hidden: true,
      note: "mixed signs summing to zero",
    },
    {
      args: [[1, 3, 4, 2], 6],
      expected: "[2,3]",
      hidden: true,
      note: "pair is not at the front",
    },
    {
      args: [[1_000_000_000, -1_000_000_000], 0],
      expected: "[0,1]",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[5, 75, 25], 100],
      expected: "[1,2]",
      hidden: true,
      note: "later pair, no leading 0",
    },
    {
      args: [[2, 5, 5, 11], 10],
      expected: "[1,2]",
      hidden: true,
      note: "duplicate values, distinct indices",
    },
    {
      args: [[-10, 7, 3], -7],
      expected: "[0,2]",
      hidden: true,
      note: "negative target",
    },
  ],
  starterCode: {
    python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
  },
  notes: {
    approach:
      "One pass with a hash map from value to index. For every x, look for target - x in the map: a hit finishes the pair, a miss stores x with its index. Checking before inserting is what keeps an element from pairing with itself.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "twoSum",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int[]",
  },
  // Unique pair: `[0,1]` and `[1,0]` are the same answer. Recursive
  // `unordered` would also accept longer permutations, so this stays a
  // dedicated mode.
  compare: "index_pair",
  sourceUrl: "https://leetcode.com/problems/two-sum/",
  reference: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, value in enumerate(nums):
            if target - value in seen:
                return [seen[target - value], i]
            seen[value] = i
        return []
`,
} satisfies AuthoredProblem;
