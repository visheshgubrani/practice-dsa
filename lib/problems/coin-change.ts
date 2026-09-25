import type { AuthoredProblem } from "./authoring";

export const coinChange = {
  "slug": "coin-change",
  "number": 322,
  "title": "Coin Change",
  "difficulty": "medium",
  "tags": ["array", "dynamic-programming", "breadth-first-search", "knapsack-problem", "complete-knapsack", "neetcode-150"],
  "statement": "Given coin denominations and a target amount, return the fewest coins needed to make exactly that amount. You may use each denomination any number of times. Return -1 if the amount cannot be made.",
  "examples": [
    {
      "args": [
        [
          1,
          2,
          5
        ],
        11
      ],
      "output": "3",
      "explanation": "Two 5 coins and one 1 coin make 11 with three coins."
    },
    {
      "args": [
        [
          2
        ],
        3
      ],
      "output": "-1",
      "explanation": "Using only denomination 2 cannot make an odd amount."
    },
    {
      "args": [
        [
          1
        ],
        0
      ],
      "output": "0",
      "explanation": "No coins are needed to make amount zero."
    }
  ],
  "constraints": [
    "1 <= coins.length <= 12",
    "1 <= coins[i] <= 2³¹ - 1",
    "0 <= amount <= 10⁴"
  ],
  "testcases": [
    {
      "args": [
        [
          1,
          2,
          5
        ],
        11
      ],
      "expected": "3",
      "hidden": false,
      "note": "Two 5 coins and one 1 coin make 11."
    },
    {
      "args": [
        [
          2
        ],
        3
      ],
      "expected": "-1",
      "hidden": false,
      "note": "No combination of 2-value coins makes 3."
    },
    {
      "args": [
        [
          1
        ],
        0
      ],
      "expected": "0",
      "hidden": false,
      "note": "The empty selection makes amount zero."
    },
    {
      "args": [
        [
          1
        ],
        2
      ],
      "expected": "2",
      "hidden": true,
      "note": "Two unit coins make the amount."
    },
    {
      "args": [
        [
          1,
          3,
          4
        ],
        6
      ],
      "expected": "2",
      "hidden": true,
      "note": "Two 3-value coins beat taking a 4 and two 1s."
    },
    {
      "args": [
        [
          2,
          4
        ],
        7
      ],
      "expected": "-1",
      "hidden": true,
      "note": "All denominations are even, so 7 is unreachable."
    },
    {
      "args": [
        [
          1,
          4,
          5
        ],
        8
      ],
      "expected": "2",
      "hidden": true,
      "note": "Use denominations 4 and 4."
    },
    {
      "args": [
        [
          5,
          6,
          9
        ],
        11
      ],
      "expected": "2",
      "hidden": true,
      "note": "Use 5 and 6."
    },
    {
      "args": [
        [
          2,
          3,
          7
        ],
        12
      ],
      "expected": "3",
      "hidden": true,
      "note": "Use 7, 3, and 2."
    },
    {
      "args": [
        [
          3,
          7
        ],
        17
      ],
      "expected": "3",
      "hidden": true,
      "note": "Two 7-value coins and one 3-value coin make 17."
    },
    {
      "args": [
        [
          186,
          419,
          83,
          408
        ],
        6249
      ],
      "expected": "20",
      "hidden": true,
      "note": "A larger target checks that the answer is not chosen greedily."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        "
  },
  "notes": {
    "approach": "Let dp[a] be the fewest coins that make amount a. For each amount, try every denomination that fits and extend the best solution for the remaining amount by one coin. Unreachable amounts stay marked as impossible.",
    "timeComplexity": "O(amount × number of denominations)",
    "spaceComplexity": "O(amount)"
  },
  "signature": {
    "name": "coinChange",
    "params": [
      {
        "name": "coins",
        "kind": "int[]"
      },
      {
        "name": "amount",
        "kind": "int"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/coin-change/",
  "reference": "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        dp = [amount + 1] * (amount + 1)\n        dp[0] = 0\n\n        for a in range(1, amount + 1):\n            for c in coins:\n                if a - c >= 0:\n                    dp[a] = min(dp[a], 1 + dp[a - c])\n        return dp[amount] if dp[amount] != amount + 1 else -1\n",
  "rejection": "class Solution:\n    def coinChange(self, coins, amount):\n        # Greedily takes the largest available denomination first.\n        total = 0\n        for coin in sorted(coins, reverse=True):\n            take, amount = divmod(amount, coin)\n            total += take\n        return total if amount == 0 else -1\n"
} satisfies AuthoredProblem;
