import type { AuthoredProblem } from "./authoring";

export const maxAreaOfIsland = {
  slug: "max-area-of-island",
  number: 695,
  title: "Max Area of Island",
  difficulty: "medium",
  tags: ["array","depth-first-search","breadth-first-search","union-find","matrix","neetcode-150"],
  statement: "In a rectangular grid of land (1) and water (0), return the number of cells in the largest island. Only horizontal and vertical neighbors connect. Return 0 when the grid contains no land.",
  examples: [
    {
      "args": [
        [
          [
            0,
            0,
            0,
            0
          ],
          [
            0,
            1,
            1,
            0
          ],
          [
            0,
            0,
            1,
            0
          ]
        ]
      ],
      "output": "3",
      "explanation": "The three touching land cells make the largest island."
    },
    {
      "args": [
        [
          [
            0,
            0,
            0
          ],
          [
            0,
            0,
            0
          ]
        ]
      ],
      "output": "0",
      "explanation": "There is no land to count."
    }
  ],
  constraints: [
    "`1 <= grid.length, grid[i].length <= 50`",
    "`grid` is rectangular and every cell is `0` or `1`."
  ],
  testcases: [
    {
      "args": [
        [
          [
            0,
            0,
            0,
            0
          ],
          [
            0,
            1,
            1,
            0
          ],
          [
            0,
            0,
            1,
            0
          ]
        ]
      ],
      "expected": "3",
      "note": "The three touching land cells make the largest island."
    },
    {
      "args": [
        [
          [
            0,
            0,
            0
          ],
          [
            0,
            0,
            0
          ]
        ]
      ],
      "expected": "0",
      "note": "There is no land to count."
    },
    {
      "args": [
        [
          [
            1
          ]
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "The lone land cell has area one."
    },
    {
      "args": [
        [
          [
            0
          ]
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "The lone water cell has area zero."
    },
    {
      "args": [
        [
          [
            1,
            1,
            0,
            1,
            1,
            1
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The right-hand run is larger than the left-hand pair."
    },
    {
      "args": [
        [
          [
            1
          ],
          [
            1
          ],
          [
            0
          ],
          [
            1
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "The two top cells connect vertically."
    },
    {
      "args": [
        [
          [
            1,
            0
          ],
          [
            0,
            1
          ]
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "Diagonal land cells are separate."
    },
    {
      "args": [
        [
          [
            0,
            1,
            0
          ],
          [
            1,
            1,
            1
          ],
          [
            0,
            1,
            0
          ]
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "The center and its four neighbors form one component."
    },
    {
      "args": [
        [
          [
            1,
            1,
            0,
            0
          ],
          [
            1,
            0,
            1,
            1
          ],
          [
            0,
            0,
            1,
            1
          ]
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "The right-hand 2-by-2 component is larger."
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
      "expected": "9",
      "hidden": true,
      "note": "Every cell belongs to one full 3-by-3 island."
    },
    {
      "args": [
        [
          [
            1,
            1,
            1,
            0,
            0
          ],
          [
            1,
            0,
            1,
            0,
            1
          ],
          [
            1,
            1,
            1,
            0,
            1
          ],
          [
            0,
            0,
            0,
            0,
            1
          ],
          [
            1,
            1,
            0,
            1,
            1
          ]
        ]
      ],
      "expected": "8",
      "hidden": true,
      "note": "The upper-left component contains eight cells."
    }
  ],
  starterCode: {
    python: `class Solution:
    def maxAreaOfIsland(self, grid: list[list[int]]) -> int:
        
`,
  },
  notes: {
    "approach": "Visit each land component once and count its cells during a flood fill. Keep the largest component size seen; if no fill starts, the answer stays zero.",
    "timeComplexity": "O(m * n)",
    "spaceComplexity": "O(m * n)"
  },
  signature: {
    "name": "maxAreaOfIsland",
    "params": [
      {
        "name": "grid",
        "kind": "int[][]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/max-area-of-island/",
  reference: `class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        ROWS, COLS = len(grid), len(grid[0])
        visit = set()

        def dfs(r, c):
            if (
                r < 0
                or r == ROWS
                or c < 0
                or c == COLS
                or grid[r][c] == 0
                or (r, c) in visit
            ):
                return 0
            visit.add((r, c))
            return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)

        area = 0
        for r in range(ROWS):
            for c in range(COLS):
                area = max(area, dfs(r, c))
        return area
`,
  rejection: `class Solution:
    def maxAreaOfIsland(self, grid):
        rows, cols = len(grid), len(grid[0])
        seen = set()
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1 or (r, c) in seen:
                    continue
                stack = [(r, c)]
                seen.add((r, c))
                area = 0
                while stack:
                    row, col = stack.pop()
                    area += 1
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                        nr, nc = row + dr, col + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1 and (nr, nc) not in seen:
                            seen.add((nr, nc))
                            stack.append((nr, nc))
                best = max(best, area)
        return best
`,
} satisfies AuthoredProblem;
