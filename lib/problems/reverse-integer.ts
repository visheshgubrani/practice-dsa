import type { AuthoredProblem } from "./authoring";

export const reverseInteger = {
  slug: "reverse-integer",
  number: 7,
  title: "Reverse Integer",
  difficulty: "medium",
  tags: ["math", "neetcode-150"],
  statement: [
    "Reverse the decimal digits of the signed integer `x` and return the result. A negative value keeps its sign, and leading zeros of the result are dropped: `120` becomes `21`.",
    "",
    "If the reversed value would fall outside the signed 32-bit range `-2³¹` to `2³¹ - 1`, return `0` instead.",
  ].join("\n"),
  examples: [
    {
      args: [123],
      output: "321",
      explanation: "The digits reverse into `321`, which is inside the 32-bit range.",
    },
    {
      args: [-123],
      output: "-321",
      explanation: "The sign is kept and only the digits are reversed.",
    },
    {
      args: [120],
      output: "21",
      explanation:
        "Reversing gives `021`, and the leading zero is not part of the number.",
    },
  ],
  constraints: [
    "`-2³¹ <= x <= 2³¹ - 1`",
    "The result must be `0` whenever the reversed value does not fit in a signed 32-bit integer.",
    "The answer is returned as an integer; it is never clamped to the range's boundary.",
  ],
  testcases: [
    {
      args: [123],
      expected: "321",
      note: "A plain positive reversal.",
    },
    {
      args: [-123],
      expected: "-321",
      note: "The sign survives the reversal.",
    },
    {
      args: [120],
      expected: "21",
      note: "A trailing zero disappears into the result's leading position.",
    },
    {
      args: [0],
      expected: "0",
      hidden: true,
      note: "zero reverses to itself",
    },
    {
      args: [10],
      expected: "1",
      hidden: true,
      note: "the smallest value with a trailing zero",
    },
    {
      args: [1200000000],
      expected: "21",
      hidden: true,
      note: "many trailing zeros leave a short result",
    },
    {
      args: [1463847412],
      expected: "2147483641",
      hidden: true,
      note: "reverses to 2147483641, just inside the range",
    },
    {
      args: [-1463847412],
      expected: "-2147483641",
      hidden: true,
      note: "the negative boundary case, just inside the range",
    },
    {
      args: [1534236469],
      expected: "0",
      hidden: true,
      note: "reverses to a ten-digit value, so the answer is zero",
    },
    {
      args: [-1534236469],
      expected: "0",
      hidden: true,
      note: "the same overflow below zero",
    },
    {
      args: [1563847412],
      expected: "0",
      hidden: true,
      note: "reverses to 2147483651, one step outside the range",
    },
    {
      args: [2147483647],
      expected: "0",
      hidden: true,
      note: "the largest legal input overflows when reversed",
    },
    {
      args: [-2147483648],
      expected: "0",
      hidden: true,
      note: "the smallest legal input also overflows when reversed",
    },
  ],
  starterCode: {
    python: `class Solution:
    def reverse(self, x: int) -> int:
        `,
  },
  notes: {
    approach:
      "Peel digits off the right with `fmod(x, 10)` and rebuild the number on the left, checking before every step whether the current result is already too large to be multiplied by ten. Python's `%` and `//` round towards negative infinity, so `fmod` and `int(x / 10)` truncate towards zero instead and keep the sign handling straight. The bounds check has to run before the last digit is appended; checking after the fact would need a bigger integer than the language's 32-bit range.",
    timeComplexity: "O(1) — at most 10 digits",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "reverse",
    params: [{ name: "x", kind: "int" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/reverse-integer/",
  reference: `class Solution:
    def reverse(self, x: int) -> int:
        # Integer.MAX_VALUE = 2147483647 (end with 7)
        # Integer.MIN_VALUE = -2147483648 (end with -8 )

        MIN = -2147483648  # -2^31,
        MAX = 2147483647  #  2^31 - 1

        res = 0
        while x:
            digit = int(math.fmod(x, 10))  # (python dumb) -1 %  10 = 9
            x = int(x / 10)  # (python dumb) -1 // 10 = -1

            if res > MAX // 10 or (res == MAX // 10 and digit > MAX % 10):
                return 0
            if res < MIN // 10 or (res == MIN // 10 and digit < MIN % 10):
                return 0
            res = (res * 10) + digit

        return res
`,
  rejection: `class Solution:
    def reverse(self, x):
        # The digits are rebuilt correctly, but nothing stops the value from
        # leaving the 32-bit range.
        res = 0
        while x:
            digit = int(math.fmod(x, 10))
            x = int(x / 10)
            res = (res * 10) + digit
        return res
`,
} satisfies AuthoredProblem;
