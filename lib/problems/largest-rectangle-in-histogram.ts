import type { AuthoredProblem } from "./authoring";

export const largestRectangleInHistogram = {
  slug: "largest-rectangle-in-histogram",
  number: 84,
  title: "Largest Rectangle in Histogram",
  difficulty: "hard",
  tags: ["array", "stack", "monotonic-stack", "neetcode-150"],
  statement: [
    "Given an array `heights` where each entry is the height of a bar of width `1`, return the area of the largest rectangle that fits inside the histogram.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 1, 5, 6, 2, 3]],
      output: "10",
      explanation:
        "The tallest area comes from the bars of height `5` and `6`, giving a rectangle of height `5` and width `2`.",
    },
    {
      args: [[2, 4]],
      output: "4",
      explanation: "Either the single bar of height `4`, or both bars at the smaller height `2`.",
    },
  ],
  constraints: ["`1 <= heights.length <= 10⁵`", "`0 <= heights[i] <= 10⁴`"],
  testcases: [
    {
      args: [[2, 1, 5, 6, 2, 3]],
      expected: "10",
      note: "The best rectangle is not the tallest bar.",
    },
    {
      args: [[2, 4]],
      expected: "4",
      note: "Two bars, where a single tall bar and the full pair tie.",
    },
    { args: [[0]], expected: "0", hidden: true, note: "a single bar of zero height" },
    { args: [[1]], expected: "1", hidden: true, note: "minimum non-zero rectangle" },
    { args: [[2, 2]], expected: "4", hidden: true, note: "equal heights spanning both bars" },
    { args: [[0, 0]], expected: "0", hidden: true, note: "no height at all" },
    {
      args: [[1, 2, 3, 4, 5]],
      expected: "9",
      hidden: true,
      note: "a rising staircase where the middle step wins",
    },
    {
      args: [[5, 4, 3, 2, 1]],
      expected: "9",
      hidden: true,
      note: "a falling staircase with the same answer",
    },
    { args: [[2, 0, 2]], expected: "2", hidden: true, note: "a zero splits the histogram in two" },
    {
      args: [[4, 2, 0, 3, 2, 5]],
      expected: "6",
      hidden: true,
      note: "the winner spans a valley and a peak from the middle bar",
    },
    {
      args: [[10000, 10000]],
      expected: "20000",
      hidden: true,
      note: "constraint-max height across two bars",
    },
    { args: [[10000]], expected: "10000", hidden: true, note: "constraint-max height, one bar" },
    { args: [[1, 1, 1, 1]], expected: "4", hidden: true, note: "four flat bars" },
  ],
  starterCode: {
    python: `class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Keep a stack of bars whose heights are increasing, storing each bar's starting index. A shorter bar forces every taller bar before it to be closed: pop each one and score `height * (current index - its start index)`, then let the shorter bar inherit the earliest start it swallowed. A final pass closes whatever is left by extending those bars to the end of the histogram.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "largestRectangleArea",
    params: [{ name: "heights", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/largest-rectangle-in-histogram/",
  reference: `class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        maxArea = 0
        stack = []  # pair: (index, height)

        for i, h in enumerate(heights):
            start = i
            while stack and stack[-1][1] > h:
                index, height = stack.pop()
                maxArea = max(maxArea, height * (i - index))
                start = index
            stack.append((start, h))

        for i, h in stack:
            maxArea = max(maxArea, h * (len(heights) - i))
        return maxArea
`,
  rejection: `class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        # Only extends each bar to the right, so a rectangle whose shortest bar
        # sits at its right-hand end is never scored.
        best = 0
        for i in range(len(heights)):
            width = 0
            for j in range(i, len(heights)):
                if heights[j] < heights[i]:
                    break
                width += 1
            best = max(best, heights[i] * width)
        return best
`,
} satisfies AuthoredProblem;
