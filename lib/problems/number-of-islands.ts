import type { AuthoredProblem } from "./authoring";

export const numberOfIslands = {
  slug: "number-of-islands",
  number: 200,
  title: "Number of Islands",
  difficulty: "medium",
  tags: ["array","depth-first-search","breadth-first-search","union-find","matrix","neetcode-150"],
  statement: "Given a rectangular map of land (\"1\") and water (\"0\"), count the separate islands. Land cells belong to the same island when they touch horizontally or vertically; diagonal contact does not connect them. The map is surrounded by water.",
  examples: [
    {
      "args": [
        [
          [
            "1",
            "1",
            "1",
            "1",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "1",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "0",
            "0",
            "0"
          ]
        ]
      ],
      "output": "1",
      "explanation": "The connected land forms one island."
    },
    {
      "args": [
        [
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "1",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "0",
            "1",
            "1"
          ]
        ]
      ],
      "output": "3",
      "explanation": "The upper-left block, the center cell, and the lower-right pair are separate."
    }
  ],
  constraints: [
    "`1 <= grid.length, grid[i].length <= 300`",
    "`grid` is rectangular and every cell is `\"0\"` or `\"1\"`."
  ],
  testcases: [
    {
      "args": [
        [
          [
            "1",
            "1",
            "1",
            "1",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "1",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "0",
            "0",
            "0"
          ]
        ]
      ],
      "expected": "1",
      "note": "The connected land forms one island."
    },
    {
      "args": [
        [
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "1",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "0",
            "1",
            "1"
          ]
        ]
      ],
      "expected": "3",
      "note": "The upper-left block, the center cell, and the lower-right pair are separate."
    },
    {
      "args": [
        [
          [
            "1"
          ]
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "One land cell is one island."
    },
    {
      "args": [
        [
          [
            "0"
          ]
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "Water contributes no islands."
    },
    {
      "args": [
        [
          [
            "1",
            "0",
            "1"
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Water splits the two land cells."
    },
    {
      "args": [
        [
          [
            "1",
            "0"
          ],
          [
            "0",
            "1"
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Diagonal contact does not connect land."
    },
    {
      "args": [
        [
          [
            "0",
            "1"
          ],
          [
            "1",
            "0"
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "The opposite diagonal also contains two islands."
    },
    {
      "args": [
        [
          [
            "1",
            "1",
            "0"
          ],
          [
            "0",
            "1",
            "0"
          ],
          [
            "1",
            "0",
            "1"
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "A bent component plus two isolated cells."
    },
    {
      "args": [
        [
          [
            "1",
            "1",
            "1",
            "0",
            "1",
            "1",
            "1",
            "1"
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "A single water cell divides this row into two islands."
    },
    {
      "args": [
        [
          [
            "1",
            "0",
            "0",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "1"
          ],
          [
            "0",
            "1",
            "0",
            "1"
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Each narrow vertical and bent region is one component."
    },
    {
      "args": [
        [
          [
            "1",
            "1",
            "0",
            "1",
            "0"
          ],
          [
            "0",
            "1",
            "0",
            "1",
            "1"
          ],
          [
            "1",
            "0",
            "0",
            "0",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "1",
            "1"
          ]
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "Four separated components remain in the rectangular map."
    }
  ],
  starterCode: {
    python: `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        
`,
  },
  notes: {
    "approach": "Scan every cell. The first unvisited land cell starts one island; a flood fill marks the whole four-directionally connected component so it is counted only once. Diagonal cells remain separate.",
    "timeComplexity": "O(m * n)",
    "spaceComplexity": "O(m * n)"
  },
  signature: {
    "name": "numIslands",
    "params": [
      {
        "name": "grid",
        "kind": "string[][]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/number-of-islands/",
  reference: `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or not grid[0]:
            return 0

        islands = 0
        visit = set()
        rows, cols = len(grid), len(grid[0])

        def dfs(r, c):
            if (
                r not in range(rows)
                or c not in range(cols)
                or grid[r][c] == "0"
                or (r, c) in visit
            ):
                return

            visit.add((r, c))
            directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
            for dr, dc in directions:
                dfs(r + dr, c + dc)

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1" and (r, c) not in visit:
                    islands += 1
                    dfs(r, c)
        return islands
`,
  rejection: `class Solution:
    def numIslands(self, grid):
        rows, cols = len(grid), len(grid[0])
        seen = set()
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1" and (r, c) not in seen:
                    count += 1
                    stack = [(r, c)]
                    seen.add((r, c))
                    while stack:
                        row, col = stack.pop()
                        for dr in (-1, 0, 1):
                            for dc in (-1, 0, 1):
                                nr, nc = row + dr, col + dc
                                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                                    seen.add((nr, nc))
                                    stack.append((nr, nc))
        return count
`,
} satisfies AuthoredProblem;
