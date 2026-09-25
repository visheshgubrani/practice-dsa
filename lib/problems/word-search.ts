import type { AuthoredProblem } from "./authoring";

export const wordSearch = {
  slug: "word-search",
  number: 79,
  title: "Word Search",
  difficulty: "medium",
  tags: ["array", "string", "backtracking", "depth-first-search", "matrix", "neetcode-150"],
  statement: [
    "Given a grid of letters and a word, return whether the word can be formed by moving between horizontally or vertically adjacent cells.",
    "",
    "A cell may be used at most once in the same path. Diagonal moves are not allowed.",
  ].join("\\n"),
  examples: [
    { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], "ABCCED"], output: "true", explanation: "The path A-B-C-C-E-D uses adjacent cells without revisiting one." },
    { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], "SEE"], output: "true", explanation: "S-E-E can be traced through the right side of the board." },
  ],
  constraints: ["`1 <= board.length, board[i].length <= 6`", "`1 <= word.length <= 15`", "The board is rectangular.", "Each cell and each word character is an uppercase English letter.", "Moves are horizontal or vertical only."],
  testcases: [
    { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], "ABCCED"], expected: "true", note: "A winding path spells the word." },
    { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], "SEE"], expected: "true", note: "The two Es can be reached from the right-side S." },
    { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], "ABCB"], expected: "false", hidden: true, note: "The final B would require revisiting the first B." },
    { args: [[['A']], "A"], expected: "true", hidden: true, note: "A one-cell board matches its one-letter word." },
    { args: [[['A']], "B"], expected: "false", hidden: true, note: "A different letter cannot start a path." },
    { args: [[['A', 'B']], "AB"], expected: "true", hidden: true, note: "A horizontal two-cell path succeeds." },
    { args: [[['A', 'B']], "BA"], expected: "true", hidden: true, note: "The same cells may be traversed in the reverse direction." },
    { args: [[['A', 'B']], "AA"], expected: "false", hidden: true, note: "The only A cannot be reused." },
    { args: [[['A', 'B'], ['C', 'D']], "ACB"], expected: "false", hidden: true, note: "After A-C, B is diagonal from C rather than adjacent." },
    { args: [[['A', 'A'], ['A', 'A']], "AAAAA"], expected: "false", hidden: true, note: "The word is longer than the four available cells." },
  ],
  starterCode: { python: `class Solution:\n    def exist(self, board: List[List[str]], word: str) -> bool:\n        ` },
  notes: { approach: "Start a depth-first search from every cell matching the next character. Mark the current cell in a path set, explore four neighbors, and remove the mark while backtracking so another path can use the cell.", timeComplexity: "O(m · n · 4ᴸ)", spaceComplexity: "O(L) path and recursion space" },
  signature: { name: "exist", params: [{ name: "board", kind: "string[][]" }, { name: "word", kind: "string" }], returns: "bool" },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/word-search/",
  reference: `class Solution:\n    def exist(self, board: List[List[str]], word: str) -> bool:\n        ROWS, COLS = len(board), len(board[0])\n        path = set()\n\n        def dfs(r, c, i):\n            if i == len(word):\n                return True\n            if (\n                min(r, c) < 0\n                or r >= ROWS\n                or c >= COLS\n                or word[i] != board[r][c]\n                or (r, c) in path\n            ):\n                return False\n            path.add((r, c))\n            res = (\n                dfs(r + 1, c, i + 1)\n                or dfs(r - 1, c, i + 1)\n                or dfs(r, c + 1, i + 1)\n                or dfs(r, c - 1, i + 1)\n            )\n            path.remove((r, c))\n            return res\n\n        for r in range(ROWS):\n            for c in range(COLS):\n                if dfs(r, c, 0):\n                    return True\n        return False\n`,
  rejection: `class Solution:\n    def exist(self, board, word):\n        # Allows a path to reuse cells, so repeated letters can be over-accepted.\n        rows, cols = len(board), len(board[0])\n        def dfs(r, c, i):\n            if i == len(word):\n                return True\n            if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:\n                return False\n            return (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1) or\n                    dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))\n        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))\n`,
} satisfies AuthoredProblem;
