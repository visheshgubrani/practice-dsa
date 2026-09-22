import type { AuthoredProblem } from "./authoring";

export const spiralMatrix = {
  slug: "spiral-matrix",
  number: 54,
  title: "Spiral Matrix",
  difficulty: "medium",
  tags: ["array", "matrix", "simulation", "neetcode-150"],
  statement: [
    "Return every element of the `m x n` matrix in clockwise spiral order, starting at the top-left corner: right along the top row, down the right column, left along the bottom row, up the left column, then inward and around again.",
    "",
    "The order is the answer, so the same values in any other order are wrong.",
  ].join("\n"),
  examples: [
    {
      args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
      output: "[1,2,3,6,9,8,7,4,5]",
      explanation:
        "The outer ring is read clockwise, then the single centre value `5` is last.",
    },
    {
      args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]],
      output: "[1,2,3,4,8,12,11,10,9,5,6,7]",
      explanation:
        "Three rows and four columns leave an inner `6, 7` to read left to right after the outer ring.",
    },
  ],
  constraints: [
    "`m == matrix.length` and `n == matrix[i].length`",
    "`1 <= m, n <= 10`",
    "`-100 <= matrix[i][j] <= 100`",
    "Every row has the same length.",
  ],
  testcases: [
    {
      args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
      expected: "[1,2,3,6,9,8,7,4,5]",
      note: "An odd square: the centre is read last, on its own.",
    },
    {
      args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]],
      expected: "[1,2,3,4,8,12,11,10,9,5,6,7]",
      note: "A wide matrix whose inner row is read left to right.",
    },
    {
      args: [[[7]]],
      expected: "[7]",
      hidden: true,
      note: "a single cell is its own spiral",
    },
    {
      args: [[[1, 2]]],
      expected: "[1,2]",
      hidden: true,
      note: "a single row is read left to right with no ring to close",
    },
    {
      args: [[[1], [2]]],
      expected: "[1,2]",
      hidden: true,
      note: "a single column is read downwards",
    },
    {
      args: [[[1, 2], [3, 4]]],
      expected: "[1,2,4,3]",
      hidden: true,
      note: "a 2x2 matrix: the top row, then the right column, then back",
    },
    {
      args: [[[1, 2, 3], [4, 5, 6]]],
      expected: "[1,2,3,6,5,4]",
      hidden: true,
      note: "two rows: the bottom row must be read right to left and then stop",
    },
    {
      args: [[[1, 2], [3, 4], [5, 6]]],
      expected: "[1,2,4,6,5,3]",
      hidden: true,
      note: "two columns: the left column is read upwards at the end",
    },
    {
      args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]],
      expected: "[1,2,3,4,8,12,16,15,14,13,9,5,6,7,11,10]",
      hidden: true,
      note: "an even square, so the innermost step is a 2x2 ring",
    },
    {
      args: [[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]]],
      expected: "[1,2,3,4,5,10,15,20,25,24,23,22,21,16,11,6,7,8,9,14,19,18,17,12,13]",
      hidden: true,
      note: "five rings with a single centre value",
    },
    {
      args: [[[-1, -2, -3]]],
      expected: "[-1,-2,-3]",
      hidden: true,
      note: "negative values must survive in order",
    },
    {
      args: [[[1, 2, 3, 4, 5]]],
      expected: "[1,2,3,4,5]",
      hidden: true,
      note: "the widest single row the authored suite uses",
    },
  ],
  starterCode: {
    python: `class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Keep four boundaries — left, right, top, bottom — and after reading a side, move that boundary inward. The subtlety is the inner test: when the remaining shape is a single row or a single column, the third and fourth passes would re-read values that the first two already took, so the loop has to stop early in exactly that case. A visited-grid simulation gives the same order without the special case, at the cost of an extra `m x n` grid.",
    timeComplexity: "O(m * n)",
    spaceComplexity: "O(m * n) for the returned list, no other storage",
  },
  signature: {
    name: "spiralOrder",
    params: [{ name: "matrix", kind: "int[][]" }],
    returns: "int[]",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/spiral-matrix/",
  reference: `class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        res = []
        left, right = 0, len(matrix[0])
        top, bottom = 0, len(matrix)

        while left < right and top < bottom:
            # get every i in the top row
            for i in range(left, right):
                res.append(matrix[top][i])
            top += 1
            # get every i in the right col
            for i in range(top, bottom):
                res.append(matrix[i][right - 1])
            right -= 1
            if not (left < right and top < bottom):
                break
            # get every i in the bottom row
            for i in range(right - 1, left - 1, -1):
                res.append(matrix[bottom - 1][i])
            bottom -= 1
            # get every i in the left col
            for i in range(bottom - 1, top - 1, -1):
                res.append(matrix[i][left])
            left += 1

        return res
`,
  rejection: `class Solution:
    def spiralOrder(self, matrix):
        # The bottom edge never moves inward, so the last row is read twice and
        # the inner rings are misaligned.
        res = []
        left, right = 0, len(matrix[0])
        top, bottom = 0, len(matrix)

        while left < right and top < bottom:
            for i in range(left, right):
                res.append(matrix[top][i])
            top += 1
            for i in range(top, bottom):
                res.append(matrix[i][right - 1])
            right -= 1
            for i in range(right - 1, left - 1, -1):
                res.append(matrix[bottom - 1][i])
            for i in range(bottom - 1, top - 1, -1):
                res.append(matrix[i][left])
            left += 1

        return res
`,
} satisfies AuthoredProblem;
