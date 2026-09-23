import type { AuthoredProblem } from "./authoring";

export const pacificAtlanticWaterFlow = {
  slug: "pacific-atlantic-water-flow",
  number: 417,
  title: "Pacific Atlantic Water Flow",
  difficulty: "medium",
  tags: ["array","depth-first-search","breadth-first-search","matrix","neetcode-150"],
  statement: "Each cell has an elevation. Water can move from a cell to a horizontal or vertical neighbor whose elevation is no higher. Return every coordinate from which water can reach both the Pacific (top or left edge) and Atlantic (bottom or right edge). The coordinate pairs stay in row-column order, while the outer list may be in any order.",
  examples: [
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            4,
            3
          ]
        ]
      ],
      "output": "[[0,1],[1,0],[1,1]]",
      "explanation": "These three cells each drain to both oceans."
    },
    {
      "args": [
        [
          [
            1,
            1
          ],
          [
            1,
            1
          ]
        ]
      ],
      "output": "[[0,0],[0,1],[1,0],[1,1]]",
      "explanation": "Every cell on the flat 2-by-2 grid reaches both."
    }
  ],
  constraints: [
    "`1 <= heights.length, heights[i].length <= 200`",
    "`heights` is rectangular and `0 <= heights[r][c] <= 100000`.",
    "Each returned coordinate is `[row, column]`; the answer may list coordinates in any order."
  ],
  testcases: [
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            4,
            3
          ]
        ]
      ],
      "expected": "[[0,1],[1,0],[1,1]]",
      "note": "These three cells each drain to both oceans."
    },
    {
      "args": [
        [
          [
            1,
            1
          ],
          [
            1,
            1
          ]
        ]
      ],
      "expected": "[[0,0],[0,1],[1,0],[1,1]]",
      "note": "Every cell on the flat 2-by-2 grid reaches both."
    },
    {
      "args": [
        [
          [
            1
          ]
        ]
      ],
      "expected": "[[0,0]]",
      "hidden": true,
      "note": "The sole cell touches both oceans."
    },
    {
      "args": [
        [
          [
            1,
            2,
            3,
            4
          ]
        ]
      ],
      "expected": "[[0,0],[0,1],[0,2],[0,3]]",
      "hidden": true,
      "note": "Every cell in one row touches the top and bottom edges."
    },
    {
      "args": [
        [
          [
            4
          ],
          [
            3
          ],
          [
            2
          ],
          [
            1
          ]
        ]
      ],
      "expected": "[[0,0],[1,0],[2,0],[3,0]]",
      "hidden": true,
      "note": "Every cell in one column touches the left and right edges."
    },
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            2,
            1
          ]
        ]
      ],
      "expected": "[[0,1],[1,0]]",
      "hidden": true,
      "note": "The low lower-right cell cannot flow uphill to the Pacific."
    },
    {
      "args": [
        [
          [
            1,
            2,
            1
          ],
          [
            2,
            9,
            2
          ],
          [
            1,
            2,
            1
          ]
        ]
      ],
      "expected": "[[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1]]",
      "hidden": true,
      "note": "The high center drains to the four edge-middle cells; low corners cannot flow uphill."
    },
    {
      "args": [
        [
          [
            3,
            3,
            3
          ],
          [
            3,
            1,
            3
          ],
          [
            3,
            3,
            3
          ]
        ]
      ],
      "expected": "[[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]]",
      "hidden": true,
      "note": "The low center is trapped while the equal-height border connects around it."
    },
    {
      "args": [
        [
          [
            1,
            1,
            1
          ],
          [
            1,
            1,
            1
          ],
          [
            1,
            1,
            1
          ]
        ]
      ],
      "expected": "[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]",
      "hidden": true,
      "note": "Every cell can flow across the flat grid to each ocean."
    },
    {
      "args": [
        [
          [
            1,
            2,
            2
          ],
          [
            3,
            2,
            3
          ],
          [
            2,
            4,
            5
          ]
        ]
      ],
      "expected": "[[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]",
      "hidden": true,
      "note": "Only cells with a non-increasing route to both boundaries qualify."
    },
    {
      "args": [
        [
          [
            2,
            1
          ],
          [
            1,
            2
          ]
        ]
      ],
      "expected": "[[0,0],[0,1],[1,0],[1,1]]",
      "hidden": true,
      "note": "The high corners flow down to low neighbors that reach the opposite ocean."
    }
  ],
  starterCode: { python: `class Solution:
    def pacificAtlantic(self, heights: list[list[int]]) -> list[list[int]]:
        
` },
  notes: {
    "approach": "Walk inward from each ocean border using the reversed flow rule: a neighbor is reachable when it is at least as high as the current cell. The intersection of the two reachable sets is the answer.",
    "timeComplexity": "O(m * n)",
    "spaceComplexity": "O(m * n)"
  },
  signature: {
    "name": "pacificAtlantic",
    "params": [
      {
        "name": "heights",
        "kind": "int[][]"
      }
    ],
    "returns": "int[][]"
  },
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/pacific-atlantic-water-flow/",
  reference: `class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        ROWS, COLS = len(heights), len(heights[0])
        pac, atl = set(), set()

        def dfs(r, c, visit, prevHeight):
            if (
                (r, c) in visit
                or r < 0
                or c < 0
                or r == ROWS
                or c == COLS
                or heights[r][c] < prevHeight
            ):
                return
            visit.add((r, c))
            dfs(r + 1, c, visit, heights[r][c])
            dfs(r - 1, c, visit, heights[r][c])
            dfs(r, c + 1, visit, heights[r][c])
            dfs(r, c - 1, visit, heights[r][c])

        for c in range(COLS):
            dfs(0, c, pac, heights[0][c])
            dfs(ROWS - 1, c, atl, heights[ROWS - 1][c])

        for r in range(ROWS):
            dfs(r, 0, pac, heights[r][0])
            dfs(r, COLS - 1, atl, heights[r][COLS - 1])

        res = []
        for r in range(ROWS):
            for c in range(COLS):
                if (r, c) in pac and (r, c) in atl:
                    res.append([r, c])
        return res
`,
  rejection: `class Solution:
    def pacificAtlantic(self, heights):
        rows, cols = len(heights), len(heights[0])
        return [[r, c] for r in range(rows) for c in range(cols) if r == 0 or c == 0 or r == rows - 1 or c == cols - 1]
`,
} satisfies AuthoredProblem;
