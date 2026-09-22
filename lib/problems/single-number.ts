import type { AuthoredProblem } from "./authoring";

export const singleNumber = {
  slug: "single-number",
  number: 136,
  title: "Single Number",
  difficulty: "easy",
  tags: ["array", "bit-manipulation", "neetcode-150"],
  statement: [
    "Every value in `nums` appears exactly twice, except for one value that appears exactly once. Return that value.",
    "",
    "A linear pass that uses constant extra space is the intended solution.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 2, 1]],
      output: "1",
      explanation: "`2` appears twice, so `1` is the only unpaired value.",
    },
    {
      args: [[4, 1, 2, 1, 2]],
      output: "4",
      explanation:
        "The two `1`s and the two `2`s pair up; `4` is left without a partner.",
    },
    {
      args: [[1]],
      output: "1",
      explanation: "One element means that element is the unpaired one.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 3 * 10⁴`",
    "`-3 * 10⁴ <= nums[i] <= 3 * 10⁴`",
    "Every value appears twice except one, which appears once.",
  ],
  testcases: [
    {
      args: [[2, 2, 1]],
      expected: "1",
      note: "The unpaired value sits after its pair.",
    },
    {
      args: [[4, 1, 2, 1, 2]],
      expected: "4",
      note: "Two pairs share the array with the answer, which comes first.",
    },
    {
      args: [[1]],
      expected: "1",
      note: "The smallest legal input: nothing to cancel against.",
    },
    {
      args: [[0]],
      expected: "0",
      hidden: true,
      note: "zero is a legal answer, so an accumulator left at its seed is wrong",
    },
    {
      args: [[7, 7, 0]],
      expected: "0",
      hidden: true,
      note: "the unpaired value is zero and the pair is non-zero",
    },
    {
      args: [[-1, -1, -2]],
      expected: "-2",
      hidden: true,
      note: "the answer is negative",
    },
    {
      args: [[5, 1, 5]],
      expected: "1",
      hidden: true,
      note: "the answer sits between the two halves of its pair",
    },
    {
      args: [[1, -1, 1]],
      expected: "-1",
      hidden: true,
      note: "cancelling leaves the signed value -1, not its magnitude",
    },
    {
      args: [[2, 2, -4, -4, 9, 9, 11]],
      expected: "11",
      hidden: true,
      note: "three pairs and a leftover at the far end",
    },
    {
      args: [[100, 100, -100]],
      expected: "-100",
      hidden: true,
      note: "positive and negative values that differ only in sign",
    },
    {
      args: [[0, 0, 3]],
      expected: "3",
      hidden: true,
      note: "a zero pair must cancel like any other pair",
    },
    {
      args: [[-3, -3, 5, 5, -7]],
      expected: "-7",
      hidden: true,
      note: "negative pairs cancel and leave a negative answer",
    },
  ],
  starterCode: {
    python: `class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "XOR is its own inverse: `a ^ a` is `0` and `a ^ 0` is `a`, so folding every element into one accumulator cancels each pair and leaves the value that had no partner. XOR also sees negative values as their two's-complement bits, so a negative answer falls out unchanged. A hash set or a sort would also work, but both spend more space or time than the problem needs.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "singleNumber",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/single-number/",
  reference: `class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        res = 0
        for n in nums:
            res = n ^ res
        return res
`,
  rejection: `class Solution:
    def singleNumber(self, nums):
        # Sorting groups equal values, but the unpaired value can be the last
        # element, and this loop never looks at it.
        nums = sorted(nums)
        i = 0
        while i + 1 < len(nums):
            if nums[i] != nums[i + 1]:
                return nums[i]
            i += 2
        return 0
`,
} satisfies AuthoredProblem;
