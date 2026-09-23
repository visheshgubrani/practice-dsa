import type { AuthoredProblem } from "./authoring";

export const rottingOranges = {
  slug: "rotting-oranges",
  number: 994,
  title: "Rotting Oranges",
  difficulty: "medium",
  tags: ["array","breadth-first-search","matrix","neetcode-150"],
  statement: "A grid contains empty cells (0), fresh oranges (1), and rotten oranges (2). Each minute, every fresh orange next to a rotten one horizontally or vertically becomes rotten. Return the minutes until none remain, or -1 if some fresh orange can never be reached.",
  examples: [
    {
      "args": [
        [
          [
            2,
            1,
            1
          ],
          [
            1,
            1,
            0
          ],
          [
            0,
            1,
            1
          ]
        ]
      ],
      "output": "4",
      "explanation": "The farthest fresh orange rots after four minutes."
    },
    {
      "args": [
        [
          [
            2,
            1,
            1
          ],
          [
            0,
            1,
            1
          ],
          [
            1,
            0,
            1
          ]
        ]
      ],
      "output": "-1",
      "explanation": "The lower-left orange is isolated from the rotten source."
    }
  ],
  constraints: [
    "`1 <= grid.length, grid[i].length <= 10`",
    "`grid` is rectangular and every cell is `0`, `1`, or `2`."
  ],
  testcases: [
    {
      "args": [
        [
          [
            2,
            1,
            1
          ],
          [
            1,
            1,
            0
          ],
          [
            0,
            1,
            1
          ]
        ]
      ],
      "expected": "4",
      "note": "The farthest fresh orange rots after four minutes."
    },
    {
      "args": [
        [
          [
            2,
            1,
            1
          ],
          [
            0,
            1,
            1
          ],
          [
            1,
            0,
            1
          ]
        ]
      ],
      "expected": "-1",
      "note": "The lower-left orange is isolated from the rotten source."
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
      "note": "An empty cell adds no time."
    },
    {
      "args": [
        [
          [
            2
          ]
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "There are no fresh oranges."
    },
    {
      "args": [
        [
          [
            1
          ]
        ]
      ],
      "expected": "-1",
      "hidden": true,
      "note": "A fresh orange with no source never rots."
    },
    {
      "args": [
        [
          [
            1,
            2
          ]
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "The adjacent fresh orange rots in minute one."
    },
    {
      "args": [
        [
          [
            2,
            1,
            0,
            1
          ]
        ]
      ],
      "expected": "-1",
      "hidden": true,
      "note": "The empty cell blocks the fresh orange at the far end."
    },
    {
      "args": [
        [
          [
            2,
            1,
            1
          ],
          [
            0,
            1,
            1
          ],
          [
            0,
            0,
            1
          ]
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "The single source reaches the farthest cell in four layers."
    },
    {
      "args": [
        [
          [
            2,
            0,
            1
          ],
          [
            0,
            0,
            0
          ],
          [
            1,
            0,
            2
          ]
        ]
      ],
      "expected": "-1",
      "hidden": true,
      "note": "Both fresh oranges are separated from rotten cells by empty cells."
    },
    {
      "args": [
        [
          [
            2,
            1,
            1,
            1
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "One new orange rots each minute in the row."
    },
    {
      "args": [
        [
          [
            2,
            2
          ],
          [
            1,
            1
          ]
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "Both fresh oranges are reached in the same minute."
    }
  ],
  starterCode: { python: `class Solution:
    def orangesRotting(self, grid: list[list[int]]) -> int:
        
` },
  notes: {
    "approach": "Start a breadth-first search from every rotten orange. Processing one queue layer at a time models simultaneous infection; a fresh-orange count determines whether all can be reached.",
    "timeComplexity": "O(m * n)",
    "spaceComplexity": "O(m * n)"
  },
  signature: {
    "name": "orangesRotting",
    "params": [
      {
        "name": "grid",
        "kind": "int[][]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/rotting-oranges/",
  reference: `class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        q = collections.deque()
        fresh = 0
        time = 0

        for r in range(len(grid)):
            for c in range(len(grid[0])):
                if grid[r][c] == 1:
                    fresh += 1
                if grid[r][c] == 2:
                    q.append((r, c))

        directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
        while fresh > 0 and q:
            length = len(q)
            for i in range(length):
                r, c = q.popleft()

                for dr, dc in directions:
                    row, col = r + dr, c + dc
                    # if in bounds and nonrotten, make rotten
                    # and add to q
                    if (
                        row in range(len(grid))
                        and col in range(len(grid[0]))
                        and grid[row][col] == 1
                    ):
                        grid[row][col] = 2
                        q.append((row, col))
                        fresh -= 1
            time += 1
        return time if fresh == 0 else -1
`,
  rejection: `class Solution:
    def orangesRotting(self, grid):
        from collections import deque
        rows, cols = len(grid), len(grid[0])
        q = deque((r,c) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
        minutes = 0
        while q:
            r,c = q.popleft()
            minutes += 1
            for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr,nc = r+dr,c+dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    q.append((nr,nc))
        return minutes if all(cell != 1 for row in grid for cell in row) else -1
`,
} satisfies AuthoredProblem;
