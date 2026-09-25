import type { AuthoredProblem } from "./authoring";

export const nQueens = {
  slug: "n-queens",
  number: 51,
  title: "N-Queens",
  difficulty: "hard",
  tags: ["array", "backtracking", "algorithm-x", "neetcode-150"],
  statement: [
    "Place `n` queens on an `n x n` chessboard so that no two queens share a row, column, or diagonal.",
    "",
    "Return every valid board. Each board is an array of strings using `Q` for a queen and `.` for an empty square; boards may be returned in any order.",
  ].join("\\n"),
  examples: [
    { args: [4], output: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]", explanation: "Four queens have two non-attacking arrangements." },
    { args: [1], output: "[[\"Q\"]]", explanation: "A one-cell board needs one queen." },
  ],
  constraints: ["`1 <= n <= 9`"],
  testcases: [
    { args: [4], expected: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]", note: "The two standard four-queen boards." },
    { args: [1], expected: "[[\"Q\"]]", note: "The one-cell board has one solution." },
    { args: [2], expected: "[]", hidden: true, note: "Two queens cannot avoid sharing a diagonal." },
    { args: [3], expected: "[]", hidden: true, note: "Three queens also have no non-attacking arrangement." },
    { args: [4], expected: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]", hidden: true, note: "A repeated legal size guards against state leaking between calls." },
    { args: [5], expected: "[[\"Q....\",\"..Q..\",\"....Q\",\".Q...\",\"...Q.\"],[\"Q....\",\"...Q.\",\".Q...\",\"....Q\",\"..Q..\"],[\".Q...\",\"...Q.\",\"Q....\",\"..Q..\",\"....Q\"],[\".Q...\",\"....Q\",\"..Q..\",\"Q....\",\"...Q.\"],[\"..Q..\",\"Q....\",\"...Q.\",\".Q...\",\"....Q\"],[\"..Q..\",\"....Q\",\".Q...\",\"...Q.\",\"Q....\"],[\"...Q.\",\"Q....\",\"..Q..\",\"....Q\",\".Q...\"],[\"...Q.\",\".Q...\",\"....Q\",\"..Q..\",\"Q....\"],[\"....Q\",\".Q...\",\"...Q.\",\"Q....\",\"..Q..\"],[\"....Q\",\"..Q..\",\"Q....\",\"...Q.\",\".Q...\"]]", hidden: true, note: "Five queens have ten valid boards." },
    { args: [1], expected: "[[\"Q\"]]", hidden: true, note: "A second one-queen case checks fresh board construction." },
    { args: [2], expected: "[]", hidden: true, note: "The two-queen impossibility is stable across calls." },
    { args: [3], expected: "[]", hidden: true, note: "The three-queen impossibility is stable across calls." },
    { args: [4], expected: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]", hidden: true, note: "The four-queen solutions remain exactly two." },
  ],
  starterCode: { python: `class Solution:\n    def solveNQueens(self, n: int) -> List[List[str]]:\n        ` },
  notes: { approach: "Place one queen per row. Sets track used columns and both diagonal keys; reject a square if any set already contains its key, then undo all three marks after recursion.", timeComplexity: "O(n!)", spaceComplexity: "O(n) tracking sets and recursion, excluding returned boards" },
  signature: { name: "solveNQueens", params: [{ name: "n", kind: "int" }], returns: "string[][]" },
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/n-queens/",
  reference: `class Solution:\n    def solveNQueens(self, n: int) -> List[List[str]]:\n        col = set()\n        posDiag = set()\n        negDiag = set()\n        res = []\n        board = [["."] * n for i in range(n)]\n\n        def backtrack(r):\n            if r == n:\n                res.append(["".join(row) for row in board])\n                return\n            for c in range(n):\n                if c in col or (r + c) in posDiag or (r - c) in negDiag:\n                    continue\n                col.add(c)\n                posDiag.add(r + c)\n                negDiag.add(r - c)\n                board[r][c] = "Q"\n                backtrack(r + 1)\n                col.remove(c)\n                posDiag.remove(r + c)\n                negDiag.remove(r - c)\n                board[r][c] = "."\n\n        backtrack(0)\n        return res\n`,
  rejection: `class Solution:\n    def solveNQueens(self, n):\n        # Checks columns but ignores diagonals, so it accepts attacking queens.\n        used = set()\n        result = []\n        board = [["."] * n for _ in range(n)]\n        def dfs(row):\n            if row == n:\n                result.append(["".join(line) for line in board])\n                return\n            for col in range(n):\n                if col in used:\n                    continue\n                used.add(col)\n                board[row][col] = "Q"\n                dfs(row + 1)\n                board[row][col] = "."\n                used.remove(col)\n        dfs(0)\n        return result\n`,
} satisfies AuthoredProblem;
