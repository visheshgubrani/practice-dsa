import type { AuthoredProblem } from "./authoring";

export const missingNumber = {
  slug: "missing-number",
  number: 268,
  title: "Missing Number",
  difficulty: "easy",
  tags: ["array", "hash-table", "math", "binary-search", "bit-manipulation", "sorting", "neetcode-150"],
  statement: [
    "`nums` holds `n` distinct integers drawn from the range `0` to `n`. Exactly one value in that range is absent. Return the absent value.",
    "",
    "The array is not sorted, and the values are not necessarily in any order.",
  ].join("\n"),
  examples: [
    {
      args: [[3, 0, 1]],
      output: "2",
      explanation:
        "With three values the range is `0..3`; `0`, `1` and `3` are present, so `2` is missing.",
    },
    {
      args: [[0, 1]],
      output: "2",
      explanation:
        "The range is `0..2` and both present values are the low two, so the missing value is the top of the range.",
    },
    {
      args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]],
      output: "8",
      explanation:
        "Nine values fill `0..9` except `8`, so the answer is `8` even though the array is shuffled.",
    },
  ],
  constraints: [
    "`n == nums.length`",
    "`1 <= n <= 10⁴`",
    "`0 <= nums[i] <= n`",
    "All the values in `nums` are distinct.",
    "Exactly one value in `0..n` is missing, so the answer can be `0` or `n` itself.",
  ],
  testcases: [
    {
      args: [[3, 0, 1]],
      expected: "2",
      note: "The missing value is in the middle of the range.",
    },
    {
      args: [[0, 1]],
      expected: "2",
      note: "The missing value is the largest one, which is also `n`.",
    },
    {
      args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]],
      expected: "8",
      note: "A long shuffled array; position says nothing about the answer.",
    },
    {
      args: [[0]],
      expected: "1",
      hidden: true,
      note: "the smallest legal input; the missing value is n itself",
    },
    {
      args: [[1]],
      expected: "0",
      hidden: true,
      note: "zero is missing, so an accumulator starting at zero is not enough",
    },
    {
      args: [[2, 1]],
      expected: "0",
      hidden: true,
      note: "zero is the absent value in a two-element array",
    },
    {
      args: [[0, 2]],
      expected: "1",
      hidden: true,
      note: "the absent value sits between the two present ones",
    },
    {
      args: [[1, 2, 3]],
      expected: "0",
      hidden: true,
      note: "the absent value is the bottom of the range",
    },
    {
      args: [[0, 1, 3]],
      expected: "2",
      hidden: true,
      note: "a gap at the top of a sorted prefix",
    },
    {
      args: [[0, 1, 2, 4]],
      expected: "3",
      hidden: true,
      note: "the missing value is not the last element",
    },
    {
      args: [[4, 2, 1, 0]],
      expected: "3",
      hidden: true,
      note: "the missing value is in the middle of an unsorted array",
    },
    {
      args: [[0, 2, 3]],
      expected: "1",
      hidden: true,
      note: "one is missing and the rest are in order",
    },
    {
      args: [[4, 3, 2, 1, 0]],
      expected: "5",
      hidden: true,
      note: "every value below n is present, so the answer is n",
    },
  ],
  starterCode: {
    python: `class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "The values `0..n` add up to `n * (n + 1) / 2`. Subtracting the array's total from that sum leaves exactly the value that is absent, in one pass and without sorting or a set. The reference does the same arithmetic incrementally: it starts from `len(nums)` — the value `n`, which is always part of the range — and then adds each index and subtracts each element.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "missingNumber",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/missing-number/",
  reference: `class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        res = len(nums)

        for i in range(len(nums)):
            res += i - nums[i]
        return res
`,
  rejection: `class Solution:
    def missingNumber(self, nums):
        # The running total starts at zero, so the value n is never accounted
        # for and the answer comes out n short.
        res = 0
        for i in range(len(nums)):
            res += i - nums[i]
        return res
`,
} satisfies AuthoredProblem;
