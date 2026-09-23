import type { AuthoredProblem } from "./authoring";

export const swimInRisingWater = {
  slug: "swim-in-rising-water",
  number: 778,
  title: "Swim in Rising Water",
  difficulty: "hard",
  tags: ["array","binary-search","depth-first-search","breadth-first-search","union-find","minimax-algorithm","heap-priority-queue","matrix","dijkstra","neetcode-150"],
  statement: "A square grid gives each cell’s elevation. At time t, you may enter cells with elevation at most t, moving horizontally or vertically. Return the smallest t that allows a path from the top-left to the bottom-right.",
  examples: [
    {
      "args": [
        [
          [
            0,
            2
          ],
          [
            1,
            3
          ]
        ]
      ],
      "output": "3",
      "explanation": "Every path must enter the destination at elevation three."
    },
    {
      "args": [
        [
          [
            0,
            1,
            2,
            3,
            4
          ],
          [
            24,
            23,
            22,
            21,
            5
          ],
          [
            12,
            13,
            14,
            15,
            16
          ],
          [
            11,
            17,
            18,
            19,
            20
          ],
          [
            10,
            9,
            8,
            7,
            6
          ]
        ]
      ],
      "output": "16",
      "explanation": "The outside route reaches the destination with maximum elevation 16."
    }
  ],
  constraints: [
    "`1 <= grid.length == grid[i].length <= 50`",
    "Every cell has a distinct integer elevation from 0 through `n² - 1`."
  ],
  testcases: [
    {
      "args": [
        [
          [
            0,
            2
          ],
          [
            1,
            3
          ]
        ]
      ],
      "expected": "3",
      "note": "Every path must enter the destination at elevation three."
    },
    {
      "args": [
        [
          [
            0,
            1,
            2,
            3,
            4
          ],
          [
            24,
            23,
            22,
            21,
            5
          ],
          [
            12,
            13,
            14,
            15,
            16
          ],
          [
            11,
            17,
            18,
            19,
            20
          ],
          [
            10,
            9,
            8,
            7,
            6
          ]
        ]
      ],
      "expected": "16",
      "note": "The outside route reaches the destination with maximum elevation 16."
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
      "note": "The start is also the destination."
    },
    {
      "args": [
        [
          [
            0,
            1
          ],
          [
            2,
            3
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The destination elevation sets the required time."
    },
    {
      "args": [
        [
          [
            0,
            3
          ],
          [
            1,
            2
          ]
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "The route down and right avoids elevation three."
    },
    {
      "args": [
        [
          [
            3,
            0
          ],
          [
            2,
            1
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The starting cell already requires time three."
    },
    {
      "args": [
        [
          [
            0,
            1,
            2
          ],
          [
            7,
            8,
            3
          ],
          [
            6,
            5,
            4
          ]
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "The top and right corridor reaches the target with maximum four."
    },
    {
      "args": [
        [
          [
            0,
            8,
            7
          ],
          [
            1,
            2,
            6
          ],
          [
            3,
            4,
            5
          ]
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "A lower route avoids the elevation-eight cell."
    },
    {
      "args": [
        [
          [
            0,
            1,
            2,
            3
          ],
          [
            11,
            10,
            9,
            4
          ],
          [
            12,
            13,
            8,
            5
          ],
          [
            15,
            14,
            7,
            6
          ]
        ]
      ],
      "expected": "6",
      "hidden": true,
      "note": "The winding route reaches the bottom-right cell at elevation six."
    },
    {
      "args": [
        [
          [
            0,
            5,
            6
          ],
          [
            1,
            4,
            7
          ],
          [
            2,
            3,
            8
          ]
        ]
      ],
      "expected": "8",
      "hidden": true,
      "note": "The destination elevation is eight, so no route can arrive earlier."
    },
    {
      "args": [
        [
          [
            0,
            1,
            8,
            9
          ],
          [
            3,
            2,
            7,
            10
          ],
          [
            4,
            5,
            6,
            11
          ],
          [
            15,
            14,
            13,
            12
          ]
        ]
      ],
      "expected": "12",
      "hidden": true,
      "note": "A route to the target stays at or below elevation twelve."
    }
  ],
  starterCode: { python: `class Solution:
    def swimInWater(self, grid: list[list[int]]) -> int:
        
` },
  notes: {
    "approach": "Treat a route’s cost as its highest elevation. A priority-first traversal expands the partial route with the smallest current maximum until it reaches the destination.",
    "timeComplexity": "O(n² log n)",
    "spaceComplexity": "O(n²)"
  },
  signature: {
    "name": "swimInWater",
    "params": [
      {
        "name": "grid",
        "kind": "int[][]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/swim-in-rising-water/",
  reference: `class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        N = len(grid)
        visit = set()
        minH = [[grid[0][0], 0, 0]]  # (time/max-height, r, c)
        directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

        visit.add((0, 0))
        while minH:
            t, r, c = heapq.heappop(minH)
            if r == N - 1 and c == N - 1:
                return t
            for dr, dc in directions:
                neiR, neiC = r + dr, c + dc
                if (
                    neiR < 0
                    or neiC < 0
                    or neiR == N
                    or neiC == N
                    or (neiR, neiC) in visit
                ):
                    continue
                visit.add((neiR, neiC))
                heapq.heappush(minH, [max(t, grid[neiR][neiC]), neiR, neiC])
`,
  rejection: `class Solution:
    def swimInWater(self, grid):
        return max(max(row) for row in grid)
`,
} satisfies AuthoredProblem;
