import type { AuthoredProblem } from "./authoring";

export const findTheDuplicateNumber = {
  slug: "find-the-duplicate-number",
  number: 287,
  title: "Find the Duplicate Number",
  difficulty: "medium",
  tags: ["array", "two-pointers", "binary-search", "bit-manipulation", "pigeonhole-principle", "floyds-cycle-finding-algorithm", "neetcode-150"],
  statement: [
    "`nums` holds `n + 1` integers, each of them between `1` and `n`, so at least one value must repeat. Exactly one value repeats; it may appear twice or more often than that. Return the repeated value.",
    "",
    "Solve it without changing `nums` and with constant extra space, so neither sorting the array nor keeping a set of seen values is allowed.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 3, 4, 2, 2]],
      output: "2",
      explanation:
        "The values `1` to `4` fill the range except for `2`, which appears twice.",
    },
    {
      args: [[3, 1, 3, 4, 2]],
      output: "3",
      explanation:
        "`3` is repeated; the other values each appear once.",
    },
    {
      args: [[3, 3, 3, 3, 3]],
      output: "3",
      explanation:
        "The same value can fill the whole array — the duplicate is not limited to appearing twice.",
    },
  ],
  constraints: [
    "`1 <= n <= 10⁵`",
    "`nums.length == n + 1`",
    "`1 <= nums[i] <= n`",
    "Exactly one value repeats; every other value appears once or not at all.",
    "`nums` must not be modified, and only constant extra space may be used.",
  ],
  testcases: [
    {
      args: [[1, 3, 4, 2, 2]],
      expected: "2",
      note: "The repeated value is smaller than the largest present value.",
    },
    {
      args: [[3, 1, 3, 4, 2]],
      expected: "3",
      note: "The repeat sits at both ends of the array.",
    },
    {
      args: [[3, 3, 3, 3, 3]],
      expected: "3",
      note: "One value fills the array, so no other value is present at all.",
    },
    {
      args: [[1, 1]],
      expected: "1",
      hidden: true,
      note: "the smallest legal input",
    },
    {
      args: [[2, 2, 1]],
      expected: "2",
      hidden: true,
      note: "the duplicate is the largest value",
    },
    {
      args: [[1, 2, 2]],
      expected: "2",
      hidden: true,
      note: "the duplicate sits at the end",
    },
    {
      args: [[2, 1, 1]],
      expected: "1",
      hidden: true,
      note: "the duplicate is the smallest value",
    },
    {
      args: [[1, 4, 4, 2, 3]],
      expected: "4",
      hidden: true,
      note: "a middle value repeats while every position is still filled",
    },
    {
      args: [[4, 3, 4, 1, 2]],
      expected: "4",
      hidden: true,
      note: "the duplicate is the first element and also appears later",
    },
    {
      args: [[1, 2, 3, 4, 5, 5]],
      expected: "5",
      hidden: true,
      note: "the array is sorted and the repeat is adjacent at the end",
    },
    {
      args: [[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]],
      expected: "9",
      hidden: true,
      note: "a value repeated three times with a different value absent",
    },
    {
      args: [[7, 9, 7, 4, 2, 8, 7, 7, 1, 5]],
      expected: "7",
      hidden: true,
      note: "a value repeated four times",
    },
    {
      args: [[6, 1, 4, 6, 3, 2, 5, 6]],
      expected: "6",
      hidden: true,
      note: "the repeated value is the largest and its top neighbour is absent",
    },
  ],
  starterCode: {
    python: `class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Read the array as a linked list: index `i` points at index `nums[i]`. Because some value repeats, two indices lead into the same chain and the walk from index `0` eventually enters a cycle, and the value where that cycle begins is the repeated number. Floyd's two-pointer walk finds a meeting point inside the cycle without extra memory; a second walker starting from index `0` and moving one step at a time meets the first exactly at the cycle's entry. Nothing is written to `nums` and no other storage is used.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "findDuplicate",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/find-the-duplicate-number/",
  reference: `class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        slow, fast = 0, 0
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break

        slow2 = 0
        while True:
            slow = nums[slow]
            slow2 = nums[slow2]
            if slow == slow2:
                return slow
`,
  rejection: `class Solution:
    def findDuplicate(self, nums):
        # Where the two walkers meet is inside the cycle, not at its entry; the
        # second walk is what turns the meeting point into the answer.
        slow, fast = 0, 0
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                return slow
`,
} satisfies AuthoredProblem;
