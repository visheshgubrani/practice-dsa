import type { AuthoredProblem } from "./authoring";

export const searchInsertPosition = {
  slug: "search-insert-position",
  number: 35,
  title: "Search Insert Position",
  difficulty: "easy",
  tags: ["array", "binary-search"],
  statement: [
    "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
    "",
    "You must write an algorithm with `O(log n)` runtime complexity.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 3, 5, 6], 5],
      output: "2",
      explanation: "5 is already in the array at index 2.",
    },
    {
      args: [[1, 3, 5, 6], 2],
      output: "1",
      explanation: "2 belongs between 1 and 3, at index 1.",
    },
    {
      args: [[1, 3, 5, 6], 7],
      output: "4",
      explanation: "7 is larger than every value, so it inserts at the end.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁴`",
    "`-10⁴ <= nums[i] <= 10⁴`",
    "`nums` contains distinct values sorted in ascending order.",
    "`-10⁴ <= target <= 10⁴`",
  ],
  testcases: [
    {
      args: [[1, 3, 5, 6], 5],
      expected: "2",
      note: "5 is already in the array at index 2.",
    },
    {
      args: [[1, 3, 5, 6], 2],
      expected: "1",
      note: "2 belongs between 1 and 3, at index 1.",
    },
    {
      args: [[1, 3, 5, 6], 7],
      expected: "4",
      note: "7 is larger than every value, so it inserts at the end.",
    },
    {
      args: [[1], 0],
      expected: "0",
      hidden: true,
      note: "minimum length, insert at the front",
    },
    {
      args: [[1], 1],
      expected: "0",
      hidden: true,
      note: "minimum length, found",
    },
    {
      args: [[1], 2],
      expected: "1",
      hidden: true,
      note: "minimum length, insert at the end",
    },
    {
      args: [[1, 3, 5, 6], 0],
      expected: "0",
      hidden: true,
      note: "target below every value",
    },
    {
      args: [[-1, 0, 3], -1],
      expected: "0",
      hidden: true,
      note: "negatives, found at the start",
    },
    {
      args: [[-5, -2, 0, 4], -3],
      expected: "1",
      hidden: true,
      note: "insert among negatives",
    },
    {
      args: [[-10_000, 0, 10_000], 10_000],
      expected: "2",
      hidden: true,
      note: "constraint endpoints, found",
    },
    {
      args: [[1, 3, 5, 6], 6],
      expected: "3",
      hidden: true,
      note: "found at the end",
    },
  ],
  starterCode: {
    python: `class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        `,
  },
  notes: {
    approach:
      "The same closed-interval binary search as a lookup, except a miss is not -1: when the interval empties, left is the first index whose value is >= target, which is the insertion point. That covers a target below nums[0] (left stays 0) and a target above every value (left becomes n).",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "searchInsert",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/search-insert-position/",
  reference: `class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return left
`,
} satisfies AuthoredProblem;
