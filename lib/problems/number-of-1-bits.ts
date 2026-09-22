import type { AuthoredProblem } from "./authoring";

export const numberOf1Bits = {
  slug: "number-of-1-bits",
  number: 191,
  title: "Number of 1 Bits",
  difficulty: "easy",
  tags: ["divide-and-conquer", "bit-manipulation", "neetcode-150"],
  statement: [
    "Given a positive integer `n`, return how many of its 32 bits are set to `1` — the Hamming weight of its binary representation.",
    "",
    "Leading zeros are not counted; only the bits that are `1` contribute.",
  ].join("\n"),
  examples: [
    {
      args: [11],
      output: "3",
      explanation: "`11` is `1011` in binary, which has three set bits.",
    },
    {
      args: [128],
      output: "1",
      explanation: "`128` is a single `1` followed by seven zeros.",
    },
    {
      args: [2147483645],
      output: "30",
      explanation:
        "`2147483645` is `2³¹ - 3`, so its lowest two bits are `0` and the other thirty are `1`.",
    },
  ],
  constraints: [
    "`1 <= n <= 2³¹ - 1`",
    "`n` is positive, so its sign bit is never set.",
  ],
  testcases: [
    {
      args: [11],
      expected: "3",
      note: "A short binary number with three set bits.",
    },
    {
      args: [128],
      expected: "1",
      note: "A single high bit inside the low byte.",
    },
    {
      args: [2147483645],
      expected: "30",
      note: "A near-maximum value whose two lowest bits are clear.",
    },
    {
      args: [1],
      expected: "1",
      hidden: true,
      note: "the smallest legal input",
    },
    {
      args: [2],
      expected: "1",
      hidden: true,
      note: "one set bit that is not the lowest one",
    },
    {
      args: [3],
      expected: "2",
      hidden: true,
      note: "two adjacent set bits",
    },
    {
      args: [1024],
      expected: "1",
      hidden: true,
      note: "a single bit above the first byte",
    },
    {
      args: [1023],
      expected: "10",
      hidden: true,
      note: "ten consecutive set bits",
    },
    {
      args: [65535],
      expected: "16",
      hidden: true,
      note: "sixteen consecutive set bits",
    },
    {
      args: [2147483646],
      expected: "30",
      hidden: true,
      note: "thirty set bits with the lowest bit clear",
    },
    {
      args: [2147483647],
      expected: "31",
      hidden: true,
      note: "the largest legal input: all thirty-one value bits are set",
    },
    {
      args: [1073741824],
      expected: "1",
      hidden: true,
      note: "only the highest legal value bit is set",
    },
  ],
  starterCode: {
    python: `class Solution:
    def hammingWeight(self, n: int) -> int:
        `,
  },
  notes: {
    approach:
      "`n & (n - 1)` clears the lowest set bit, so counting how many times that can be done before `n` reaches zero is the number of set bits — one iteration per `1`, not per bit position. A fixed 32-round mask-and-shift loop gives the same answer; the version here just stops early. Python integers are unbounded, but the input is a positive 32-bit value, so the sign bit never matters.",
    timeComplexity: "O(1) — at most 32 rounds",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "hammingWeight",
    params: [{ name: "n", kind: "int" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/number-of-1-bits/",
  reference: `class Solution:
    def hammingWeight(self, n: int) -> int:
        res = 0
        while n:
            n &= n - 1
            res += 1
        return res
`,
  rejection: `class Solution:
    def hammingWeight(self, n):
        # Only the low sixteen bits are scanned, but n can be as large as
        # 2**31 - 1.
        res = 0
        for _ in range(16):
            res += n & 1
            n >>= 1
        return res
`,
} satisfies AuthoredProblem;
