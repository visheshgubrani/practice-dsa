import type { AuthoredProblem } from "./authoring";

export const reconstructItinerary = {
  slug: "reconstruct-itinerary",
  number: 332,
  title: "Reconstruct Itinerary",
  difficulty: "hard",
  tags: ["array","string","depth-first-search","graph","sorting","heap-priority-queue","eulerian-circuit","eulerian-path","semi-eulerian-graph","neetcode-150"],
  statement: "Each ticket `[from, to]` is a flight that must be used exactly once. Starting at `JFK`, return the complete route. If several complete routes are possible, choose the lexicographically smallest sequence of airport codes.",
  examples: [
    {
      "args": [
        [
          [
            "MUC",
            "LHR"
          ],
          [
            "JFK",
            "MUC"
          ],
          [
            "SFO",
            "SJC"
          ],
          [
            "LHR",
            "SFO"
          ]
        ]
      ],
      "output": "[\"JFK\",\"MUC\",\"LHR\",\"SFO\",\"SJC\"]",
      "explanation": "The tickets form one route through every destination."
    },
    {
      "args": [
        [
          [
            "JFK",
            "SFO"
          ],
          [
            "JFK",
            "ATL"
          ],
          [
            "SFO",
            "ATL"
          ],
          [
            "ATL",
            "JFK"
          ],
          [
            "ATL",
            "SFO"
          ]
        ]
      ],
      "output": "[\"JFK\",\"ATL\",\"JFK\",\"SFO\",\"ATL\",\"SFO\"]",
      "explanation": "The lexical first choice starts with ATL and still permits a complete route."
    }
  ],
  constraints: [
    "`1 <= tickets.length <= 300`",
    "Each ticket contains two different three-letter uppercase airport codes.",
    "The tickets form at least one valid route starting at `JFK`."
  ],
  testcases: [
    {
      "args": [
        [
          [
            "MUC",
            "LHR"
          ],
          [
            "JFK",
            "MUC"
          ],
          [
            "SFO",
            "SJC"
          ],
          [
            "LHR",
            "SFO"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"MUC\",\"LHR\",\"SFO\",\"SJC\"]",
      "note": "The tickets form one route through every destination."
    },
    {
      "args": [
        [
          [
            "JFK",
            "SFO"
          ],
          [
            "JFK",
            "ATL"
          ],
          [
            "SFO",
            "ATL"
          ],
          [
            "ATL",
            "JFK"
          ],
          [
            "ATL",
            "SFO"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"ATL\",\"JFK\",\"SFO\",\"ATL\",\"SFO\"]",
      "note": "The lexical first choice starts with ATL and still permits a complete route."
    },
    {
      "args": [
        [
          [
            "JFK",
            "SFO"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"SFO\"]",
      "hidden": true,
      "note": "The only ticket is the entire route."
    },
    {
      "args": [
        [
          [
            "JFK",
            "ATL"
          ],
          [
            "ATL",
            "JFK"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"ATL\",\"JFK\"]",
      "hidden": true,
      "note": "Two tickets form a return trip."
    },
    {
      "args": [
        [
          [
            "JFK",
            "KUL"
          ],
          [
            "JFK",
            "NRT"
          ],
          [
            "NRT",
            "JFK"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"NRT\",\"JFK\",\"KUL\"]",
      "hidden": true,
      "note": "The smaller first destination is a dead end, so the full route uses NRT first."
    },
    {
      "args": [
        [
          [
            "JFK",
            "AAA"
          ],
          [
            "JFK",
            "AAB"
          ],
          [
            "AAB",
            "JFK"
          ],
          [
            "AAA",
            "JFK"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"AAA\",\"JFK\",\"AAB\",\"JFK\"]",
      "hidden": true,
      "note": "The smaller cycle is taken before the next JFK departure."
    },
    {
      "args": [
        [
          [
            "JFK",
            "ATL"
          ],
          [
            "ATL",
            "JFK"
          ],
          [
            "JFK",
            "ATL"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"ATL\",\"JFK\",\"ATL\"]",
      "hidden": true,
      "note": "Repeated tickets are separate flights and both are used."
    },
    {
      "args": [
        [
          [
            "JFK",
            "SFO"
          ],
          [
            "SFO",
            "JFK"
          ],
          [
            "JFK",
            "ATL"
          ],
          [
            "ATL",
            "JFK"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"ATL\",\"JFK\",\"SFO\",\"JFK\"]",
      "hidden": true,
      "note": "Lexical order takes the ATL cycle before the SFO cycle."
    },
    {
      "args": [
        [
          [
            "JFK",
            "AAA"
          ],
          [
            "AAA",
            "AAB"
          ],
          [
            "AAB",
            "BAA"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"AAA\",\"AAB\",\"BAA\"]",
      "hidden": true,
      "note": "A simple chain uses every ticket."
    },
    {
      "args": [
        [
          [
            "JFK",
            "AAA"
          ],
          [
            "AAA",
            "JFK"
          ],
          [
            "JFK",
            "AAB"
          ],
          [
            "AAB",
            "JFK"
          ],
          [
            "JFK",
            "AAC"
          ],
          [
            "AAC",
            "JFK"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"AAA\",\"JFK\",\"AAB\",\"JFK\",\"AAC\",\"JFK\"]",
      "hidden": true,
      "note": "Three cycles are completed in lexical order."
    },
    {
      "args": [
        [
          [
            "JFK",
            "ATL"
          ],
          [
            "ATL",
            "SFO"
          ],
          [
            "SFO",
            "JFK"
          ],
          [
            "JFK",
            "SFO"
          ],
          [
            "SFO",
            "ATL"
          ]
        ]
      ],
      "expected": "[\"JFK\",\"ATL\",\"SFO\",\"JFK\",\"SFO\",\"ATL\"]",
      "hidden": true,
      "note": "The smaller ATL departure is tried first, then both SFO exits are consumed."
    }
  ],
  starterCode: { python: `class Solution:
    def findItinerary(self, tickets: list[list[str]]) -> list[str]:
        
` },
  notes: {
    "approach": "Consume outgoing flights in lexical order and append each airport after exhausting its remaining flights. This traversal uses every edge even when a smaller local choice temporarily reaches a dead end.",
    "timeComplexity": "O(E log E)",
    "spaceComplexity": "O(E)"
  },
  signature: {
    "name": "findItinerary",
    "params": [
      {
        "name": "tickets",
        "kind": "string[][]"
      }
    ],
    "returns": "string[]"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/reconstruct-itinerary/",
  reference: `class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        adj = {src: [] for src, dst in tickets}
        res = []

        for src, dst in tickets:
            adj[src].append(dst)

        for key in adj:
            adj[key].sort()

        def dfs(adj, src):
            if src in adj:
                destinations = adj[src][:]
                while destinations:
                    dest = destinations[0]
                    adj[src].pop(0)
                    dfs(adj, dest)
                    destinations = adj[src][:]
            res.append(src)

        dfs(adj, "JFK")
        res.reverse()

        if len(res) != len(tickets) + 1:
            return []

        return res
`,
  rejection: `class Solution:
    def findItinerary(self, tickets):
        from collections import defaultdict
        graph = defaultdict(list)
        for source, destination in tickets: graph[source].append(destination)
        route = ["JFK"]
        while graph[route[-1]]:
            route.append(min(graph[route[-1]]))
            graph[route[-2]].remove(route[-1])
        return route
`,
} satisfies AuthoredProblem;
