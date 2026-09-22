import type { AuthoredProblem } from "./authoring";

export const maximumSubarray = {
  slug: "maximum-subarray",
  number: 53,
  title: "Maximum Subarray",
  difficulty: "medium",
  tags: ["array", "divide-and-conquer", "dynamic-programming", "neetcode-150"],
  statement: [
    "Given an integer array `nums`, find the subarray with the largest sum, and return *its sum*.",
  ].join("\n"),
  examples: [
    {
      args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]],
      output: "6",
      explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
    },
    {
      args: [[1]],
      output: "1",
      explanation: "A single element is the whole array.",
    },
    {
      args: [[5, 4, -1, 7, 8]],
      output: "23",
      explanation: "The whole array is the maximum subarray.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁵`",
    "`-10⁴ <= nums[i] <= 10⁴`",
  ],
  testcases: [
    {
      args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]],
      expected: "6",
      note: "The subarray [4,-1,2,1] has the largest sum 6.",
    },
    {
      args: [[1]],
      expected: "1",
      note: "A single element is the whole array.",
    },
    {
      args: [[5, 4, -1, 7, 8]],
      expected: "23",
      note: "The whole array is the maximum subarray.",
    },
    { args: [[-1]], expected: "-1", hidden: true, note: "single negative" },
    {
      args: [[-2, -1]],
      expected: "-1",
      hidden: true,
      note: "all negative, pick the largest",
    },
    {
      args: [[1, 2, 3]],
      expected: "6",
      hidden: true,
      note: "all positive",
    },
    { args: [[0, 0, 0]], expected: "0", hidden: true, note: "all zeros" },
    {
      args: [[1, -1, 1]],
      expected: "1",
      hidden: true,
      note: "alternating, best is a single 1",
    },
    {
      args: [[-1, 0, -1]],
      expected: "0",
      hidden: true,
      note: "zero beats the negatives",
    },
    {
      args: [[8, -19, 5, -1, 5]],
      expected: "9",
      hidden: true,
      note: "restart after a deep drop",
    },
    {
      args: [[-2, -3, -1, 4]],
      expected: "4",
      hidden: true,
      note: "late positive after negatives",
    },
  ],
  starterCode: {
    python: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Kadane's algorithm: at each index the best subarray ending there is either the element alone or the element glued to the best subarray ending just before. Track that running best and the global maximum. Starting from nums[0] is what keeps an all-negative array from collapsing to 0.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "maxSubArray",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/maximum-subarray/",
  reference: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = current = nums[0]
        for value in nums[1:]:
            current = max(value, current + value)
            best = max(best, current)
        return best
`,
} satisfies AuthoredProblem;
