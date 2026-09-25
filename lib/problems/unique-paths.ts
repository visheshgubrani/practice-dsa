import type { AuthoredProblem } from "./authoring";

export const uniquePaths = {
  slug: "unique-paths",
  number: 62,
  title: "Unique Paths",
  difficulty: "medium",
  tags: ["math","dynamic-programming","combinatorics","neetcode-150"],
  statement: "A robot starts in the top-left cell of an m by n grid and wants to reach the bottom-right cell. It may move only one cell down or one cell right. Return the number of different paths.",
  examples: [
    { args: [3,7], output: "28", explanation: "The robot makes six moves right and two moves down in any order, giving 28 paths." },
    { args: [3,2], output: "3", explanation: "The two rightward/downward moves can be ordered in three ways." },
  ],
  constraints: [
    "For this judge, 1 <= m, n <= 17 so every answer fits the signed 32-bit return type.",
  ],
  testcases: [
    { args: [3,7], expected: "28", hidden: false, note: "The robot makes six moves right and two moves down in any order, giving 28 paths." },
    { args: [3,2], expected: "3", hidden: false, note: "The two rightward/downward moves can be ordered in three ways." },
    { args: [1,1], expected: "1", hidden: true, note: "A one-cell grid has one path." },
    { args: [1,17], expected: "1", hidden: true, note: "A single row has only one path." },
    { args: [17,1], expected: "1", hidden: true, note: "A single column has only one path." },
    { args: [2,6], expected: "6", hidden: true, note: "The single downward move can be placed among five rightward moves." },
    { args: [4,4], expected: "20", hidden: true, note: "Choose which three of six moves go down." },
    { args: [5,7], expected: "210", hidden: true, note: "Choose four downward moves among ten total moves." },
    { args: [10,10], expected: "48620", hidden: true, note: "This checks a larger grid while keeping the count in range." },
    { args: [17,17], expected: "601080390", hidden: true, note: "The largest square grid allowed by this judge still fits int32." },
    { args: [8,12], expected: "31824", hidden: true, note: "Choose seven downward moves among eighteen total moves." },
  ],
  starterCode: { python: `class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        
` },
  notes: {
    approach: "Let ways[r][c] count routes from a cell to the destination. The destination has one route; every other cell sums the routes from its down and right neighbors. A one-row array can hold the same recurrence while scanning upward.",
    timeComplexity: "O(m × n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "uniquePaths",
    params: [
      { name: "m", kind: "int" },
      { name: "n", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/unique-paths/",
  reference: `class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        row = [1] * n

        for i in range(m - 1):
            newRow = [1] * n
            for j in range(n - 2, -1, -1):
                newRow[j] = newRow[j + 1] + row[j]
            row = newRow
        return row[0]

        # O(n * m) O(n)
`,
  rejection: `class Solution:
    def uniquePaths(self, m, n):
        # Counts only paths that go right first and then down.
        return 1 if m > 0 and n > 0 else 0
`,
} satisfies AuthoredProblem;
