import type { AuthoredProblem } from "./authoring";

export const searchA2dMatrix = {
  slug: "search-a-2d-matrix",
  number: 74,
  title: "Search a 2D Matrix",
  difficulty: "medium",
  tags: ["array", "binary-search", "matrix", "neetcode-150"],
  statement: [
    "`matrix` has two properties: every row is sorted left to right, and the first value of each row is greater than the last value of the row above.",
    "",
    "Return `true` when `target` appears in the matrix. The solution must run in `O(log(m * n))`.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        3,
      ],
      output: "true",
      explanation: "`3` is in the first row, which spans `1` to `7`.",
    },
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        13,
      ],
      output: "false",
      explanation: "`13` falls between the first row's last value and the second row's first.",
    },
  ],
  constraints: [
    "`m == matrix.length`",
    "`n == matrix[i].length`",
    "`1 <= m, n <= 100`",
    "`-10⁴ <= matrix[i][j], target <= 10⁴`",
  ],
  testcases: [
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        3,
      ],
      expected: "true",
      note: "The target is in the first row.",
    },
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        13,
      ],
      expected: "false",
      note: "The target falls in the gap between two rows.",
    },
    { args: [[[1]], 1], expected: "true", hidden: true, note: "a single cell that matches" },
    { args: [[[1]], 0], expected: "false", hidden: true, note: "a single cell that does not" },
    { args: [[[1, 3], [5, 7]], 3], expected: "true", hidden: true, note: "a 2x2 matrix" },
    {
      args: [[[1, 3], [5, 7]], 4],
      expected: "false",
      hidden: true,
      note: "a value that fits no row",
    },
    { args: [[[1], [3], [5]], 5], expected: "true", hidden: true, note: "a single column" },
    { args: [[[1, 2, 3]], 2], expected: "true", hidden: true, note: "a single row" },
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        60,
      ],
      expected: "true",
      hidden: true,
      note: "the last cell of the matrix",
    },
    {
      args: [
        [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        23,
      ],
      expected: "true",
      hidden: true,
      note: "the first cell of a later row",
    },
    { args: [[[-10000]], -10000], expected: "true", hidden: true, note: "constraint-minimum value" },
    {
      args: [[[1, 2], [3, 5]], 6],
      expected: "false",
      hidden: true,
      note: "greater than every value in the matrix",
    },
  ],
  starterCode: {
    python: `class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        `,
  },
  notes: {
    approach:
      "Two binary searches rather than one: the first picks the row whose range could contain the target, using each row's last value as the boundary; the second searches inside that row. Because the first value of a row is greater than the last value of the row above, the rows themselves are ordered, which is what makes the first search valid.",
    timeComplexity: "O(log m + log n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "searchMatrix",
    params: [
      { name: "matrix", kind: "int[][]" },
      { name: "target", kind: "int" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/search-a-2d-matrix/",
  reference: `class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        ROWS, COLS = len(matrix), len(matrix[0])

        top, bot = 0, ROWS - 1
        while top <= bot:
            row = (top + bot) // 2
            if target > matrix[row][-1]:
                top = row + 1
            elif target < matrix[row][0]:
                bot = row - 1
            else:
                break

        if not (top <= bot):
            return False
        row = (top + bot) // 2
        l, r = 0, COLS - 1
        while l <= r:
            m = (l + r) // 2
            if target > matrix[row][m]:
                l = m + 1
            elif target < matrix[row][m]:
                r = m - 1
            else:
                return True
        return False
`,
  rejection: `class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        # Picks the row by its first value and then only checks that first value,
        # never searching inside the row.
        row = 0
        for index, values in enumerate(matrix):
            if values[0] <= target:
                row = index
        return matrix[row][0] == target
`,
} satisfies AuthoredProblem;
