import type { AuthoredProblem } from "./authoring";

export const binarySearch = {
  slug: "binary-search",
  number: 704,
  title: "Binary Search",
  difficulty: "easy",
  tags: ["array", "binary-search"],
  statement: [
    "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.",
    "",
    "You must write an algorithm with `O(log n)` runtime complexity.",
  ].join("\n"),
  examples: [
    {
      args: [[-1, 0, 3, 5, 9, 12], 9],
      output: "4",
      explanation: "9 exists in nums and its index is 4.",
    },
    {
      args: [[-1, 0, 3, 5, 9, 12], 2],
      output: "-1",
      explanation: "2 does not exist in nums so return -1.",
    },
    {
      args: [[5], 5],
      output: "0",
      explanation: "A single matching element is at index 0.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁴`",
    "`-10⁴ < nums[i], target < 10⁴`",
    "All the integers in `nums` are unique.",
    "`nums` is sorted in ascending order.",
  ],
  testcases: [
    {
      args: [[-1, 0, 3, 5, 9, 12], 9],
      expected: "4",
      note: "9 exists in nums and its index is 4.",
    },
    {
      args: [[-1, 0, 3, 5, 9, 12], 2],
      expected: "-1",
      note: "2 does not exist in nums so return -1.",
    },
    {
      args: [[5], 5],
      expected: "0",
      note: "A single matching element is at index 0.",
    },
    {
      args: [[5], -5],
      expected: "-1",
      hidden: true,
      note: "minimum length, target below the only value",
    },
    {
      args: [[-10, -3, 0, 5, 9], -10],
      expected: "0",
      hidden: true,
      note: "target at the start",
    },
    {
      args: [[-10, -3, 0, 5, 9], 9],
      expected: "4",
      hidden: true,
      note: "target at the end",
    },
    {
      args: [[-5, -3, -1], -3],
      expected: "1",
      hidden: true,
      note: "all negatives, found",
    },
    {
      args: [[1, 3, 5, 7], 4],
      expected: "-1",
      hidden: true,
      note: "miss in a gap",
    },
    {
      args: [[-9999, 0, 9999], 9999],
      expected: "2",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[1, 2, 3], 10],
      expected: "-1",
      hidden: true,
      note: "target above every value",
    },
    {
      args: [[1, 2, 3, 4], 2],
      expected: "1",
      hidden: true,
      note: "even length, found left of mid",
    },
  ],
  starterCode: {
    python: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        `,
  },
  notes: {
    approach:
      "Keep a closed interval [left, right] on the sorted array. Compare the midpoint with the target and drop the half that cannot contain it. Returning -1 when the interval empties is what distinguishes a miss from an insertion point.",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "search",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/binary-search/",
  reference: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
`,
} satisfies AuthoredProblem;
