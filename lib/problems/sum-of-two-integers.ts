import type { AuthoredProblem } from "./authoring";

export const sumOfTwoIntegers = {
  slug: "sum-of-two-integers",
  number: 371,
  title: "Sum of Two Integers",
  difficulty: "medium",
  tags: ["math", "bit-manipulation", "neetcode-150"],
  statement: [
    "Return the sum of `a` and `b` without using the `+` or `-` operators.",
    "",
    "Both values are signed and may be negative, and the sum always fits in a signed 32-bit integer.",
  ].join("\n"),
  examples: [
    {
      args: [1, 2],
      output: "3",
      explanation:
        "`1 ^ 2` is `3` and there is no carry, so a single XOR already adds them.",
    },
    {
      args: [2, 3],
      output: "5",
      explanation:
        "`2 ^ 3` is `1` and `(2 & 3) << 1` is `4`; adding the carry back gives `5`.",
    },
    {
      args: [-1, 1],
      output: "0",
      explanation: "Opposite values cancel exactly.",
    },
  ],
  constraints: [
    "`-1000 <= a, b <= 1000`",
    "The result fits in a signed 32-bit integer.",
    "The `+` and `-` operators may not be used to compute the result.",
  ],
  testcases: [
    {
      args: [1, 2],
      expected: "3",
      note: "No bit carries, so XOR alone is the answer.",
    },
    {
      args: [2, 3],
      expected: "5",
      note: "One carry chain turns `1` into `5`.",
    },
    {
      args: [-1, 1],
      expected: "0",
      note: "A negative and a positive value that cancel.",
    },
    {
      args: [0, 0],
      expected: "0",
      hidden: true,
      note: "the smallest sum, with nothing to carry",
    },
    {
      args: [-1, 0],
      expected: "-1",
      hidden: true,
      note: "adding zero to a negative value returns it unchanged",
    },
    {
      args: [0, -5],
      expected: "-5",
      hidden: true,
      note: "a negative addend with a zero first argument",
    },
    {
      args: [-3, -7],
      expected: "-10",
      hidden: true,
      note: "two negatives cannot be handled by unsigned carrying alone",
    },
    {
      args: [-1000, -1000],
      expected: "-2000",
      hidden: true,
      note: "the smallest legal sum",
    },
    {
      args: [1000, 1000],
      expected: "2000",
      hidden: true,
      note: "a long carry chain out of the low bits",
    },
    {
      args: [1000, -1000],
      expected: "0",
      hidden: true,
      note: "the extremes of the range cancel",
    },
    {
      args: [-1000, 999],
      expected: "-1",
      hidden: true,
      note: "a negative result one away from zero",
    },
    {
      args: [500, -1],
      expected: "499",
      hidden: true,
      note: "subtracting one by adding a negative value",
    },
    {
      args: [17, -34],
      expected: "-17",
      hidden: true,
      note: "the carry crosses the sign boundary",
    },
  ],
  starterCode: {
    python: `class Solution:
    def getSum(self, a: int, b: int) -> int:
        `,
  },
  notes: {
    approach:
      "Binary addition splits into two parts: `a ^ b` is the sum without carries, and `(a & b) << 1` is the carry. Folding the carry back in and repeating until it is zero adds the two values with no arithmetic operator. Python's integers are unbounded, so shifting a negative value keeps producing new high bits instead of stopping; the vendored reference therefore routes the mixed-sign case through a sign-aware helper built from the same two operators.",
    timeComplexity: "O(1) — at most one round per bit of the widest operand",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "getSum",
    params: [
      { name: "a", kind: "int" },
      { name: "b", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/sum-of-two-integers/",
  reference: `class Solution:
    def getSum(self, a: int, b: int) -> int:
        def add(a, b):
            if not a or not b:
                return a or b
            return add(a ^ b, (a & b) << 1)

        if a * b < 0:  # assume a < 0, b > 0
            if a > 0:
                return self.getSum(b, a)
            if add(~a, 1) == b:  # -a == b
                return 0
            if add(~a, 1) < b:  # -a < b
                return add(~add(add(~a, 1), add(~b, 1)), 1)  # -add(-a, -b)

        return add(a, b)  # a*b >= 0 or (-a) > b > 0
`,
  rejection: `class Solution:
    def getSum(self, a, b):
        # XOR adds without carries, which is only the whole answer when no bit
        # position carries into the next one.
        return a ^ b
`,
} satisfies AuthoredProblem;
