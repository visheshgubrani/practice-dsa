import type { AuthoredProblem } from "./authoring";

export const networkDelayTime = {
  slug: "network-delay-time",
  number: 743,
  title: "Network Delay Time",
  difficulty: "medium",
  tags: ["depth-first-search","breadth-first-search","graph","heap-priority-queue","shortest-path","dijkstra","neetcode-150"],
  statement: "A directed edge `[u,v,w]` means a signal takes `w` time units to travel from u to v. Starting at node `k`, return the earliest time when every node from 1 through n has received the signal, or -1 if any node is unreachable.",
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
            2,
            3,
            1
          ],
          [
            3,
            4,
            1
          ]
        ],
        4,
        2
      ],
      "output": "2",
      "explanation": "The longest shortest path is 2 -> 3 -> 4 and takes two."
    },
    {
      "args": [
        [
          [
            1,
            2,
            1
          ]
        ],
        2,
        1
      ],
      "output": "1",
      "explanation": "The only other node receives the signal after one unit."
    }
  ],
  constraints: [
    "`1 <= k <= n <= 100`",
    "`1 <= times.length <= 6000`; edges have distinct valid endpoints and weights from 0 through 100.",
    "No ordered endpoint pair appears more than once."
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
            2,
            3,
            1
          ],
          [
            3,
            4,
            1
          ]
        ],
        4,
        2
      ],
      "expected": "2",
      "note": "The longest shortest path is 2 -> 3 -> 4 and takes two."
    },
    {
      "args": [
        [
          [
            1,
            2,
            1
          ]
        ],
        2,
        1
      ],
      "expected": "1",
      "note": "The only other node receives the signal after one unit."
    },
    {
      "args": [
        [
          [
            1,
            2,
            0
          ]
        ],
        2,
        1
      ],
      "expected": "0",
      "hidden": true,
      "note": "A zero-weight edge delivers the signal immediately."
    },
    {
      "args": [
        [
          [
            1,
            2,
            1
          ]
        ],
        3,
        1
      ],
      "expected": "-1",
      "hidden": true,
      "note": "Node 3 is unreachable."
    },
    {
      "args": [
        [
          [
            1,
            2,
            5
          ],
          [
            1,
            3,
            2
          ],
          [
            3,
            2,
            1
          ]
        ],
        3,
        1
      ],
      "expected": "3",
      "hidden": true,
      "note": "The route through node 3 shortens node 2 arrival to three."
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
            2,
            3,
            2
          ],
          [
            1,
            3,
            10
          ]
        ],
        3,
        1
      ],
      "expected": "4",
      "hidden": true,
      "note": "The two-edge route reaches node 3 in four, beating its direct edge."
    },
    {
      "args": [
        [
          [
            2,
            1,
            4
          ],
          [
            2,
            3,
            2
          ],
          [
            3,
            1,
            1
          ]
        ],
        3,
        2
      ],
      "expected": "3",
      "hidden": true,
      "note": "From node 2, node 1 is reached faster through node 3."
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
            3,
            1
          ],
          [
            3,
            4,
            1
          ],
          [
            1,
            4,
            10
          ]
        ],
        4,
        1
      ],
      "expected": "3",
      "hidden": true,
      "note": "The chain reaches the last node faster than its direct edge."
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
            1,
            1
          ],
          [
            2,
            3,
            0
          ]
        ],
        3,
        1
      ],
      "expected": "1",
      "hidden": true,
      "note": "The zero-cost final edge gives node 3 the same arrival time as node 2."
    },
    {
      "args": [
        [
          [
            3,
            1,
            2
          ],
          [
            3,
            2,
            4
          ],
          [
            1,
            2,
            1
          ]
        ],
        3,
        3
      ],
      "expected": "3",
      "hidden": true,
      "note": "The route 3 -> 1 -> 2 takes three and beats the direct route."
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
            3,
            1
          ],
          [
            4,
            3,
            1
          ]
        ],
        4,
        1
      ],
      "expected": "-1",
      "hidden": true,
      "note": "Starting at node 1 cannot reach node 4."
    }
  ],
  starterCode: { python: `class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        
` },
  notes: {
    "approach": "Find the shortest travel time from the start to each node. The signal reaches everyone when the largest shortest time is known; any unreachable node makes the result -1.",
    "timeComplexity": "O((V + E) log V)",
    "spaceComplexity": "O(V + E)"
  },
  signature: {
    "name": "networkDelayTime",
    "params": [
      {
        "name": "times",
        "kind": "int[][]"
      },
      {
        "name": "n",
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
  sourceUrl: "https://leetcode.com/problems/network-delay-time/",
  reference: `class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        edges = collections.defaultdict(list)
        for u, v, w in times:
            edges[u].append((v, w))

        minHeap = [(0, k)]
        visit = set()
        t = 0
        while minHeap:
            w1, n1 = heapq.heappop(minHeap)
            if n1 in visit:
                continue
            visit.add(n1)
            t = w1

            for n2, w2 in edges[n1]:
                if n2 not in visit:
                    heapq.heappush(minHeap, (w1 + w2, n2))
        return t if len(visit) == n else -1

        # O(E * logV)
`,
  rejection: `class Solution:
    def networkDelayTime(self, times, n, k):
        return max((weight for source,target,weight in times), default=0)
`,
} satisfies AuthoredProblem;
