import type { AuthoredProblem } from "./authoring";

export const houseRobberIi = {
  "slug": "house-robber-ii",
  "number": 213,
  "title": "House Robber II",
  "difficulty": "medium",
  "tags": [
    "array",
    "dynamic-programming",
    "neetcode-150"
  ],
  "statement": "The houses are arranged in a circle, so the first and last houses are neighbors. Taking money from neighboring houses triggers an alarm. Return the maximum amount that can be taken without choosing adjacent houses.",
  "examples": [
    {
      "args": [
        [
          2,
          3,
          2
        ]
      ],
      "output": "3",
      "explanation": "The first and last houses are adjacent, so take the middle house."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          1
        ]
      ],
      "output": "4",
      "explanation": "Take the first and third houses; the first and last cannot both be taken."
    }
  ],
  "constraints": [
    "1 <= nums.length <= 100",
    "0 <= nums[i] <= 1000"
  ],
  "testcases": [
    {
      "args": [
        [
          2,
          3,
          2
        ]
      ],
      "expected": "3",
      "hidden": false,
      "note": "The first and last houses cannot be taken with the middle one."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          1
        ]
      ],
      "expected": "4",
      "hidden": false,
      "note": "Take the first and third houses."
    },
    {
      "args": [
        [
          5,
          1,
          1,
          5
        ]
      ],
      "expected": "6",
      "hidden": false,
      "note": "The two 5-value end houses are neighbors, so combine one with a middle 1."
    },
    {
      "args": [
        [
          0
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "The only house contains zero."
    },
    {
      "args": [
        [
          1
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "A single house may be robbed."
    },
    {
      "args": [
        [
          2,
          1
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "With two circular houses, only one can be taken."
    },
    {
      "args": [
        [
          1,
          2,
          3
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The largest single house is optimal."
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
      "expected": "2",
      "hidden": true,
      "note": "Take either pair of nonadjacent houses."
    },
    {
      "args": [
        [
          2,
          3,
          2,
          3
        ]
      ],
      "expected": "6",
      "hidden": true,
      "note": "The second and fourth houses are not neighbors and total 6."
    },
    {
      "args": [
        [
          200,
          3,
          140,
          20,
          10
        ]
      ],
      "expected": "340",
      "hidden": true,
      "note": "Take the first and third houses; they are not neighbors."
    },
    {
      "args": [
        [
          1,
          3,
          1,
          3,
          100
        ]
      ],
      "expected": "103",
      "hidden": true,
      "note": "Omitting the first house allows the second and last."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        "
  },
  "notes": {
    "approach": "The first and last houses cannot both be taken. Solve the linear problem once while excluding the first house and once while excluding the last, then take the larger result. A single house is handled directly.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "signature": {
    "name": "rob",
    "params": [
      {
        "name": "nums",
        "kind": "int[]"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/house-robber-ii/",
  "reference": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        return max(nums[0], self.helper(nums[1:]), self.helper(nums[:-1]))\n\n    def helper(self, nums):\n        rob1, rob2 = 0, 0\n\n        for n in nums:\n            newRob = max(rob1 + n, rob2)\n            rob1 = rob2\n            rob2 = newRob\n        return rob2\n",
  "rejection": "class Solution:\n    def rob(self, nums):\n        # Applies the row solution and forgets the circular edge.\n        one = two = 0\n        for value in nums:\n            one, two = two, max(two, one + value)\n        return two\n"
} satisfies AuthoredProblem;
