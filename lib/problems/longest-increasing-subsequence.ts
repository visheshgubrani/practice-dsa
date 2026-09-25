import type { AuthoredProblem } from "./authoring";

export const longestIncreasingSubsequence = {
  "slug": "longest-increasing-subsequence",
  "number": 300,
  "title": "Longest Increasing Subsequence",
  "difficulty": "medium",
  "tags": ["array", "binary-search", "dynamic-programming", "longest-increasing-subsequence", "neetcode-150"],
  "statement": "Return the length of the longest subsequence of nums whose values are strictly increasing. A subsequence keeps the original order but may skip elements.",
  "examples": [
    {
      "args": [
        [
          10,
          9,
          2,
          5,
          3,
          7,
          101,
          18
        ]
      ],
      "output": "4",
      "explanation": "One longest subsequence is [2, 3, 7, 18]."
    },
    {
      "args": [
        [
          0,
          1,
          0,
          3,
          2,
          3
        ]
      ],
      "output": "4",
      "explanation": "One longest subsequence is [0, 1, 2, 3]."
    },
    {
      "args": [
        [
          7,
          7,
          7,
          7,
          7,
          7,
          7
        ]
      ],
      "output": "1",
      "explanation": "Equal values cannot extend a strictly increasing subsequence."
    }
  ],
  "constraints": [
    "1 <= nums.length <= 2500",
    "-10⁴ <= nums[i] <= 10⁴"
  ],
  "testcases": [
    {
      "args": [
        [
          10,
          9,
          2,
          5,
          3,
          7,
          101,
          18
        ]
      ],
      "expected": "4",
      "hidden": false,
      "note": "The subsequence [2, 3, 7, 18] has length four."
    },
    {
      "args": [
        [
          0,
          1,
          0,
          3,
          2,
          3
        ]
      ],
      "expected": "4",
      "hidden": false,
      "note": "The subsequence [0, 1, 2, 3] has length four."
    },
    {
      "args": [
        [
          7,
          7,
          7,
          7,
          7,
          7,
          7
        ]
      ],
      "expected": "1",
      "hidden": false,
      "note": "Strict increase prevents using equal values together."
    },
    {
      "args": [
        [
          1
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "A single value forms a subsequence of length one."
    },
    {
      "args": [
        [
          3,
          2,
          1
        ]
      ],
      "expected": "1",
      "hidden": true,
      "note": "A decreasing sequence has no increasing pair."
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
      "expected": "4",
      "hidden": true,
      "note": "The entire input is strictly increasing."
    },
    {
      "args": [
        [
          4,
          10,
          4,
          3,
          8,
          9
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "One longest subsequence is [4, 8, 9]."
    },
    {
      "args": [
        [
          -2,
          -1
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Negative values can form an increasing subsequence."
    },
    {
      "args": [
        [
          2,
          2,
          1,
          1,
          3
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Duplicates cannot extend, but 1 followed by 3 can."
    },
    {
      "args": [
        [
          5,
          1,
          6,
          2,
          7,
          3,
          8
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "One longest subsequence is [1, 2, 3, 8]."
    },
    {
      "args": [
        [
          9,
          1,
          3,
          7,
          5,
          6,
          20
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "One longest subsequence is [1, 3, 5, 6, 20]."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def lengthOfLIS(self, nums: List[int]) -> int:\n        "
  },
  "notes": {
    "approach": "Maintain the smallest possible tail for each subsequence length. For each number, replace the first tail that is at least that number, or extend the tails if it is larger than all of them. The number of tails is the answer.",
    "timeComplexity": "O(n log n)",
    "spaceComplexity": "O(n)"
  },
  "signature": {
    "name": "lengthOfLIS",
    "params": [
      {
        "name": "nums",
        "kind": "int[]"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/longest-increasing-subsequence/",
  "reference": "class Solution:\n    def lengthOfLIS(self, nums: List[int]) -> int:\n        LIS = [1] * len(nums)\n\n        for i in range(len(nums) - 1, -1, -1):\n            for j in range(i + 1, len(nums)):\n                if nums[i] < nums[j]:\n                    LIS[i] = max(LIS[i], 1 + LIS[j])\n        return max(LIS)\n",
  "rejection": "class Solution:\n    def lengthOfLIS(self, nums):\n        # Sorts and deduplicates, losing the original order constraint.\n        return len(set(nums))\n"
} satisfies AuthoredProblem;
