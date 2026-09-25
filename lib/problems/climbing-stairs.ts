import type { AuthoredProblem } from "./authoring";

export const climbingStairs = {
  "slug": "climbing-stairs",
  "number": 70,
  "title": "Climbing Stairs",
  "difficulty": "easy",
  "tags": ["math", "dynamic-programming", "memoization", "neetcode-150"],
  "statement": "You are at the bottom of a staircase with n steps. Each move climbs either one step or two steps. Return the number of distinct ways to reach the top.",
  "examples": [
    {
      "args": [
        2
      ],
      "output": "2",
      "explanation": "The two routes are 1+1 and 2."
    },
    {
      "args": [
        3
      ],
      "output": "3",
      "explanation": "The routes are 1+1+1, 1+2, and 2+1."
    }
  ],
  "constraints": [
    "1 <= n <= 45"
  ],
  "testcases": [
    {
      "args": [
        2
      ],
      "expected": "2",
      "hidden": false,
      "note": "Either take two single steps or one double step."
    },
    {
      "args": [
        3
      ],
      "expected": "3",
      "hidden": false,
      "note": "There are three ordered sequences of one-step and two-step moves."
    },
    {
      "args": [
        1
      ],
      "expected": "1",
      "hidden": false,
      "note": "A one-step staircase has only one route."
    },
    {
      "args": [
        4
      ],
      "expected": "5",
      "hidden": true,
      "note": "The routes split by whether the first move covers one or two steps."
    },
    {
      "args": [
        5
      ],
      "expected": "8",
      "hidden": true,
      "note": "This extends the count from the previous staircase."
    },
    {
      "args": [
        6
      ],
      "expected": "13",
      "hidden": true,
      "note": "The number of routes is the sum for the two smaller staircases."
    },
    {
      "args": [
        10
      ],
      "expected": "89",
      "hidden": true,
      "note": "A larger input checks repeated accumulation."
    },
    {
      "args": [
        20
      ],
      "expected": "10946",
      "hidden": true,
      "note": "The sequence continues without overflowing the answer type."
    },
    {
      "args": [
        30
      ],
      "expected": "1346269",
      "hidden": true,
      "note": "A mid-range staircase checks the iterative result."
    },
    {
      "args": [
        44
      ],
      "expected": "1134903170",
      "hidden": true,
      "note": "The answer remains within signed 32-bit range."
    },
    {
      "args": [
        45
      ],
      "expected": "1836311903",
      "hidden": true,
      "note": "The maximum allowed n still fits the judge return type."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        "
  },
  "notes": {
    "approach": "Let ways[i] count routes to step i. The final move came from i-1 or i-2, so ways[i] is their sum. Only the previous two counts are needed.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "signature": {
    "name": "climbStairs",
    "params": [
      {
        "name": "n",
        "kind": "int"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/climbing-stairs/",
  "reference": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        if n <= 3:\n            return n\n        n1, n2 = 2, 3\n\n        for i in range(4, n + 1):\n            temp = n1 + n2\n            n1 = n2\n            n2 = temp\n        return n2\n",
  "rejection": "class Solution:\n    def climbStairs(self, n):\n        # Counts only the route made entirely of one-step moves.\n        return 1\n"
} satisfies AuthoredProblem;
