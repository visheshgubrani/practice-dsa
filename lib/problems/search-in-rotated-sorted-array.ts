import type { AuthoredProblem } from "./authoring";

export const searchInRotatedSortedArray = {
  slug: "search-in-rotated-sorted-array",
  number: 33,
  title: "Search in Rotated Sorted Array",
  difficulty: "medium",
  tags: ["array", "binary-search", "neetcode-150"],
  statement: [
    "`nums` is an ascending array of distinct values that has been rotated at an unknown index — for example `[0,1,2,4,5,6,7]` rotated by 3 becomes `[4,5,6,7,0,1,2]`.",
    "",
    "Given `nums` and `target`, return the index of `target`, or `-1` if it is absent. The search must run in `O(log n)`.",
  ].join("\n"),
  examples: [
    {
      args: [[4, 5, 6, 7, 0, 1, 2], 0],
      output: "4",
      explanation: "The rotation puts `0` just after the largest values, at index 4.",
    },
    {
      args: [[4, 5, 6, 7, 0, 1, 2], 3],
      output: "-1",
      explanation: "`3` is missing — it would have to sit between `7` and `0`.",
    },
    {
      args: [[1], 0],
      output: "-1",
      explanation: "The single element is `1`, so `0` is not present.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 5000`",
    "`-10⁴ <= nums[i] <= 10⁴`",
    "All values of `nums` are unique.",
    "`nums` is an ascending array that is possibly rotated.",
    "`-10⁴ <= target <= 10⁴`",
  ],
  testcases: [
    {
      args: [[4, 5, 6, 7, 0, 1, 2], 0],
      expected: "4",
      note: "The target sits after the rotation point.",
    },
    {
      args: [[4, 5, 6, 7, 0, 1, 2], 3],
      expected: "-1",
      note: "Missing between the two sorted runs.",
    },
    {
      args: [[1], 0],
      expected: "-1",
      note: "Minimum length with an absent target.",
    },
    { args: [[1], 1], expected: "0", hidden: true, note: "minimum length with the target present" },
    { args: [[1, 3], 3], expected: "1", hidden: true, note: "two elements, target last" },
    { args: [[3, 1], 1], expected: "1", hidden: true, note: "rotated once" },
    { args: [[5, 1, 3], 3], expected: "2", hidden: true, note: "a rotation of two" },
    {
      args: [[2, 3, 4, 5, 1], 1],
      expected: "4",
      hidden: true,
      note: "the smallest value sits at the very end",
    },
    {
      args: [[4, 5, 6, 7, 8, 1, 2, 3], 8],
      expected: "4",
      hidden: true,
      note: "the target is the largest value, just before the rotation point",
    },
    {
      args: [[4, 5, 6, 7, 8, 1, 2, 3], 2],
      expected: "6",
      hidden: true,
      note: "the target sits inside the second sorted run",
    },
    {
      args: [[1, 2, 3, 4, 5, 6], 6],
      expected: "5",
      hidden: true,
      note: "no rotation at all",
    },
    {
      args: [[6, 1, 2, 3, 4, 5], 6],
      expected: "0",
      hidden: true,
      note: "the target is the first element after rotating",
    },
    {
      args: [[-10000, -9999, 10000], 10000],
      expected: "2",
      hidden: true,
      note: "constraint-boundary values",
    },
  ],
  starterCode: {
    python: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        `,
  },
  notes: {
    approach:
      "A rotated array still has one property a binary search can use: whichever half the midpoint falls in, at least one side is sorted. Compare a value against the sorted side's endpoints to decide whether the target can be inside it; if not, search the other half. Each step halves the range, so the rotation never costs more than a comparison.",
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
  sourceUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
  reference: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums) - 1

        while l <= r:
            mid = (l + r) // 2
            if target == nums[mid]:
                return mid

            # left sorted portion
            if nums[l] <= nums[mid]:
                if target > nums[mid] or target < nums[l]:
                    l = mid + 1
                else:
                    r = mid - 1
            # right sorted portion
            else:
                if target < nums[mid] or target > nums[r]:
                    r = mid - 1
                else:
                    l = mid + 1
        return -1
`,
  rejection: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # Plain binary search, as though the array were still sorted.
        l, r = 0, len(nums) - 1
        while l <= r:
            mid = (l + r) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                l = mid + 1
            else:
                r = mid - 1
        return -1
`,
} satisfies AuthoredProblem;
