import type { AuthoredProblem } from "./authoring";

export const findMinimumInRotatedSortedArray = {
  slug: "find-minimum-in-rotated-sorted-array",
  number: 153,
  title: "Find Minimum in Rotated Sorted Array",
  difficulty: "medium",
  tags: ["array", "binary-search", "neetcode-150"],
  statement: [
    "An ascending array of distinct values has been rotated between `1` and `n` times, so it is still made of two sorted runs.",
    "",
    "Return the smallest value. The search must run in `O(log n)`.",
  ].join("\n"),
  examples: [
    {
      args: [[3, 4, 5, 1, 2]],
      output: "1",
      explanation: "The rotation point is between `5` and `1`, so `1` is the smallest value.",
    },
    {
      args: [[4, 5, 6, 7, 0, 1, 2]],
      output: "0",
      explanation: "The smallest value sits in the middle of the array.",
    },
    {
      args: [[11, 13, 15, 17]],
      output: "11",
      explanation: "Rotating `n` times restores the original order, so the first value is the minimum.",
    },
  ],
  constraints: [
    "`n == nums.length`",
    "`1 <= n <= 5000`",
    "`-5000 <= nums[i] <= 5000`",
    "All the integers of `nums` are unique.",
    "`nums` is sorted and rotated between `1` and `n` times.",
  ],
  testcases: [
    {
      args: [[3, 4, 5, 1, 2]],
      expected: "1",
      note: "The minimum follows the largest value.",
    },
    {
      args: [[4, 5, 6, 7, 0, 1, 2]],
      expected: "0",
      note: "The rotation point is in the middle.",
    },
    {
      args: [[11, 13, 15, 17]],
      expected: "11",
      note: "A full rotation leaves the array sorted, so the first value wins.",
    },
    { args: [[1]], expected: "1", hidden: true, note: "minimum length" },
    { args: [[2, 1]], expected: "1", hidden: true, note: "rotated once" },
    { args: [[1, 2]], expected: "1", hidden: true, note: "rotated twice, back in order" },
    { args: [[5, 1, 2, 3, 4]], expected: "1", hidden: true, note: "the minimum is second" },
    { args: [[2, 3, 4, 5, 1]], expected: "1", hidden: true, note: "the minimum is last" },
    { args: [[3, 1, 2]], expected: "1", hidden: true, note: "three values, minimum in the middle" },
    {
      args: [[5000, -5000]],
      expected: "-5000",
      hidden: true,
      note: "constraint-boundary values",
    },
    {
      args: [[7, 8, 9, 1, 2, 3, 4, 5, 6]],
      expected: "1",
      hidden: true,
      note: "a longer array split near the front",
    },
    {
      args: [[6, 7, 8, 9, 10, 1, 2, 3, 4, 5]],
      expected: "1",
      hidden: true,
      note: "a longer array split in the middle",
    },
  ],
  starterCode: {
    python: `class Solution:
    def findMin(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Binary search on the rotation point instead of on a value. If the midpoint is greater than the last element, the minimum must be to the right of the midpoint; otherwise it is at the midpoint or to the left. The range collapses onto the smallest value.",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "findMin",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
  reference: `class Solution:
    def findMin(self, nums: List[int]) -> int:
        start , end = 0, len(nums) - 1 
        curr_min = float("inf")
        
        while start  <  end :
            mid = start + (end - start ) // 2
            curr_min = min(curr_min,nums[mid])
            
            # right has the min 
            if nums[mid] > nums[end]:
                start = mid + 1
                
            # left has the  min 
            else:
                end = mid - 1 
                
        return min(curr_min,nums[start])
`,
  rejection: `class Solution:
    def findMin(self, nums: List[int]) -> int:
        # Compares only the two ends, which misses a minimum that sits in the
        # middle of the array.
        return nums[0] if nums[0] < nums[-1] else nums[-1]
`,
} satisfies AuthoredProblem;
