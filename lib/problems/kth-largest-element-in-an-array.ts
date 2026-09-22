import type { AuthoredProblem } from "./authoring";

export const kthLargestElementInAnArray = {
  slug: "kth-largest-element-in-an-array",
  number: 215,
  title: "Kth Largest Element in an Array",
  difficulty: "medium",
  tags: ["array", "divide-and-conquer", "sorting", "heap-priority-queue", "quickselect", "neetcode-150"],
  statement: [
    "Return the `k`th largest value in `nums`.",
    "",
    "Equal values are separate ranks: the value that appears twice can be both the first and the second largest.",
  ].join("\n"),
  examples: [
    {
      args: [[3, 2, 1, 5, 6, 4], 2],
      output: "5",
      explanation: "Sorted from largest to smallest the array is 6, 5, 4, 3, 2, 1. The second is 5.",
    },
    {
      args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4],
      output: "4",
      explanation: "The largest values are 6, 5, 5, 4. The fourth is 4.",
    },
    {
      args: [[1], 1],
      output: "1",
      explanation: "The only value is the first largest.",
    },
  ],
  constraints: ["`1 <= k <= nums.length <= 10⁵`", "`-10⁴ <= nums[i] <= 10⁴`"],
  testcases: [
    {
      args: [[3, 2, 1, 5, 6, 4], 2],
      expected: "5",
      note: "Second largest, not second smallest.",
    },
    {
      args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4],
      expected: "4",
      note: "Duplicate 5s occupy two ranks, so the fourth largest is 4.",
    },
    {
      args: [[1], 1],
      expected: "1",
      note: "One element, k is 1.",
    },
    {
      args: [[7, 6, 5, 4, 3, 2, 1], 1],
      expected: "7",
      hidden: true,
      note: "the largest value",
    },
    {
      args: [[7, 6, 5, 4, 3, 2, 1], 7],
      expected: "1",
      hidden: true,
      note: "k equals the length, so the answer is the smallest value",
    },
    {
      args: [[-1, -2, -3], 1],
      expected: "-1",
      hidden: true,
      note: "all negative; the largest is the least negative",
    },
    {
      args: [[2, 2, 2, 2], 2],
      expected: "2",
      hidden: true,
      note: "every rank is the same value",
    },
    {
      args: [[5, 1], 2],
      expected: "1",
      hidden: true,
      note: "the second largest of two values",
    },
    {
      args: [[-10, 100, -5], 2],
      expected: "-5",
      hidden: true,
      note: "the second largest sits between a large positive and a smaller negative",
    },
    {
      args: [[1, 2, 3, 4, 5], 3],
      expected: "3",
      hidden: true,
      note: "already sorted ascending",
    },
    {
      args: [[-10000, 10000], 1],
      expected: "10000",
      hidden: true,
      note: "the constraint bounds, k is 1",
    },
  ],
  starterCode: {
    python: `class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        `,
  },
  notes: {
    approach:
      "Turn the array into a min-heap, then throw away the smallest value until `k` elements remain. What is left are the `k` largest values, and the root of the heap is the smallest of them, which is the `k`th largest.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "findKthLargest",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "k", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/kth-largest-element-in-an-array/",
  reference: `from heapq import heapify, heappop
# Solution: Sorting
# Time Complexity:
#   - Best Case: O(n*log(k))
#   - Average Case: O(n*log(k))
#   - Worst Case:O(n*log(k))
# Extra Space Complexity: O(k)
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        heapify(nums)
        while len(nums) > k:
            heappop(nums)
        return nums[0]

# Solution: Sorting
# Time Complexity:
#   - Best Case: O(n)
#   - Average Case: O(n*log(n))
#   - Worst Case:O(n*log(n))
# Extra Space Complexity: O(n)
class Solution1:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        nums.sort()
        return nums[len(nums) - k]


# Solution: QuickSelect
# Time Complexity: O(n)
# Extra Space Complexity: O(n)
class Solution2:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        pivot = random.choice(nums)
        left = [num for num in nums if num > pivot]
        mid = [num for num in nums if num == pivot]
        right = [num for num in nums if num < pivot]

        length_left = len(left)
        length_right = len(right)
        length_mid = len(mid)
        if k <= length_left:
            return self.findKthLargest(left, k)
        elif k > length_left + length_mid:
            return self.findKthLargest(right, k - length_mid - length_left)
        else:
            return mid[0]
`,
  rejection: `class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        # kth smallest, read from the other end of the sorted array.
        ordered = sorted(nums)
        return ordered[k - 1]
`,
} satisfies AuthoredProblem;
