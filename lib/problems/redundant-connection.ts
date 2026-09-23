import type { AuthoredProblem } from "./authoring";

export const redundantConnection = {
  slug: "redundant-connection",
  number: 684,
  title: "Redundant Connection",
  difficulty: "medium",
  tags: ["depth-first-search","breadth-first-search","union-find","graph","neetcode-150"],
  statement: "An undirected tree on labels 1 through n has one extra edge. Return the edge that first closes a cycle when edges are considered in input order, preserving the two endpoints’ input order.",
  examples: [
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            2,
            3
          ]
        ]
      ],
      "output": "[2,3]",
      "explanation": "The third edge closes the triangle."
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
            3
          ],
          [
            3,
            4
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ]
        ]
      ],
      "output": "[1,4]",
      "explanation": "The fourth edge closes a cycle before the final tree edge."
    }
  ],
  constraints: [
    "`edges.length == n` and `3 <= n <= 1000`",
    "Each edge joins distinct labels from 1 through n; no undirected edge is repeated.",
    "The graph is connected and contains exactly one cycle."
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
            1,
            3
          ],
          [
            2,
            3
          ]
        ]
      ],
      "expected": "[2,3]",
      "note": "The third edge closes the triangle."
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
            3
          ],
          [
            3,
            4
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ]
        ]
      ],
      "expected": "[1,4]",
      "note": "The fourth edge closes a cycle before the final tree edge."
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
            3
          ],
          [
            3,
            1
          ]
        ]
      ],
      "expected": "[3,1]",
      "hidden": true,
      "note": "The final edge closes a triangle and retains its endpoint order."
    },
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            3,
            4
          ]
        ]
      ],
      "expected": "[3,4]",
      "hidden": true,
      "note": "The final edge links vertices already joined through 1."
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
            4
          ],
          [
            3,
            4
          ],
          [
            1,
            3
          ]
        ]
      ],
      "expected": "[1,3]",
      "hidden": true,
      "note": "The final edge closes the cycle across two branches."
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
            3
          ],
          [
            3,
            4
          ],
          [
            4,
            5
          ],
          [
            2,
            5
          ]
        ]
      ],
      "expected": "[2,5]",
      "hidden": true,
      "note": "The added edge reconnects the ends of an existing path."
    },
    {
      "args": [
        [
          [
            1,
            3
          ],
          [
            2,
            3
          ],
          [
            3,
            4
          ],
          [
            1,
            4
          ]
        ]
      ],
      "expected": "[1,4]",
      "hidden": true,
      "note": "The last edge closes the cycle through vertex 3."
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
            3
          ],
          [
            3,
            4
          ],
          [
            4,
            2
          ],
          [
            4,
            5
          ]
        ]
      ],
      "expected": "[4,2]",
      "hidden": true,
      "note": "The fourth edge is redundant even though a later edge extends the tree."
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
            3
          ],
          [
            3,
            5
          ],
          [
            4,
            5
          ],
          [
            1,
            4
          ]
        ]
      ],
      "expected": "[1,4]",
      "hidden": true,
      "note": "The final edge joins two already connected branches."
    },
    {
      "args": [
        [
          [
            1,
            4
          ],
          [
            2,
            4
          ],
          [
            3,
            4
          ],
          [
            1,
            2
          ]
        ]
      ],
      "expected": "[1,2]",
      "hidden": true,
      "note": "The first three edges form a tree; the last edge creates its cycle."
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
            5
          ],
          [
            3,
            5
          ],
          [
            1,
            4
          ],
          [
            4,
            5
          ]
        ]
      ],
      "expected": "[4,5]",
      "hidden": true,
      "note": "The final edge completes a cycle through the existing path."
    }
  ],
  starterCode: { python: `class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        
` },
  notes: {
    "approach": "Track connected components while scanning edges in order. The first edge whose endpoints are already connected closes the cycle and is the redundant edge.",
    "timeComplexity": "O(n * α(n))",
    "spaceComplexity": "O(n)"
  },
  signature: {
    "name": "findRedundantConnection",
    "params": [
      {
        "name": "edges",
        "kind": "int[][]"
      }
    ],
    "returns": "int[]"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/redundant-connection/",
  reference: `class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        par = [i for i in range(len(edges) + 1)]
        rank = [1] * (len(edges) + 1)

        def find(n):
            p = par[n]
            while p != par[p]:
                par[p] = par[par[p]]
                p = par[p]
            return p

        # return False if already unioned
        def union(n1, n2):
            p1, p2 = find(n1), find(n2)

            if p1 == p2:
                return False
            if rank[p1] > rank[p2]:
                par[p2] = p1
                rank[p1] += rank[p2]
            else:
                par[p1] = p2
                rank[p2] += rank[p1]
            return True

        for n1, n2 in edges:
            if not union(n1, n2):
                return [n1, n2]
`,
  rejection: `class Solution:
    def findRedundantConnection(self, edges):
        return edges[-1]
`,
} satisfies AuthoredProblem;
