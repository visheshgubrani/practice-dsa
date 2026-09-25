import type { AuthoredProblem } from "./authoring";

export const longestIncreasingPathInAMatrix = {
  slug: "longest-increasing-path-in-a-matrix",
  number: 329,
  title: "Longest Increasing Path in a Matrix",
  difficulty: "hard",
  tags: ["array","dynamic-programming","depth-first-search","breadth-first-search","graph","topological-sort","memoization","matrix","directed-acyclic-graph","neetcode-150"],
  statement: "Return the length of the longest path of strictly increasing values in matrix. From a cell, you may move one cell up, down, left, or right; diagonal moves are not allowed.",
  examples: [
    { args: [[[9,9,4],[6,6,8],[2,1,1]]], output: "4", explanation: "One longest path is 1, 2, 6, 9 using adjacent cells." },
    { args: [[[3,4,5],[3,2,6],[2,2,1]]], output: "4", explanation: "The path 3, 4, 5, 6 has four adjacent cells." },
    { args: [[[1]]], output: "1", explanation: "A single cell forms a path of length one." },
  ],
  constraints: [
    "1 <= matrix.length, matrix[i].length <= 200; the matrix is rectangular.",
    "0 <= matrix[i][j] <= 2³¹ - 1.",
  ],
  testcases: [
    { args: [[[9,9,4],[6,6,8],[2,1,1]]], expected: "4", hidden: false, note: "One longest path is 1, 2, 6, 9 using adjacent cells." },
    { args: [[[3,4,5],[3,2,6],[2,2,1]]], expected: "4", hidden: false, note: "The path 3, 4, 5, 6 has four adjacent cells." },
    { args: [[[1]]], expected: "1", hidden: false, note: "A single cell forms a path of length one." },
    { args: [[[1]]], expected: "1", hidden: true, note: "The only cell has path length one." },
    { args: [[[7,7],[7,7]]], expected: "1", hidden: true, note: "Equal neighboring values cannot extend an increasing path." },
    { args: [[[1,2],[4,3]]], expected: "4", hidden: true, note: "The path 1, 2, 3, 4 uses only adjacent cells." },
    { args: [[[9,8],[7,6]]], expected: "3", hidden: true, note: "The best paths are 6, 7, 9 and 6, 8, 9." },
    { args: [[[1,2,3,4]]], expected: "4", hidden: true, note: "Every cell in the row extends the path." },
    { args: [[[1],[2],[3],[4]]], expected: "4", hidden: true, note: "Every cell in the column extends the path." },
    { args: [[[1,2],[2,3]]], expected: "3", hidden: true, note: "A path can use either 2 before reaching 3." },
    { args: [[[1,2,3],[6,5,4]]], expected: "6", hidden: true, note: "The path snakes through all six cells in increasing order." },
  ],
  starterCode: { python: `class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        
` },
  notes: {
    approach: "Treat each cell as a node with edges to adjacent cells of greater value. Since values strictly increase along edges, the graph has no cycles; the answer is the longest path ending at any cell.",
    timeComplexity: "O(rows × columns)",
    spaceComplexity: "O(rows × columns)",
  },
  signature: {
    name: "longestIncreasingPath",
    params: [
      { name: "matrix", kind: "int[][]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/longest-increasing-path-in-a-matrix/",
  reference: `class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        ROWS, COLS = len(matrix), len(matrix[0])
        dp = {}  # (r, c) -> LIP

        def dfs(r, c, prevVal):
            if r < 0 or r == ROWS or c < 0 or c == COLS or matrix[r][c] <= prevVal:
                return 0
            if (r, c) in dp:
                return dp[(r, c)]

            res = 1
            res = max(res, 1 + dfs(r + 1, c, matrix[r][c]))
            res = max(res, 1 + dfs(r - 1, c, matrix[r][c]))
            res = max(res, 1 + dfs(r, c + 1, matrix[r][c]))
            res = max(res, 1 + dfs(r, c - 1, matrix[r][c]))
            dp[(r, c)] = res
            return res

        for r in range(ROWS):
            for c in range(COLS):
                dfs(r, c, -1)
        return max(dp.values())
`,
  rejection: `class Solution:
    def longestIncreasingPath(self, matrix):
        # Searches only rightward and downward, missing valid reverse directions.
        rows, cols = len(matrix), len(matrix[0])
        memo = {}
        def visit(r, c):
            if (r, c) in memo:
                return memo[(r, c)]
            best = 1
            for nr, nc in ((r + 1, c), (r, c + 1)):
                if nr < rows and nc < cols and matrix[nr][nc] > matrix[r][c]:
                    best = max(best, 1 + visit(nr, nc))
            memo[(r, c)] = best
            return best
        return max(visit(r, c) for r in range(rows) for c in range(cols))
`,
} satisfies AuthoredProblem;
