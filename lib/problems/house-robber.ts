import type { AuthoredProblem } from "./authoring";

export const houseRobber = {
  "slug": "house-robber",
  "number": 198,
  "title": "House Robber",
  "difficulty": "medium",
  "tags": ["array", "dynamic-programming", "neetcode-150"],
  "statement": "The houses lie in a row. Taking money from two neighboring houses triggers an alarm. Return the largest amount you can take without choosing neighboring houses.",
  "examples": [
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
      "explanation": "Take the first and third houses for 1 + 3 = 4."
    },
    {
      "args": [
        [
          2,
          7,
          9,
          3,
          1
        ]
      ],
      "output": "12",
      "explanation": "Take 2, 9, and 1; no two selected houses are neighbors."
    }
  ],
  "constraints": [
    "1 <= nums.length <= 100",
    "0 <= nums[i] <= 400"
  ],
  "testcases": [
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
      "note": "Taking the first and third houses gives 4."
    },
    {
      "args": [
        [
          2,
          7,
          9,
          3,
          1
        ]
      ],
      "expected": "12",
      "hidden": false,
      "note": "The first, third, and fifth houses give the maximum total."
    },
    {
      "args": [
        [
          2,
          1,
          1,
          2
        ]
      ],
      "expected": "4",
      "hidden": false,
      "note": "Both end houses can be taken together."
    },
    {
      "args": [
        [
          0
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "There is no money in the only house."
    },
    {
      "args": [
        [
          5
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "A single house can be taken."
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
      "note": "Take the larger of the two neighboring houses."
    },
    {
      "args": [
        [
          4,
          4,
          4,
          4
        ]
      ],
      "expected": "8",
      "hidden": true,
      "note": "Take either pair of alternating houses."
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
      "note": "The last house combines with the second house."
    },
    {
      "args": [
        [
          2,
          7,
          9,
          3,
          1,
          5
        ]
      ],
      "expected": "16",
      "hidden": true,
      "note": "Take houses with values 2, 9, and 5."
    },
    {
      "args": [
        [
          10,
          1,
          1,
          10
        ]
      ],
      "expected": "20",
      "hidden": true,
      "note": "The two non-neighboring end houses are both available."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          4,
          5,
          6
        ]
      ],
      "expected": "12",
      "hidden": true,
      "note": "Taking alternating houses yields the maximum."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        "
  },
  "notes": {
    "approach": "At each house, either skip it and keep the best total so far, or take it and add its value to the best total from two houses back. Keep those two totals as the scan moves forward.",
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
  "sourceUrl": "https://leetcode.com/problems/house-robber/",
  "reference": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        rob1, rob2 = 0, 0\n\n        for n in nums:\n            temp = max(n + rob1, rob2)\n            rob1 = rob2\n            rob2 = temp\n        return rob2\n",
  "rejection": "class Solution:\n    def rob(self, nums):\n        # Takes every other house starting with the first.\n        return sum(nums[::2])\n"
} satisfies AuthoredProblem;
