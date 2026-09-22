import type { AuthoredProblem } from "./authoring";

export const twoSumIi = {
  slug: "two-sum-ii-input-array-is-sorted",
  number: 167,
  title: "Two Sum II - Input Array Is Sorted",
  difficulty: "medium",
  tags: ["array", "two-pointers", "binary-search", "neetcode-150"],
  statement: [
    "Given a `1`-indexed array `numbers` sorted in non-decreasing order, find two numbers that add up to `target`.",
    "",
    "Return their indices `[index1, index2]` with `1 <= index1 < index2 <= numbers.length`, and use constant extra space. The tests are generated so that exactly one pair qualifies.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 7, 11, 15], 9],
      output: "[1,2]",
      explanation: "`2 + 7 = 9`, and their 1-indexed positions are 1 and 2.",
    },
    {
      args: [[2, 3, 4], 6],
      output: "[1,3]",
      explanation: "`2 + 4 = 6`, so the pair is the first and the last element.",
    },
    {
      args: [[-1, 0], -1],
      output: "[1,2]",
      explanation: "`-1 + 0 = -1`: the smallest possible input, with a negative target.",
    },
  ],
  constraints: [
    "`2 <= numbers.length <= 3 * 10⁴`",
    "`-1000 <= numbers[i] <= 1000`",
    "`numbers` is sorted in non-decreasing order.",
    "`-1000 <= target <= 1000`",
    "The tests are generated such that there is exactly one solution.",
  ],
  testcases: [
    {
      args: [[2, 7, 11, 15], 9],
      expected: "[1,2]",
      note: "The pair sits at the start of the array.",
    },
    {
      args: [[2, 3, 4], 6],
      expected: "[1,3]",
      note: "The pair wraps around the middle element.",
    },
    {
      args: [[-1, 0], -1],
      expected: "[1,2]",
      note: "Minimum length with a negative target.",
    },
    { args: [[1, 2], 3], expected: "[1,2]", hidden: true, note: "minimum length, positive pair" },
    { args: [[1, 1], 2], expected: "[1,2]", hidden: true, note: "both values equal" },
    {
      args: [[0, 0, 3, 4], 0],
      expected: "[1,2]",
      hidden: true,
      note: "zero target with a leading pair of zeros",
    },
    {
      args: [[-1000, 1000], 0],
      expected: "[1,2]",
      hidden: true,
      note: "constraint-minimum and constraint-maximum values",
    },
    {
      args: [[-5, -3, -1, 2, 4], -4],
      expected: "[2,3]",
      hidden: true,
      note: "two negative values",
    },
    {
      args: [[3, 4, 7], 11],
      expected: "[2,3]",
      hidden: true,
      note: "the pair is at the end of the array",
    },
    {
      args: [[1, 2, 3, 4, 5, 6], 7],
      expected: "[1,6]",
      hidden: true,
      note: "the pair spans the whole array",
    },
    {
      args: [[2, 2, 3], 4],
      expected: "[1,2]",
      hidden: true,
      note: "a duplicate value used as the pair",
    },
    {
      args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 39],
      expected: "[19,20]",
      hidden: true,
      note: "a longer sorted array where both pointers must converge",
    },
  ],
  starterCode: {
    python: `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        `,
  },
  notes: {
    approach:
      "The array is sorted, so start one pointer at each end. If the two values sum above `target`, the larger one is too large and the right pointer moves left; if the sum is below `target`, the left pointer moves right. Every step discards one value permanently, so the pair is found in one pass with no extra memory.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "twoSum",
    params: [
      { name: "numbers", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int[]",
  },
  // Indices are 1-indexed and ordered, and the pair is unique, so the two
  // elements are a fixed sequence, not a free ordering.
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
  reference: `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers) - 1

        while l < r:
            curSum = numbers[l] + numbers[r]

            if curSum > target:
                r -= 1
            elif curSum < target:
                l += 1
            else:
                return [l + 1, r + 1]
`,
  rejection: `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        seen = {}
        for index, value in enumerate(numbers):
            # Returns 0-indexed positions, which this problem must not do.
            if target - value in seen:
                return [seen[target - value], index]
            seen[value] = index
`,
} satisfies AuthoredProblem;
