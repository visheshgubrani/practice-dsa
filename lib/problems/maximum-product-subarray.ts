import type { AuthoredProblem } from "./authoring";

export const maximumProductSubarray = {
  "slug": "maximum-product-subarray",
  "number": 152,
  "title": "Maximum Product Subarray",
  "difficulty": "medium",
  "tags": ["array", "dynamic-programming", "neetcode-150"],
  "statement": "Find a nonempty contiguous subarray of nums with the largest product and return that product.",
  "examples": [
    {
      "args": [
        [
          2,
          3,
          -2,
          4
        ]
      ],
      "output": "6",
      "explanation": "The subarray [2, 3] has product 6, which is the largest."
    },
    {
      "args": [
        [
          -2,
          0,
          -1
        ]
      ],
      "output": "0",
      "explanation": "The best nonempty subarray is the single zero."
    }
  ],
  "constraints": [
    "1 <= nums.length <= 2 × 10⁴",
    "-10 <= nums[i] <= 10",
    "The product of every subarray is guaranteed to fit in a signed 32-bit integer."
  ],
  "testcases": [
    {
      "args": [
        [
          2,
          3,
          -2,
          4
        ]
      ],
      "expected": "6",
      "hidden": false,
      "note": "The positive prefix [2, 3] has the largest product."
    },
    {
      "args": [
        [
          -2,
          0,
          -1
        ]
      ],
      "expected": "0",
      "hidden": false,
      "note": "The zero beats either negative singleton."
    },
    {
      "args": [
        [
          -2,
          3,
          -4
        ]
      ],
      "expected": "24",
      "hidden": false,
      "note": "The two negative values make a positive product across the middle."
    },
    {
      "args": [
        [
          0
        ]
      ],
      "expected": "0",
      "hidden": true,
      "note": "The only nonempty subarray contains zero."
    },
    {
      "args": [
        [
          5
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "A positive singleton is the only candidate."
    },
    {
      "args": [
        [
          -5
        ]
      ],
      "expected": "-5",
      "hidden": true,
      "note": "The least-negative available product is required."
    },
    {
      "args": [
        [
          0,
          2
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "A positive subarray after zero becomes the best."
    },
    {
      "args": [
        [
          2,
          -5,
          -2,
          -4,
          3
        ]
      ],
      "expected": "24",
      "hidden": true,
      "note": "The best product is the suffix [-2, -4, 3]."
    },
    {
      "args": [
        [
          -1,
          -2,
          -9,
          -6
        ]
      ],
      "expected": "108",
      "hidden": true,
      "note": "The full even-length product is positive and maximal."
    },
    {
      "args": [
        [
          3,
          -1,
          4
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "A negative prefix should be discarded before the final positive value."
    },
    {
      "args": [
        [
          1,
          2,
          3,
          4
        ]
      ],
      "expected": "24",
      "hidden": true,
      "note": "All positive values belong to the best product."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def maxProduct(self, nums: List[int]) -> int:\n        "
  },
  "notes": {
    "approach": "Track both the largest and smallest product ending at the current index. A negative number swaps their roles, while zero starts a new segment. The largest tracked value is the best product seen.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "signature": {
    "name": "maxProduct",
    "params": [
      {
        "name": "nums",
        "kind": "int[]"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/maximum-product-subarray/",
  "reference": "class Solution:\n    def maxProduct(self, nums: List[int]) -> int:\n        # O(n)/O(1) : Time/Memory\n        res = nums[0]\n        curMin, curMax = 1, 1\n\n        for n in nums:\n\n            tmp = curMax * n\n            curMax = max(n * curMax, n * curMin, n)\n            curMin = min(tmp, n * curMin, n)\n            res = max(res, curMax)\n        return res\n",
  "rejection": "class Solution:\n    def maxProduct(self, nums):\n        # Tracks only the largest product ending here; a negative minimum may\n        # become the next maximum after multiplication by another negative.\n        current = best = nums[0]\n        for value in nums[1:]:\n            current = max(value, current * value)\n            best = max(best, current)\n        return best\n"
} satisfies AuthoredProblem;
