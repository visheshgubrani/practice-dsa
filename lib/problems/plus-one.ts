import type { AuthoredProblem } from "./authoring";

export const plusOne = {
  slug: "plus-one",
  number: 66,
  title: "Plus One",
  difficulty: "easy",
  tags: ["array", "math", "neetcode-150"],
  statement: [
    "`digits` is the decimal representation of a non-negative integer, most significant digit first, with no leading zeros. Add one to that integer and return the resulting digits in the same order.",
    "",
    "The array can be as long as 100 digits, so the number itself may not fit in a machine integer.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 2, 3]],
      output: "[1,2,4]",
      explanation: "The last digit is not a nine, so only it changes.",
    },
    {
      args: [[4, 3, 2, 1]],
      output: "[4,3,2,2]",
      explanation: "Adding one touches only the units digit.",
    },
    {
      args: [[9]],
      output: "[1,0]",
      explanation:
        "The nine carries, so the array grows by one digit and every position becomes zero.",
    },
  ],
  constraints: [
    "`1 <= digits.length <= 100`",
    "`0 <= digits[i] <= 9`",
    "`digits` has no leading zeros, so `[0]` is the only representation of zero.",
  ],
  testcases: [
    {
      args: [[1, 2, 3]],
      expected: "[1,2,4]",
      note: "No carry at all.",
    },
    {
      args: [[4, 3, 2, 1]],
      expected: "[4,3,2,2]",
      note: "A four-digit number whose units digit is not nine.",
    },
    {
      args: [[9]],
      expected: "[1,0]",
      note: "A single nine, where the array must grow.",
    },
    {
      args: [[0]],
      expected: "[1]",
      hidden: true,
      note: "zero becomes one",
    },
    {
      args: [[9, 9]],
      expected: "[1,0,0]",
      hidden: true,
      note: "every digit carries",
    },
    {
      args: [[1, 9]],
      expected: "[2,0]",
      hidden: true,
      note: "the carry stops at the leading digit",
    },
    {
      args: [[2, 9, 9]],
      expected: "[3,0,0]",
      hidden: true,
      note: "a run of nines behind a digit that simply increments",
    },
    {
      args: [[8, 9, 9, 9]],
      expected: "[9,0,0,0]",
      hidden: true,
      note: "the leading digit grows from eight to nine",
    },
    {
      args: [[9, 8, 9]],
      expected: "[9,9,0]",
      hidden: true,
      note: "a carry ends in the middle of the number",
    },
    {
      args: [[1, 0, 0, 0]],
      expected: "[1,0,0,1]",
      hidden: true,
      note: "interior zeros are untouched",
    },
    {
      args: [[5, 9, 9, 9, 9]],
      expected: "[6,0,0,0,0]",
      hidden: true,
      note: "four nines carry into the leading five",
    },
    {
      args: [[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]],
      expected: "[1,0,0,0,0,0,0,0,0,0,0,0,0]",
      hidden: true,
      note: "the whole array carries, so the result has one more digit",
    },
  ],
  starterCode: {
    python: `class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Walk from the least significant digit and set every trailing nine to zero; the first digit that is not a nine increments and the walk stops. If the walk runs off the front, every digit was a nine, so the answer is a `1` followed by as many zeros as there were digits. The reference reverses the array first so the carry moves left to right, then reverses it back.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n) for the returned array",
  },
  signature: {
    name: "plusOne",
    params: [{ name: "digits", kind: "int[]" }],
    returns: "int[]",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/plus-one/",
  reference: `class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        one = 1
        i = 0
        digits = digits[::-1]

        while one:
            if i < len(digits):
                if digits[i] == 9:
                    digits[i] = 0
                else:
                    digits[i] += 1
                    one = 0
            else:
                digits.append(one)
                one = 0
            i += 1
        return digits[::-1]
`,
  rejection: `class Solution:
    def plusOne(self, digits):
        # Incrementing the last digit is only enough while that digit is not a
        # nine, and the array must grow when every digit is a nine.
        digits[-1] += 1
        return digits
`,
} satisfies AuthoredProblem;
