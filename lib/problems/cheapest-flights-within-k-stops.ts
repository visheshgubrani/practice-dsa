import type { AuthoredProblem } from "./authoring";

export const cheapestFlightsWithinKStops = {
  slug: "cheapest-flights-within-k-stops",
  number: 787,
  title: "Cheapest Flights Within K Stops",
  difficulty: "medium",
  tags: ["dynamic-programming","depth-first-search","breadth-first-search","graph","heap-priority-queue","shortest-path","neetcode-150"],
  statement: "Each flight `[from, to, price]` is a one-way ticket. Return the minimum cost from `src` to `dst` using at most `k` intermediate stops, or -1 if no such route exists. At most `k + 1` flights may be used.",
  examples: [
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            2,
            0,
            100
          ],
          [
            1,
            3,
            600
          ],
          [
            2,
            3,
            200
          ]
        ],
        0,
        3,
        1
      ],
      "output": "700",
      "explanation": "One stop permits the route costing 100 + 600."
    },
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            2,
            0,
            100
          ],
          [
            1,
            3,
            600
          ],
          [
            2,
            3,
            200
          ]
        ],
        0,
        3,
        2
      ],
      "output": "400",
      "explanation": "Two stops permit the cheaper route through cities 1 and 2."
    }
  ],
  constraints: [
    "`2 <= n <= 100`",
    "Flights have valid distinct cities and prices from 1 through 10000; there is at most one flight per ordered pair.",
    "`0 <= src, dst, k < n` and `src != dst`."
  ],
  testcases: [
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            2,
            0,
            100
          ],
          [
            1,
            3,
            600
          ],
          [
            2,
            3,
            200
          ]
        ],
        0,
        3,
        1
      ],
      "expected": "700",
      "note": "One stop permits the route costing 100 + 600."
    },
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            2,
            0,
            100
          ],
          [
            1,
            3,
            600
          ],
          [
            2,
            3,
            200
          ]
        ],
        0,
        3,
        2
      ],
      "expected": "400",
      "note": "Two stops permit the cheaper route through cities 1 and 2."
    },
    {
      "args": [
        2,
        [],
        0,
        1,
        0
      ],
      "expected": "-1",
      "hidden": true,
      "note": "No flight connects the cities."
    },
    {
      "args": [
        2,
        [
          [
            0,
            1,
            35
          ]
        ],
        0,
        1,
        0
      ],
      "expected": "35",
      "hidden": true,
      "note": "A direct flight is allowed with zero stops."
    },
    {
      "args": [
        3,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ]
        ],
        0,
        2,
        0
      ],
      "expected": "-1",
      "hidden": true,
      "note": "The only route needs one stop, over the limit."
    },
    {
      "args": [
        3,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ]
        ],
        0,
        2,
        1
      ],
      "expected": "200",
      "hidden": true,
      "note": "One stop permits the two-flight route."
    },
    {
      "args": [
        3,
        [
          [
            0,
            1,
            1
          ],
          [
            1,
            2,
            1
          ],
          [
            0,
            2,
            10
          ]
        ],
        0,
        2,
        0
      ],
      "expected": "10",
      "hidden": true,
      "note": "With no stops, the direct flight is the only option."
    },
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            0,
            2,
            500
          ],
          [
            2,
            3,
            100
          ]
        ],
        0,
        3,
        1
      ],
      "expected": "600",
      "hidden": true,
      "note": "The direct 0-to-2 flight fits one stop, while the cheaper chain does not."
    },
    {
      "args": [
        4,
        [
          [
            0,
            1,
            100
          ],
          [
            1,
            2,
            100
          ],
          [
            0,
            2,
            500
          ],
          [
            2,
            3,
            100
          ]
        ],
        0,
        3,
        2
      ],
      "expected": "300",
      "hidden": true,
      "note": "Two stops allow three flights totaling 300."
    },
    {
      "args": [
        4,
        [
          [
            0,
            1,
            50
          ],
          [
            1,
            2,
            50
          ],
          [
            0,
            2,
            120
          ],
          [
            2,
            3,
            20
          ]
        ],
        0,
        3,
        1
      ],
      "expected": "140",
      "hidden": true,
      "note": "The best allowed route uses the direct 0-to-2 flight."
    },
    {
      "args": [
        5,
        [
          [
            0,
            1,
            5
          ],
          [
            1,
            2,
            5
          ],
          [
            2,
            3,
            5
          ],
          [
            3,
            4,
            5
          ],
          [
            0,
            4,
            30
          ]
        ],
        0,
        4,
        1
      ],
      "expected": "30",
      "hidden": true,
      "note": "The cheap chain needs three stops, so only the direct flight fits."
    }
  ],
  starterCode: { python: `class Solution:
    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
        
` },
  notes: {
    "approach": "Relax prices for at most k + 1 rounds, each allowing one more flight. Copying the previous round’s prices prevents a round from silently using multiple new edges.",
    "timeComplexity": "O((k + 1) * E)",
    "spaceComplexity": "O(V)"
  },
  signature: {
    "name": "findCheapestPrice",
    "params": [
      {
        "name": "n",
        "kind": "int"
      },
      {
        "name": "flights",
        "kind": "int[][]"
      },
      {
        "name": "src",
        "kind": "int"
      },
      {
        "name": "dst",
        "kind": "int"
      },
      {
        "name": "k",
        "kind": "int"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/cheapest-flights-within-k-stops/",
  reference: `class Solution:
    def findCheapestPrice(
        self, n: int, flights: List[List[int]], src: int, dst: int, k: int
    ) -> int:
        prices = [float("inf")] * n
        prices[src] = 0

        for i in range(k + 1):
            tmpPrices = prices.copy()

            for s, d, p in flights:  # s=source, d=dest, p=price
                if prices[s] == float("inf"):
                    continue
                if prices[s] + p < tmpPrices[d]:
                    tmpPrices[d] = prices[s] + p
            prices = tmpPrices
        return -1 if prices[dst] == float("inf") else prices[dst]
`,
  rejection: `class Solution:
    def findCheapestPrice(self, n, flights, src, dst, k):
        import heapq
        graph=[[] for _ in range(n)]
        for a,b,c in flights: graph[a].append((b,c))
        heap=[(0,src)]
        while heap:
            cost,node=heapq.heappop(heap)
            if node==dst: return cost
            for nxt,price in graph[node]: heapq.heappush(heap,(cost+price,nxt))
        return -1
`,
} satisfies AuthoredProblem;
