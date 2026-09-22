import type { AuthoredProblem } from "./authoring";

const SOLVED = [
  ["5", "3", "4", "6", "7", "8", "9", "1", "2"],
  ["6", "7", "2", "1", "9", "5", "3", "4", "8"],
  ["1", "9", "8", "3", "4", "2", "5", "6", "7"],
  ["8", "5", "9", "7", "6", "1", "4", "2", "3"],
  ["4", "2", "6", "8", "5", "3", "7", "9", "1"],
  ["7", "1", "3", "9", "2", "4", "8", "5", "6"],
  ["9", "6", "1", "5", "3", "7", "2", "8", "4"],
  ["2", "8", "7", "4", "1", "9", "6", "3", "5"],
  ["3", "4", "5", "2", "8", "6", "1", "7", "9"],
];

const EMPTY = [
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "."],
];

/** A copy with one cell replaced, so each fixture reads as the rule it breaks. */
function withCell(
  board: readonly string[][],
  row: number,
  column: number,
  value: string,
): string[][] {
  return board.map((cells, rowIndex) =>
    rowIndex === row
      ? cells.map((cell, columnIndex) => (columnIndex === column ? value : cell))
      : [...cells],
  );
}

const OFFICIAL_PARTIAL = [
  ["5", "3", ".", ".", "7", ".", ".", ".", "."],
  ["6", ".", ".", "1", "9", "5", ".", ".", "."],
  [".", "9", "8", ".", ".", ".", ".", "6", "."],
  ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
  ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
  ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
  [".", "6", ".", ".", ".", ".", "2", "8", "."],
  [".", ".", ".", "4", "1", "9", ".", ".", "5"],
  [".", ".", ".", ".", "8", ".", ".", "7", "9"],
];

const OFFICIAL_INVALID = withCell(OFFICIAL_PARTIAL, 0, 0, "8");

const SINGLE = withCell(EMPTY, 4, 4, "5");

/** Only the row rule breaks: `7` is already in row 0, but not in that column or box. */
const ROW_CLASH = withCell(SOLVED, 0, 1, "7");

const INCOMPLETE = withCell(SOLVED, 0, 0, ".");
const HELD_OUT = withCell(SOLVED, 0, 5, ".");

/** Nine digits, each alone in its row, column, and sub-box. */
const SPARSE = [
  ["1", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", "2", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", "3", ".", "."],
  [".", "4", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", "5", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", "6", "."],
  [".", ".", "7", ".", ".", ".", ".", ".", "."],
  [".", ".", ".", ".", ".", "8", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", "9"],
];

const ROW_ONLY = withCell(withCell(EMPTY, 0, 0, "1"), 0, 8, "1");
const COLUMN_ONLY = withCell(withCell(EMPTY, 0, 0, "1"), 8, 0, "1");
const BOX_ONLY = withCell(withCell(EMPTY, 0, 0, "1"), 1, 1, "1");

export const validSudoku = {
  slug: "valid-sudoku",
  number: 36,
  title: "Valid Sudoku",
  difficulty: "medium",
  tags: ["array", "hash-table", "matrix", "neetcode-150"],
  statement: [
    "Determine whether a `9 x 9` Sudoku board is valid. Only the filled cells are checked, against three rules:",
    "",
    "- Each row holds the digits `1-9` without repetition.",
    "- Each column holds the digits `1-9` without repetition.",
    "- Each of the nine `3 x 3` sub-boxes holds the digits `1-9` without repetition.",
    "",
    "A board may be valid without being solvable. `'.'` marks an empty cell and is always allowed.",
  ].join("\n"),
  examples: [
    {
      args: [OFFICIAL_PARTIAL],
      output: "true",
      explanation:
        "No digit repeats in any row, column, or sub-box, so the filled part of the board is valid.",
    },
    {
      args: [OFFICIAL_INVALID],
      output: "false",
      explanation:
        "The top-left sub-box holds `8` twice, so the board is invalid even though the rest is untouched.",
    },
  ],
  constraints: [
    "`board.length == 9`",
    "`board[i].length == 9`",
    "`board[i][j]` is a digit `1-9` or `'.'`.",
  ],
  testcases: [
    {
      args: [OFFICIAL_PARTIAL],
      expected: "true",
      note: "A partially filled board with no repetition anywhere.",
    },
    {
      args: [OFFICIAL_INVALID],
      expected: "false",
      note: "Two `8`s in the top-left sub-box make it invalid.",
    },
    { args: [SOLVED], expected: "true", hidden: true, note: "a completely solved board" },
    { args: [EMPTY], expected: "true", hidden: true, note: "no filled cells at all" },
    { args: [SINGLE], expected: "true", hidden: true, note: "exactly one filled cell" },
    {
      args: [SPARSE],
      expected: "true",
      hidden: true,
      note: "nine digits, each alone in its row, column, and box",
    },
    {
      args: [INCOMPLETE],
      expected: "true",
      hidden: true,
      note: "a solved board with one cell cleared",
    },
    {
      args: [HELD_OUT],
      expected: "true",
      hidden: true,
      note: "a solved board with a different single cell cleared",
    },
    {
      args: [ROW_ONLY],
      expected: "false",
      hidden: true,
      note: "two `1`s in one row — the row rule alone is broken",
    },
    {
      args: [COLUMN_ONLY],
      expected: "false",
      hidden: true,
      note: "two `1`s in one column, in different rows and boxes — the column rule alone",
    },
    {
      args: [BOX_ONLY],
      expected: "false",
      hidden: true,
      note: "two `1`s in one sub-box, in different rows and columns — the box rule alone",
    },
    {
      args: [ROW_CLASH],
      expected: "false",
      hidden: true,
      note: "a solved board with `7` repeated inside row 0",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        `,
  },
  notes: {
    approach:
      "Track what each row, column, and sub-box has already seen while scanning the board once. One integer per group is enough: digit `d` sets bit `d - 1`, so a repeat is a bit that is already set. The sub-box index is `(row // 3, column // 3)`.",
    timeComplexity: "O(1)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "isValidSudoku",
    params: [{ name: "board", kind: "string[][]" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/valid-sudoku/",
  reference: `class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        cols = collections.defaultdict(set)
        rows = collections.defaultdict(set)
        squares = collections.defaultdict(set)  # key = (r /3, c /3)

        for r in range(9):
            for c in range(9):
                if board[r][c] == ".":
                    continue
                if (
                    board[r][c] in rows[r]
                    or board[r][c] in cols[c]
                    or board[r][c] in squares[(r // 3, c // 3)]
                ):
                    return False
                cols[c].add(board[r][c])
                rows[r].add(board[r][c])
                squares[(r // 3, c // 3)].add(board[r][c])

        return True
`,
  rejection: `class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        # Checks rows and columns but never the sub-boxes.
        for index in range(9):
            row = [cell for cell in board[index] if cell != "."]
            column = [board[line][index] for line in range(9) if board[line][index] != "."]
            if len(set(row)) != len(row) or len(set(column)) != len(column):
                return False
        return True
`,
} satisfies AuthoredProblem;
