import type { AuthoredProblem } from "./authoring";

export const trappingRainWater = {
  slug: "trapping-rain-water",
  number: 42,
  title: "Trapping Rain Water",
  difficulty: "hard",
  tags: ["array", "two-pointers", "stack", "dynamic-programming", "neetcode-150"],
  statement: [
    "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
  ].join("\n"),
  examples: [
    {
      args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
      output: "6",
      explanation:
        "Water sits in the valleys between bars; the map traps 6 units.",
    },
    {
      args: [[4, 2, 0, 3, 2, 5]],
      output: "9",
      explanation: "The bounding bars of height 4 and 5 trap 9 units between them.",
    },
  ],
  constraints: [
    "`n == height.length`",
    "`1 <= n <= 2 * 10⁴`",
    "`0 <= height[i] <= 10⁵`",
  ],
  testcases: [
    {
      args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
      expected: "6",
      note: "Water sits in the valleys between bars; the map traps 6 units.",
    },
    {
      args: [[4, 2, 0, 3, 2, 5]],
      expected: "9",
      note: "The bounding bars of height 4 and 5 trap 9 units between them.",
    },
    { args: [[0]], expected: "0", hidden: true, note: "minimum length, zero height" },
    { args: [[5]], expected: "0", hidden: true, note: "minimum length, a single bar" },
    {
      args: [[1, 2, 3, 4]],
      expected: "0",
      hidden: true,
      note: "strictly increasing, nothing to trap",
    },
    {
      args: [[4, 3, 2, 1]],
      expected: "0",
      hidden: true,
      note: "strictly decreasing, nothing to trap",
    },
    {
      args: [[2, 2, 2, 2]],
      expected: "0",
      hidden: true,
      note: "flat duplicates",
    },
    { args: [[4, 2, 3]], expected: "1", hidden: true, note: "small valley" },
    { args: [[2, 0, 2]], expected: "2", hidden: true, note: "single pit" },
    {
      args: [[5, 1, 5, 1, 5]],
      expected: "8",
      hidden: true,
      note: "alternating peaks",
    },
    {
      args: [[100_000, 0, 100_000]],
      expected: "100000",
      hidden: true,
      note: "constraint-max height",
    },
    { args: [[0, 0, 0]], expected: "0", hidden: true, note: "all zeros" },
  ],
  starterCode: {
    python: `class Solution:
    def trap(self, height: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Water above a bar is limited by the shorter of the two tallest bars around it. Walk inward with two pointers keeping the best height seen from each side: always advance the side with the smaller maximum, because that maximum is already the binding constraint for that bar.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "trap",
    params: [{ name: "height", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/trapping-rain-water/",
  reference: `class Solution:
    def trap(self, height: List[int]) -> int:
        left, right = 0, len(height) - 1
        best_left = best_right = total = 0
        while left < right:
            if height[left] < height[right]:
                best_left = max(best_left, height[left])
                total += best_left - height[left]
                left += 1
            else:
                best_right = max(best_right, height[right])
                total += best_right - height[right]
                right -= 1
        return total
`,
} satisfies AuthoredProblem;
