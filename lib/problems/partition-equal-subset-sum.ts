import type { AuthoredProblem } from "./authoring";

export const partitionEqualSubsetSum = {
  "slug": "partition-equal-subset-sum",
  "number": 416,
  "title": "Partition Equal Subset Sum",
  "difficulty": "medium",
  "tags": [
    "array",
    "dynamic-programming",
    "knapsack-problem",
    "0-1-knapsack",
    "neetcode-150"
  ],
  "statement": "Return true if the numbers can be split into two groups with equal sums. Every number must go into exactly one group.",
  "examples": [
    {
      "args": [
        [
          1,
          5,
          11,
          5
        ]
      ],
      "output": "true",
      "explanation": "The groups [1, 5, 5] and [11] both sum to 11."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          5
        ]
      ],
      "output": "false",
      "explanation": "The total is odd, so it cannot be split into equal integer sums."
    }
  ],
  "constraints": [
    "1 <= nums.length <= 200",
    "1 <= nums[i] <= 100"
  ],
  "testcases": [
    {
      "args": [
        [
          1,
          5,
          11,
          5
        ]
      ],
      "expected": "true",
      "hidden": false,
      "note": "The subset [11] matches the remaining sum 1 + 5 + 5."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          5
        ]
      ],
      "expected": "false",
      "hidden": false,
      "note": "An odd total cannot be split equally."
    },
    {
      "args": [
        [
          1,
          2,
          5
        ]
      ],
      "expected": "false",
      "hidden": false,
      "note": "The even target is 4, but no subset reaches it."
    },
    {
      "args": [
        [
          1
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "The total is odd."
    },
    {
      "args": [
        [
          2,
          2
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "Each group can receive one value of 2."
    },
    {
      "args": [
        [
          1,
          1,
          1,
          1
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "Choose any two values for each group."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          6
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The value 6 equals the sum of 1, 2, and 3."
    },
    {
      "args": [
        [
          2,
          3,
          7
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "The total is even, but no subset reaches 6."
    },
    {
      "args": [
        [
          1,
          2,
          5,
          5
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "The total is odd."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          5,
          5
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The subset 3 + 5 reaches half of the total."
    },
    {
      "args": [
        [
          2,
          4,
          6,
          10
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "The total is 22, but no subset sums to 11."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def canPartition(self, nums: List[int]) -> bool:\n        "
  },
  "notes": {
    "approach": "If the total is odd, an equal split is impossible. Otherwise the task is to find a subset summing to half the total. Update reachable sums backward for each number so it can be used only once.",
    "timeComplexity": "O(n × target)",
    "spaceComplexity": "O(target)"
  },
  "signature": {
    "name": "canPartition",
    "params": [
      {
        "name": "nums",
        "kind": "int[]"
      }
    ],
    "returns": "bool"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/partition-equal-subset-sum/",
  "reference": "class Solution:\n    def canPartition(self, nums: List[int]) -> bool:\n        if sum(nums) % 2:\n            return False\n\n        dp = set()\n        dp.add(0)\n        target = sum(nums) // 2\n\n        for i in range(len(nums) - 1, -1, -1):\n            nextDP = set()\n            for t in dp:\n                if (t + nums[i]) == target:\n                    return True\n                nextDP.add(t + nums[i])\n                nextDP.add(t)\n            dp = nextDP\n        return False\n",
  "rejection": "class Solution:\n    def canPartition(self, nums):\n        # Accepts only when one value alone is exactly half the total.\n        total = sum(nums)\n        return total % 2 == 0 and total // 2 in nums\n"
} satisfies AuthoredProblem;
