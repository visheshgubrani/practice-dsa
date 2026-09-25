import type { AuthoredProblem } from "./authoring";

export const minCostClimbingStairs = {
  "slug": "min-cost-climbing-stairs",
  "number": 746,
  "title": "Min Cost Climbing Stairs",
  "difficulty": "easy",
  "tags": [
    "array",
    "dynamic-programming",
    "neetcode-150"
  ],
  "statement": "Each cost[i] is paid when you step on stair i. You may start on stair 0 or stair 1, and from a stair you may move up one or two positions. Return the minimum cost to reach the top, just beyond the last stair.",
  "examples": [
    {
      "args": [
        [
          10,
          15,
          20
        ]
      ],
      "output": "15",
      "explanation": "Start on stair 1, pay 15, then jump to the top."
    },
    {
      "args": [
        [
          1,
          100,
          1,
          1,
          1,
          100,
          1,
          1,
          100,
          1
        ]
      ],
      "output": "6",
      "explanation": "The cheapest route skips expensive stairs and pays a total of 6."
    }
  ],
  "constraints": [
    "2 <= cost.length <= 1000",
    "0 <= cost[i] <= 999"
  ],
  "testcases": [
    {
      "args": [
        [
          10,
          15,
          20
        ]
      ],
      "expected": "15",
      "hidden": false,
      "note": "Starting at index 1 is cheaper than paying the first two costs."
    },
    {
      "args": [
        [
          1,
          100,
          1,
          1,
          1,
          100,
          1,
          1,
          100,
          1
        ]
      ],
      "expected": "6",
      "hidden": false,
      "note": "A route with one- and two-step moves avoids the large costs."
    },
    {
      "args": [
        [
          0,
          0
        ]
      ],
      "expected": "0",
      "hidden": false,
      "note": "Either starting position costs nothing."
    },
    {
      "args": [
        [
          1,
          2
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "Start on the cheaper stair and step directly to the top."
    },
    {
      "args": [
        [
          5,
          1,
          2,
          3
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The cheapest route pays 1 and then another 2."
    },
    {
      "args": [
        [
          1,
          100,
          1
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Pay the first and last stair, skipping the middle one."
    },
    {
      "args": [
        [
          0,
          1,
          0,
          1
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "Zero-cost stairs can be used to reach the top for free."
    },
    {
      "args": [
        [
          2,
          2,
          2
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Pay one of the first two costs, then jump to the top."
    },
    {
      "args": [
        [
          1,
          1,
          1,
          1,
          1
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "A route can pay for two stairs and jump over the third."
    },
    {
      "args": [
        [
          999,
          0,
          999,
          0,
          999,
          0
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "Starting at the zero-cost second stair reaches another free stair."
    },
    {
      "args": [
        [
          4,
          10,
          3,
          8,
          2,
          7,
          1
        ]
      ],
      "expected": "10",
      "hidden": true,
      "note": "The cheapest route pays 4, 3, 2, and 1."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def minCostClimbingStairs(self, cost: List[int]) -> int:\n        "
  },
  "notes": {
    "approach": "Work backward from the top: the minimum cost to leave a stair is its cost plus the cheaper cost of the next one or two stairs. The top itself costs zero, and the answer is the cheaper of starting at stair 0 or 1.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1) extra when updating costs in place"
  },
  "signature": {
    "name": "minCostClimbingStairs",
    "params": [
      {
        "name": "cost",
        "kind": "int[]"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/min-cost-climbing-stairs/",
  "reference": "class Solution:\n    def minCostClimbingStairs(self, cost: List[int]) -> int:\n        for i in range(len(cost) - 3, -1, -1):\n            cost[i] += min(cost[i + 1], cost[i + 2])\n\n        return min(cost[0], cost[1])\n",
  "rejection": "class Solution:\n    def minCostClimbingStairs(self, cost):\n        # Chooses only the cheaper starting stair and ignores later costs.\n        return min(cost[0], cost[1])\n"
} satisfies AuthoredProblem;
