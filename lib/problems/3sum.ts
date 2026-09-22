import type { AuthoredProblem } from "./authoring";

export const threeSum = {
  slug: "3sum",
  number: 15,
  title: "3Sum",
  difficulty: "medium",
  tags: ["array", "two-pointers", "sorting", "neetcode-150"],
  statement: [
    "Given an integer array `nums`, return every triplet `[nums[i], nums[j], nums[k]]` with `i`, `j`, `k` all different whose values sum to `0`.",
    "",
    "The answer must not contain duplicate triplets. Each triplet must be listed with its values in ascending order, and the triplets themselves may be returned in any order.",
  ].join("\n"),
  examples: [
    {
      args: [[-1, 0, 1, 2, -1, -4]],
      output: "[[-1,-1,2],[-1,0,1]]",
      explanation:
        "Two triplets sum to zero: `-1 + -1 + 2` and `-1 + 0 + 1`. Their values are written in ascending order.",
    },
    {
      args: [[0, 1, 1]],
      output: "[]",
      explanation: "Only `0 + 1 + 1 = 2` is possible, so there is no triplet.",
    },
    {
      args: [[0, 0, 0]],
      output: "[[0,0,0]]",
      explanation: "Three equal values sum to zero; the repeated zeros appear once in the answer.",
    },
  ],
  constraints: ["`3 <= nums.length <= 3000`", "`-10⁵ <= nums[i] <= 10⁵`"],
  testcases: [
    {
      args: [[-1, 0, 1, 2, -1, -4]],
      expected: "[[-1,-1,2],[-1,0,1]]",
      note: "Duplicates in the input must not produce duplicate triplets.",
    },
    {
      args: [[0, 1, 1]],
      expected: "[]",
      hidden: false,
      note: "No triplet sums to zero, so the answer is empty.",
    },
    {
      args: [[0, 0, 0]],
      expected: "[[0,0,0]]",
      hidden: false,
      note: "The degenerate triplet of three zeros.",
    },
    {
      args: [[-1, 0, 1]],
      expected: "[[-1,0,1]]",
      hidden: true,
      note: "minimum length, exactly one triplet",
    },
    {
      args: [[0, 0, 0, 0]],
      expected: "[[0,0,0]]",
      hidden: true,
      note: "repeated zeros collapse to one triplet",
    },
    { args: [[1, 2, 3]], expected: "[]", hidden: true, note: "all positive" },
    {
      args: [[-1, -1, 2]],
      expected: "[[-1,-1,2]]",
      hidden: true,
      note: "a triplet built from a repeated value",
    },
    {
      args: [[-2, 0, 1, 1, 2]],
      expected: "[[-2,0,2],[-2,1,1]]",
      hidden: true,
      note: "two triplets, one of them using a repeated value",
    },
    {
      args: [[3, 0, -2, -1, 1, 2]],
      expected: "[[-2,-1,3],[-2,0,2],[-1,0,1]]",
      hidden: true,
      note: "three distinct triplets in unsorted input",
    },
    {
      args: [[1, 2, -2, -1]],
      expected: "[]",
      hidden: true,
      note: "negatives and positives but no zero to complete a triplet",
    },
    {
      args: [[-2, 0, 2, 0]],
      expected: "[[-2,0,2]]",
      hidden: true,
      note: "a duplicated zero must not duplicate the triplet",
    },
    {
      args: [[-100000, 0, 100000]],
      expected: "[[-100000,0,100000]]",
      hidden: true,
      note: "constraint-boundary magnitudes",
    },
    {
      args: [[-4, -2, -2, -2, 0, 1, 2, 2, 2, 4]],
      expected: "[[-4,0,4],[-4,2,2],[-2,-2,4],[-2,0,2]]",
      hidden: true,
      note: "many repeated values, so deduplication does the work",
    },
  ],
  starterCode: {
    python: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        `,
  },
  notes: {
    approach:
      "Sort first, then fix each value in turn as the smallest of the triplet and solve the remaining pair with two pointers moving inward. Sorting is what makes skipping work: a repeated first value or a repeated pointer value would only rebuild a triplet already recorded, so skipping equal neighbours is what removes the duplicates.",
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "threeSum",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int[][]",
  },
  // A set of ordered sequences: the triplets may be listed in any order, but
  // each triplet's own order is part of the answer. Recursive `unordered` would
  // sort the triplets too and could not tell `[-1,-1,2]` from `[-1,2,-1]`.
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/3sum/",
  reference: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        res = []
        nums.sort()

        for i, a in enumerate(nums):
            # Skip positive integers
            if a > 0:
                break

            if i > 0 and a == nums[i - 1]:
                continue

            l, r = i + 1, len(nums) - 1
            while l < r:
                threeSum = a + nums[l] + nums[r]
                if threeSum > 0:
                    r -= 1
                elif threeSum < 0:
                    l += 1
                else:
                    res.append([a, nums[l], nums[r]])
                    l += 1
                    r -= 1
                    while l < r and nums[l] == nums[l - 1]:
                        l += 1

        return res
`,
  rejection: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        res = []
        nums.sort()
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                for k in range(j + 1, len(nums)):
                    # Correct sums, but duplicate triplets are never removed.
                    if nums[i] + nums[j] + nums[k] == 0:
                        res.append([nums[i], nums[j], nums[k]])
        return res
`,
} satisfies AuthoredProblem;
