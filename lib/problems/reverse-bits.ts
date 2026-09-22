import type { AuthoredProblem } from "./authoring";

export const reverseBits = {
  slug: "reverse-bits",
  number: 190,
  title: "Reverse Bits",
  difficulty: "easy",
  tags: ["divide-and-conquer", "bit-manipulation", "neetcode-150"],
  statement: [
    "Treat `n` as a 32-bit unsigned value and return the value whose bits are those 32 bits in the opposite order.",
    "",
    "The input is even — its lowest bit is `0` — so the reversed value's highest bit is `0` as well and the answer always fits in a signed 32-bit integer. All 32 positions take part in the reversal, including the leading zeros, so the answer is not the reversal of just the bits up to the highest set one.",
  ].join("\n"),
  examples: [
    {
      args: [43261596],
      output: "964176192",
      explanation:
        "`43261596` is `00000010100101000001111010011100`, which reversed reads `00111001011110000010100101000000`, or `964176192`.",
    },
    {
      args: [2147483644],
      output: "1073741822",
      explanation:
        "`2147483644` is thirty `1`s followed by two `0`s; reversing puts the two zeros at the front, which is `1073741822`.",
    },
  ],
  constraints: [
    "`0 <= n <= 2³¹ - 2`",
    "`n` is even, so the reversed value never sets the sign bit.",
    "All 32 bit positions take part, including the leading zeros.",
  ],
  testcases: [
    {
      args: [43261596],
      expected: "964176192",
      note: "The classic mixed pattern; its reversal is 964176192.",
    },
    {
      args: [2147483644],
      expected: "1073741822",
      note: "Almost every bit is set, so the reversal is close to the top of the range.",
    },
    {
      args: [0],
      expected: "0",
      hidden: true,
      note: "zero is its own reversal",
    },
    {
      args: [2],
      expected: "1073741824",
      hidden: true,
      note: "the lowest bit of the reversed value comes from the input's second bit",
    },
    {
      args: [4],
      expected: "536870912",
      hidden: true,
      note: "a single set bit one position higher",
    },
    {
      args: [6],
      expected: "1610612736",
      hidden: true,
      note: "two adjacent set bits reverse into the top two value bits",
    },
    {
      args: [10],
      expected: "1342177280",
      hidden: true,
      note: "an alternating pattern that reverses into another pattern",
    },
    {
      args: [12],
      expected: "805306368",
      hidden: true,
      note: "two adjacent bits in the middle of the low nibble",
    },
    {
      args: [100],
      expected: "637534208",
      hidden: true,
      note: "a value whose reversal lands in the millions",
    },
    {
      args: [1073741824],
      expected: "2",
      hidden: true,
      note: "a single high bit reverses down to the second bit",
    },
    {
      args: [2147483646],
      expected: "2147483646",
      hidden: true,
      note: "the largest legal input; its bit pattern reads the same both ways",
    },
    {
      args: [858993460],
      expected: "751619276",
      hidden: true,
      note: "a repeating four-bit pattern",
    },
  ],
  starterCode: {
    python: `class Solution:
    def reverseBits(self, n: int) -> int:
        `,
  },
  notes: {
    approach:
      "Walk the 32 positions of the input. Bit `i` of the input becomes bit `31 - i` of the answer, so shifting that bit left by `31 - i` and adding it to a running total reverses the whole width in one pass — including the leading zeros, which is what makes the width matter. Python integers can be any size, but the even-input rule keeps the result inside a signed 32-bit integer.",
    timeComplexity: "O(1) — 32 rounds",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "reverseBits",
    params: [{ name: "n", kind: "int" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/reverse-bits/",
  reference: `class Solution:
    def reverseBits(self, n: int) -> int:
        res = 0
        for i in range(32):
            bit = (n >> i) & 1
            res += (bit << (31 - i))
        return res
`,
  rejection: `class Solution:
    def reverseBits(self, n):
        # Thirty-one rounds leave bit 0 of the input with nowhere to go, and
        # the whole result sits one position too low.
        res = 0
        for i in range(31):
            bit = (n >> i) & 1
            res += (bit << (30 - i))
        return res
`,
} satisfies AuthoredProblem;
