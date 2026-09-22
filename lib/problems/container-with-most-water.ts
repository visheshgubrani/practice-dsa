import type { AuthoredProblem } from "./authoring";

export const containerWithMostWater = {
  slug: "container-with-most-water",
  number: 11,
  title: "Container With Most Water",
  difficulty: "medium",
  tags: ["array", "two-pointers", "greedy", "neetcode-150"],
  statement: [
    "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`th line are `(i, 0)` and `(i, height[i])`.",
    "",
    "Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    "",
    "Return the maximum amount of water a container can store.",
    "",
    "Notice that you may not slant the container.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
      output: "49",
      explanation:
        "The lines at index 1 (height 8) and index 8 (height 7) hold 7 × 7 = 49. A taller pair that is closer holds less.",
    },
    {
      args: [[1, 1]],
      output: "1",
      explanation: "Minimum length: the only pair holds 1 × 1 = 1.",
    },
    {
      args: [[4, 3, 2, 1, 4]],
      output: "16",
      explanation: "The two 4s at the ends hold 4 × 4 = 16.",
    },
  ],
  constraints: [
    "`n == height.length`",
    "`2 <= n <= 10⁵`",
    "`0 <= height[i] <= 10⁴`",
  ],
  testcases: [
    {
      args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
      expected: "49",
      note: "The lines at index 1 (height 8) and index 8 (height 7) hold 7 × 7 = 49. A taller pair that is closer holds less.",
    },
    {
      args: [[1, 1]],
      expected: "1",
      note: "Minimum length: the only pair holds 1 × 1 = 1.",
    },
    {
      args: [[4, 3, 2, 1, 4]],
      expected: "16",
      note: "The two 4s at the ends hold 4 × 4 = 16.",
    },
    { args: [[0, 0]], expected: "0", hidden: true, note: "both heights zero" },
    { args: [[1, 2]], expected: "1", hidden: true, note: "minimum length, increasing" },
    { args: [[2, 1]], expected: "1", hidden: true, note: "minimum length, decreasing" },
    {
      args: [[1, 2, 1]],
      expected: "2",
      hidden: true,
      note: "the outer pair beats either adjacent pair",
    },
    {
      args: [[0, 10_000]],
      expected: "0",
      hidden: true,
      note: "a zero height holds no water",
    },
    {
      args: [[10_000, 10_000]],
      expected: "10000",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[1, 2, 4, 3]],
      expected: "4",
      hidden: true,
      note: "best pair is not the outer lines",
    },
    {
      args: [[8, 7, 6, 5]],
      expected: "15",
      hidden: true,
      note: "strictly decreasing; width beats the inner taller pairs",
    },
  ],
  starterCode: {
    python: `class Solution:
    def maxArea(self, height: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Start at both ends so the width is maximal. The area is min(left, right) times the width. Advance the shorter pointer: the width will shrink, so the only way to beat the current area is a taller limiting height. Moving the taller pointer cannot help, because the min stays the same or drops. Zeros contribute 0 and are simply walked past.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "maxArea",
    params: [{ name: "height", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/container-with-most-water/",
  reference: `class Solution:
    def maxArea(self, height: List[int]) -> int:
        left, right = 0, len(height) - 1
        best = 0
        while left < right:
            best = max(best, min(height[left], height[right]) * (right - left))
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1
        return best
`,
} satisfies AuthoredProblem;
