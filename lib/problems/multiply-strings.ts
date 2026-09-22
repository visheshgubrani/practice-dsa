import type { AuthoredProblem } from "./authoring";

/** 50 nines — the widest authored case, with a 100-digit product. */
const FIFTY_NINES = "99999999999999999999999999999999999999999999999999";

export const multiplyStrings = {
  slug: "multiply-strings",
  number: 43,
  title: "Multiply Strings",
  difficulty: "medium",
  tags: ["math", "string", "simulation", "neetcode-150"],
  statement: [
    "Multiply two non-negative integers that arrive as decimal strings and return their product as a decimal string.",
    "",
    "The values may be far too large for a machine integer — up to 200 digits each — so the product has to be built digit by digit. Converting either string to an integer, or using a big-integer type, is not allowed.",
  ].join("\n"),
  examples: [
    {
      args: ["2", "3"],
      output: "\"6\"",
      explanation: "Single digits multiply directly.",
    },
    {
      args: ["123", "456"],
      output: "\"56088\"",
      explanation:
        "The partial products overlap, so carries move left through the result array.",
    },
    {
      args: ["0", "52"],
      output: "\"0\"",
      explanation:
        "A zero operand makes the whole product zero, and the answer is the single digit `0`.",
    },
  ],
  constraints: [
    "`1 <= num1.length, num2.length <= 200`",
    "Both strings contain digits only.",
    "Neither string has a leading zero, except the string `\"0\"` itself.",
    "The product is returned without leading zeros, and zero is returned as `\"0\"`.",
  ],
  testcases: [
    {
      args: ["2", "3"],
      expected: "\"6\"",
      note: "A single-digit product with no carry.",
    },
    {
      args: ["123", "456"],
      expected: "\"56088\"",
      note: "A product two digits longer than either operand.",
    },
    {
      args: ["0", "52"],
      expected: "\"0\"",
      note: "Zero on the left; the answer is not an empty string.",
    },
    {
      args: ["0", "0"],
      expected: "\"0\"",
      hidden: true,
      note: "both operands are zero",
    },
    {
      args: ["9", "9"],
      expected: "\"81\"",
      hidden: true,
      note: "the first product that needs a carry",
    },
    {
      args: ["10", "10"],
      expected: "\"100\"",
      hidden: true,
      note: "trailing zeros in the operands become trailing zeros in the product",
    },
    {
      args: ["99", "99"],
      expected: "\"9801\"",
      hidden: true,
      note: "two carries out of adjacent positions",
    },
    {
      args: ["1", "999"],
      expected: "\"999\"",
      hidden: true,
      note: "multiplying by one returns the other operand unchanged",
    },
    {
      args: ["408", "5"],
      expected: "\"2040\"",
      hidden: true,
      note: "a zero in the middle of the first operand",
    },
    {
      args: ["999", "999"],
      expected: "\"998001\"",
      hidden: true,
      note: "the product is one digit longer than the operands",
    },
    {
      args: ["2000000000", "3"],
      expected: "\"6000000000\"",
      hidden: true,
      note: "the result keeps zeros that follow a non-zero digit",
    },
    {
      args: ["123456789", "987654321"],
      expected: "\"121932631112635269\"",
      hidden: true,
      note: "nine-digit operands, where every position accumulates several products",
    },
    {
      args: [FIFTY_NINES, FIFTY_NINES],
      expected: "\"9999999999999999999999999999999999999999999999999800000000000000000000000000000000000000000000000001\"",
      hidden: true,
      note: "fifty nines squared, the widest authored carry chain",
    },
  ],
  starterCode: {
    python: `class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        `,
  },
  notes: {
    approach:
      "Digit `i` of one number and digit `j` of the other always contribute to position `i + j` of the product, so one result array of length `m + n` is enough. Reverse both strings, add each pairwise digit product into its position, and carry left out of that position immediately; afterwards skip the leading zeros and join the digits. Multiplying character codes or converting the operands to integers both step outside the problem's contract.",
    timeComplexity: "O(m * n)",
    spaceComplexity: "O(m + n) for the result array",
  },
  signature: {
    name: "multiply",
    params: [
      { name: "num1", kind: "string" },
      { name: "num2", kind: "string" },
    ],
    returns: "string",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/multiply-strings/",
  reference: `class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if "0" in [num1, num2]:
            return "0"

        res = [0] * (len(num1) + len(num2))
        num1, num2 = num1[::-1], num2[::-1]
        for i1 in range(len(num1)):
            for i2 in range(len(num2)):
                digit = int(num1[i1]) * int(num2[i2])
                res[i1 + i2] += digit
                res[i1 + i2 + 1] += res[i1 + i2] // 10
                res[i1 + i2] = res[i1 + i2] % 10

        res, beg = res[::-1], 0
        while beg < len(res) and res[beg] == 0:
            beg += 1
        res = map(str, res[beg:])
        return "".join(res)
`,
  rejection: `class Solution:
    def multiply(self, num1, num2):
        # Partial products pile up in the same position: without carrying, a
        # position can hold a value larger than nine.
        res = [0] * (len(num1) + len(num2))
        a, b = num1[::-1], num2[::-1]
        for i in range(len(a)):
            for j in range(len(b)):
                res[i + j] += int(a[i]) * int(b[j])

        res = res[::-1]
        beg = 0
        while beg < len(res) - 1 and res[beg] == 0:
            beg += 1
        return "".join(map(str, res[beg:]))
`,
} satisfies AuthoredProblem;
