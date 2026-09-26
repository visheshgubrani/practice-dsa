import type { AuthoredProblem } from "./authoring";

export const medianOfTwoSortedArrays = {
  slug: "median-of-two-sorted-arrays",
  number: 4,
  title: "Median of Two Sorted Arrays",
  difficulty: "hard",
  tags: ["array", "binary-search", "divide-and-conquer", "neetcode-150"],
  statement: [
    "You are given two integer arrays, `nums1` and `nums2`, each already sorted in ascending order. Return the median of every value from both arrays together.",
    "",
    "When the combined count is odd, the median is the middle value. When it is even, the median is the average of the two middle values.",
    "",
    "The solution must run in `O(log(m + n))` time. An answer within `1e-5` of the true median is accepted.",
    "",
    "Either array may be empty. Together they contain at least one value.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 2], [3]],
      output: "2.0",
      explanation: "The combined values are [1, 2, 3], so the middle value is 2.",
    },
    {
      args: [[1, 3], [2, 4]],
      output: "2.5",
      explanation:
        "The combined values are [1, 2, 3, 4]. The two middle values average to (2 + 3) / 2 = 2.5.",
    },
  ],
  constraints: [
    "`nums1.length == m`",
    "`nums2.length == n`",
    "`0 <= m <= 1000`",
    "`0 <= n <= 1000`",
    "`1 <= m + n <= 2000`",
    "`-10⁶ <= nums1[i], nums2[i] <= 10⁶`",
  ],
  testcases: [
    {
      args: [[1, 2], [3]],
      expected: "2.0",
      note: "An odd combined length has a single middle value.",
    },
    {
      args: [[1, 3], [2, 4]],
      expected: "2.5",
      note: "An even combined length averages the two middle values.",
    },
    {
      args: [[], [1]],
      expected: "1.0",
      hidden: true,
      note: "The first array is empty.",
    },
    {
      args: [[0], []],
      expected: "0.0",
      hidden: true,
      note: "The second array is empty.",
    },
    {
      args: [[1], [2]],
      expected: "1.5",
      hidden: true,
      note: "Both arrays have a single value.",
    },
    {
      args: [[-5, -3, -1], [-2]],
      expected: "-2.5",
      hidden: true,
      note: "Negative values, even combined length.",
    },
    {
      args: [[1, 2, 3], [4, 5, 6]],
      expected: "3.5",
      hidden: true,
      note: "Every value in the first array is less than every value in the second.",
    },
    {
      args: [[1, 1], [1, 1]],
      expected: "1.0",
      hidden: true,
      note: "Every value is a duplicate.",
    },
    {
      args: [[1], [2, 3]],
      expected: "2.0",
      hidden: true,
      note: "An odd combined length with the median in the longer array.",
    },
    {
      args: [[-1000000], [1000000]],
      expected: "0.0",
      hidden: true,
      note: "The constraint endpoints average to zero.",
    },
    {
      args: [
        [1, 3, 8, 9, 15],
        [7, 11, 18, 19, 21, 25],
      ],
      expected: "11.0",
      hidden: true,
      note: "The median sits in the longer array, past several cuts.",
    },
    {
      args: [[], [2, 3]],
      expected: "2.5",
      hidden: true,
      note: "An empty side with an even pair left in the other array.",
    },
  ],
  starterCode: {
    python: `class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        `,
  },
  notes: {
    approach:
      "Binary-search a cut on the shorter array. The cut on the longer array is whatever remains so the left side holds half the combined values (one extra when the total is odd). The cut is correct when the left edge of each array is less than or equal to the right edge of the other. The median is then the max of the left edges when the total is odd, and the average of that max with the min of the right edges when the total is even. A left edge that is too large moves the cut left.",
    timeComplexity: "O(log(min(m, n)))",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "findMedianSortedArrays",
    params: [
      { name: "nums1", kind: "int[]" },
      { name: "nums2", kind: "int[]" },
    ],
    returns: "double",
  },
  compare: "tolerance",
  sourceUrl: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
  reference: `class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        if len(nums1) > len(nums2):
            nums1, nums2 = nums2, nums1
        m, n = len(nums1), len(nums2)
        left, right = 0, m
        while left <= right:
            i = (left + right) // 2
            j = (m + n + 1) // 2 - i
            left1 = float("-inf") if i == 0 else nums1[i - 1]
            right1 = float("inf") if i == m else nums1[i]
            left2 = float("-inf") if j == 0 else nums2[j - 1]
            right2 = float("inf") if j == n else nums2[j]
            if left1 <= right2 and left2 <= right1:
                if (m + n) % 2:
                    return float(max(left1, left2))
                return (max(left1, left2) + min(right1, right2)) / 2
            if left1 > right2:
                right = i - 1
            else:
                left = i + 1
        raise ValueError("arrays were not sorted")
`,
  rejection: `class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        merged = sorted(nums1 + nums2)
        return float(merged[(len(merged) - 1) // 2])
`,
} satisfies AuthoredProblem;
