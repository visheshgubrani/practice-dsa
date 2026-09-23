import type { AuthoredProblem } from "./authoring";

export const minCostToConnectAllPoints = {
  slug: "min-cost-to-connect-all-points",
  number: 1584,
  title: "Min Cost to Connect All Points",
  difficulty: "medium",
  tags: ["array","union-find","graph","minimum-spanning-tree","prims-algorithm","kruskals-algorithm","boruvkas-algorithm","neetcode-150"],
  statement: "Connect every point so that each pair is linked by a path. An edge between `[x1,y1]` and `[x2,y2]` costs `|x1-x2| + |y1-y2|`. Return the smallest possible total edge cost.",
  examples: [
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            2,
            2
          ],
          [
            3,
            10
          ],
          [
            5,
            2
          ],
          [
            7,
            0
          ]
        ]
      ],
      "output": "20",
      "explanation": "A minimum spanning tree connects the five points for total cost 20."
    },
    {
      "args": [
        [
          [
            3,
            12
          ],
          [
            -2,
            5
          ],
          [
            -4,
            1
          ]
        ]
      ],
      "output": "18",
      "explanation": "The two cheapest links connect all three points for total cost 18."
    }
  ],
  constraints: [
    "`1 <= points.length <= 1000`",
    "Coordinates are integers from -1000000 through 1000000.",
    "All points are distinct."
  ],
  testcases: [
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            2,
            2
          ],
          [
            3,
            10
          ],
          [
            5,
            2
          ],
          [
            7,
            0
          ]
        ]
      ],
      "expected": "20",
      "note": "A minimum spanning tree connects the five points for total cost 20."
    },
    {
      "args": [
        [
          [
            3,
            12
          ],
          [
            -2,
            5
          ],
          [
            -4,
            1
          ]
        ]
      ],
      "expected": "18",
      "note": "The two cheapest links connect all three points for total cost 18."
    },
    {
      "args": [
        [
          [
            0,
            0
          ]
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "A single point needs no edge."
    },
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            3,
            4
          ]
        ]
      ],
      "expected": "7",
      "hidden": true,
      "note": "The only link has Manhattan distance seven."
    },
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            3,
            0
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "Three unit links connect the collinear points."
    },
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ]
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "Three sides of the unit square make a minimum tree."
    },
    {
      "args": [
        [
          [
            -1,
            -1
          ],
          [
            1,
            1
          ],
          [
            2,
            2
          ]
        ]
      ],
      "expected": "6",
      "hidden": true,
      "note": "The best links cost four and two."
    },
    {
      "args": [
        [
          [
            1,
            1
          ],
          [
            3,
            4
          ],
          [
            5,
            2
          ],
          [
            -1,
            0
          ]
        ]
      ],
      "expected": "12",
      "hidden": true,
      "note": "The minimum links cost three, four, and five."
    },
    {
      "args": [
        [
          [
            -3,
            0
          ],
          [
            0,
            0
          ],
          [
            0,
            4
          ]
        ]
      ],
      "expected": "7",
      "hidden": true,
      "note": "The horizontal and vertical links cost three and four."
    },
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            2,
            0
          ],
          [
            0,
            2
          ],
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
      "expected": "8",
      "hidden": true,
      "note": "The square needs three side links and one link from its center."
    },
    {
      "args": [
        [
          [
            -2,
            3
          ],
          [
            4,
            1
          ],
          [
            0,
            -1
          ]
        ]
      ],
      "expected": "12",
      "hidden": true,
      "note": "The minimum links each cost six."
    }
  ],
  starterCode: { python: `class Solution:
    def minCostConnectPoints(self, points: list[list[int]]) -> int:
        
` },
  notes: {
    "approach": "The required links form a minimum spanning tree. Repeatedly connect an unconnected point with the cheapest Manhattan-distance edge from the connected set.",
    "timeComplexity": "O(n²)",
    "spaceComplexity": "O(n²) for the reference adjacency graph"
  },
  signature: {
    "name": "minCostConnectPoints",
    "params": [
      {
        "name": "points",
        "kind": "int[][]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/min-cost-to-connect-all-points/",
  reference: `class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        N = len(points)
        adj = {i: [] for i in range(N)}  # i : list of [cost, node]
        for i in range(N):
            x1, y1 = points[i]
            for j in range(i + 1, N):
                x2, y2 = points[j]
                dist = abs(x1 - x2) + abs(y1 - y2)
                adj[i].append([dist, j])
                adj[j].append([dist, i])

        # Prim's
        res = 0
        visit = set()
        minH = [[0, 0]]  # [cost, point]
        while len(visit) < N:
            cost, i = heapq.heappop(minH)
            if i in visit:
                continue
            res += cost
            visit.add(i)
            for neiCost, nei in adj[i]:
                if nei not in visit:
                    heapq.heappush(minH, [neiCost, nei])
        return res
`,
  rejection: `class Solution:
    def minCostConnectPoints(self, points):
        return sum(abs(points[i][0]-points[i-1][0])+abs(points[i][1]-points[i-1][1]) for i in range(1,len(points)))
`,
} satisfies AuthoredProblem;
