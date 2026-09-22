import type { AuthoredProblem } from "./authoring";

export const productOfArrayExceptSelf = {
  slug: "product-of-array-except-self",
  number: 238,
  title: "Product of Array Except Self",
  difficulty: "medium",
  tags: ["array", "prefix-sum", "neetcode-150"],
  statement: [
    "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.",
    "",
    "The product of any prefix or suffix of `nums` is **guaranteed** to fit in a **32-bit** integer.",
    "",
    "You must write an algorithm that runs in `O(n)` time and without using the division operation.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 2, 3, 4]],
      output: "[24,12,8,6]",
      explanation:
        "answer[0] = 2·3·4, answer[1] = 1·3·4, answer[2] = 1·2·4, answer[3] = 1·2·3.",
    },
    {
      args: [[-1, 1, 0, -3, 3]],
      output: "[0,0,9,0,0]",
      explanation:
        "A single zero forces every other slot to 0; the slot at the zero is the product of the rest.",
    },
    {
      args: [[2, 3]],
      output: "[3,2]",
      explanation: "Minimum length: each answer is the other element.",
    },
  ],
  constraints: [
    "`2 <= nums.length <= 10⁵`",
    "`-30 <= nums[i] <= 30`",
    "The product of any prefix or suffix of `nums` is **guaranteed** to fit in a **32-bit** integer.",
  ],
  testcases: [
    {
      args: [[1, 2, 3, 4]],
      expected: "[24,12,8,6]",
      note: "answer[0] = 2·3·4, answer[1] = 1·3·4, answer[2] = 1·2·4, answer[3] = 1·2·3.",
    },
    {
      args: [[-1, 1, 0, -3, 3]],
      expected: "[0,0,9,0,0]",
      note: "A single zero forces every other slot to 0; the slot at the zero is the product of the rest.",
    },
    {
      args: [[2, 3]],
      expected: "[3,2]",
      note: "Minimum length: each answer is the other element.",
    },
    { args: [[1, 1]], expected: "[1,1]", hidden: true, note: "ones" },
    { args: [[0, 0]], expected: "[0,0]", hidden: true, note: "two zeros" },
    {
      args: [[0, 1, 2]],
      expected: "[2,0,0]",
      hidden: true,
      note: "one zero at the front",
    },
    {
      args: [[-1, -1]],
      expected: "[-1,-1]",
      hidden: true,
      note: "both negative",
    },
    { args: [[1, 0]], expected: "[0,1]", hidden: true, note: "zero at the end" },
    {
      args: [[-1, 2, -3, 4]],
      expected: "[-24,12,-8,6]",
      hidden: true,
      note: "mixed signs, no zeros",
    },
    {
      args: [[5, 1, 1, 1]],
      expected: "[1,5,5,5]",
      hidden: true,
      note: "one non-one at the front",
    },
    {
      args: [[1, 2, 0, 4]],
      expected: "[0,0,8,0]",
      hidden: true,
      note: "one zero in the middle",
    },
  ],
  starterCode: {
    python: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        `,
  },
  notes: {
    approach:
      "answer[i] is the product of everything strictly left of i times everything strictly right of i. Fill those prefix products left to right, then multiply the suffix products on a right-to-left pass. Division is unnecessary, and a zero is just a 0 in the prefix or suffix.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "productExceptSelf",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int[]",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/product-of-array-except-self/",
  reference: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        answer = [1] * n
        prefix = 1
        for i in range(n):
            answer[i] = prefix
            prefix *= nums[i]
        suffix = 1
        for i in range(n - 1, -1, -1):
            answer[i] *= suffix
            suffix *= nums[i]
        return answer
`,
} satisfies AuthoredProblem;
