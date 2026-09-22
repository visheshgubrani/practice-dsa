import type { AuthoredProblem } from "./authoring";

export const slidingWindowMaximum = {
  slug: "sliding-window-maximum",
  number: 239,
  title: "Sliding Window Maximum",
  difficulty: "hard",
  tags: ["array", "queue", "sliding-window", "heap-priority-queue", "monotonic-queue", "neetcode-150"],
  statement: [
    "A window of size `k` moves from the left of `nums` to the right, one position at a time.",
    "",
    "Return the maximum of each window, in the order the windows appear. The result has exactly `nums.length - k + 1` entries.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 3, -1, -3, 5, 3, 6, 7], 3],
      output: "[3,3,5,5,6,7]",
      explanation:
        "The windows are `[1,3,-1]`, `[3,-1,-3]`, `[-1,-3,5]`, `[-3,5,3]`, `[5,3,6]`, `[3,6,7]`; their maxima are `3, 3, 5, 5, 6, 7`.",
    },
    {
      args: [[1], 1],
      output: "[1]",
      explanation: "One element and a window of one give a single maximum.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁵`",
    "`-10⁴ <= nums[i] <= 10⁴`",
    "`1 <= k <= nums.length`",
  ],
  testcases: [
    {
      args: [[1, 3, -1, -3, 5, 3, 6, 7], 3],
      expected: "[3,3,5,5,6,7]",
      note: "A maximum can repeat across neighbouring windows.",
    },
    {
      args: [[1], 1],
      expected: "[1]",
      note: "Minimum length with a window covering the whole array.",
    },
    { args: [[1, 2], 1], expected: "[1,2]", hidden: true, note: "a window of one returns the array itself" },
    { args: [[1, 2], 2], expected: "[2]", hidden: true, note: "a window covering everything returns one value" },
    { args: [[3, 3, 3], 2], expected: "[3,3]", hidden: true, note: "all values equal" },
    { args: [[-1, -2, -3], 2], expected: "[-1,-2]", hidden: true, note: "all values negative" },
    {
      args: [[-10000, 10000], 2],
      expected: "[10000]",
      hidden: true,
      note: "constraint-boundary magnitudes",
    },
    { args: [[5, 4, 3, 2, 1], 3], expected: "[5,4,3]", hidden: true, note: "strictly decreasing" },
    { args: [[1, 2, 3, 4, 5], 3], expected: "[3,4,5]", hidden: true, note: "strictly increasing" },
    {
      args: [[1, 3, 1, 2, 0, 5], 3],
      expected: "[3,3,2,5]",
      hidden: true,
      note: "the maximum leaves and re-enters the window",
    },
    { args: [[7, 2, 4], 2], expected: "[7,4]", hidden: true, note: "a short array with k just under its length" },
    { args: [[9, 11], 2], expected: "[11]", hidden: true, note: "the largest value is last" },
    {
      args: [[9, 8, 7, 1], 2],
      expected: "[9,8,7]",
      hidden: true,
      note: "each maximum leaves the window on the next step",
    },
  ],
  starterCode: {
    python: `class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Keep a deque of indices whose values are decreasing from front to back. A new value pops every smaller index behind it, because those can never be a maximum again while the new value is in the window; the front is always the current maximum, and it is dropped once its index leaves the window. Each index enters and leaves the deque once.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(k)",
  },
  signature: {
    name: "maxSlidingWindow",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "k", kind: "int" },
    ],
    returns: "int[]",
  },
  // One maximum per window, and the windows are ordered, so the answer is a
  // sequence rather than a set.
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/sliding-window-maximum/",
  reference: `class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        output = []
        q = collections.deque()  # index
        l = r = 0
        # O(n) O(n)
        while r < len(nums):
            # pop smaller values from q
            while q and nums[q[-1]] < nums[r]:
                q.pop()
            q.append(r)

            # remove left val from window
            if l > q[0]:
                q.popleft()

            if (r + 1) >= k:
                output.append(nums[q[0]])
                l += 1
            r += 1

        return output
`,
  rejection: `class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        # Monotonic deque that never drops the index leaving the window, so a
        # maximum that has already scrolled out can still be reported.
        q = collections.deque()
        output = []
        for index, value in enumerate(nums):
            while q and nums[q[-1]] <= value:
                q.pop()
            q.append(index)
            if index >= k - 1:
                output.append(nums[q[0]])
        return output
`,
} satisfies AuthoredProblem;
