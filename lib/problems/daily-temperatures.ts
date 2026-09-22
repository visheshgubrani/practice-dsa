import type { AuthoredProblem } from "./authoring";

export const dailyTemperatures = {
  slug: "daily-temperatures",
  number: 739,
  title: "Daily Temperatures",
  difficulty: "medium",
  tags: ["array", "stack", "monotonic-stack", "neetcode-150"],
  statement: [
    "Given an array of integers `temperatures` represents the daily temperatures, return *an array* `answer` *such that* `answer[i]` *is the number of days you have to wait after the* `i`th *day to get a warmer temperature*. If there is no future day for which this is possible, keep `answer[i] == 0` instead.",
  ].join("\n"),
  examples: [
    {
      args: [[73, 74, 75, 71, 69, 72, 76, 73]],
      output: "[1,1,4,2,1,1,0,0]",
      explanation:
        "After 75 it is four days until 76; the last two days have no warmer future.",
    },
    {
      args: [[30, 40, 50, 60]],
      output: "[1,1,1,0]",
      explanation: "Each day is warmer than the one before, except the last.",
    },
    {
      args: [[30, 60, 90]],
      output: "[1,1,0]",
      explanation: "Strictly increasing; only the last day waits forever.",
    },
  ],
  constraints: [
    "`1 <= temperatures.length <= 10⁵`",
    "`30 <= temperatures[i] <= 100`",
  ],
  testcases: [
    {
      args: [[73, 74, 75, 71, 69, 72, 76, 73]],
      expected: "[1,1,4,2,1,1,0,0]",
      note: "After 75 it is four days until 76; the last two days have no warmer future.",
    },
    {
      args: [[30, 40, 50, 60]],
      expected: "[1,1,1,0]",
      note: "Each day is warmer than the one before, except the last.",
    },
    {
      args: [[30, 60, 90]],
      expected: "[1,1,0]",
      note: "Strictly increasing; only the last day waits forever.",
    },
    {
      args: [[30, 30, 30]],
      expected: "[0,0,0]",
      hidden: true,
      note: "equal temperatures are not warmer",
    },
    { args: [[30]], expected: "[0]", hidden: true, note: "minimum length" },
    {
      args: [[100, 99, 98]],
      expected: "[0,0,0]",
      hidden: true,
      note: "strictly decreasing",
    },
    {
      args: [[70, 70, 71]],
      expected: "[2,1,0]",
      hidden: true,
      note: "ties, then a warmer day",
    },
    {
      args: [[89, 62, 70, 58, 73, 80, 100]],
      expected: "[6,1,2,1,1,1,0]",
      hidden: true,
      note: "next warmer is not adjacent",
    },
    {
      args: [[55, 38, 53, 81]],
      expected: "[3,1,1,0]",
      hidden: true,
      note: "late peak covers the front",
    },
    {
      args: [[30, 100]],
      expected: "[1,0]",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[71, 71, 71, 72]],
      expected: "[3,2,1,0]",
      hidden: true,
      note: "a run of ties then one warmer day",
    },
  ],
  starterCode: {
    python: `class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        `,
  },
  notes: {
    approach:
      "A decreasing stack of indices waits for the next warmer day. When today's temperature is warmer than the stack top, that earlier day has found its answer (today's index minus its own). Equal temperatures stay on the stack because they are not warmer. Days still on the stack at the end have no warmer future, so they keep 0.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "dailyTemperatures",
    params: [{ name: "temperatures", kind: "int[]" }],
    returns: "int[]",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/daily-temperatures/",
  reference: `class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        answer = [0] * len(temperatures)
        stack = []
        for i, temp in enumerate(temperatures):
            while stack and temperatures[stack[-1]] < temp:
                prev = stack.pop()
                answer[prev] = i - prev
            stack.append(i)
        return answer
`,
} satisfies AuthoredProblem;
