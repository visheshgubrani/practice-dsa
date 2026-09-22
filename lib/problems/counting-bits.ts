import type { AuthoredProblem } from "./authoring";

export const countingBits = {
  slug: "counting-bits",
  number: 338,
  title: "Counting Bits",
  difficulty: "easy",
  tags: ["dynamic-programming", "bit-manipulation", "neetcode-150"],
  statement: [
    "Return an array `ans` of length `n + 1` where `ans[i]` is the number of `1` bits in the binary representation of `i`, for every `i` from `0` to `n`.",
    "",
    "`ans[0]` is `0`, because zero has no set bits.",
  ].join("\n"),
  examples: [
    {
      args: [2],
      output: "[0,1,1]",
      explanation:
        "`0`, `1` and `2` are `0`, `1` and `10` in binary, so the counts are `0`, `1` and `1`.",
    },
    {
      args: [5],
      output: "[0,1,1,2,1,2]",
      explanation:
        "`3` is `11` with two set bits and `5` is `101` with two, which are the two entries larger than one.",
    },
  ],
  constraints: [
    "`0 <= n <= 10⁵`",
    "The answer must have exactly `n + 1` entries.",
  ],
  testcases: [
    {
      args: [2],
      expected: "[0,1,1]",
      note: "The shortest non-trivial run, including zero.",
    },
    {
      args: [5],
      expected: "[0,1,1,2,1,2]",
      note: "The first run that crosses a power of two and reaches two set bits.",
    },
    {
      args: [0],
      expected: "[0]",
      hidden: true,
      note: "the smallest legal input returns a single zero",
    },
    {
      args: [1],
      expected: "[0,1]",
      hidden: true,
      note: "the first entry that is one",
    },
    {
      args: [3],
      expected: "[0,1,1,2]",
      hidden: true,
      note: "two consecutive values with two set bits",
    },
    {
      args: [4],
      expected: "[0,1,1,2,1]",
      hidden: true,
      note: "a power of two resets the count to one",
    },
    {
      args: [7],
      expected: "[0,1,1,2,1,2,2,3]",
      hidden: true,
      note: "the run ends on a value whose bits are all set",
    },
    {
      args: [8],
      expected: "[0,1,1,2,1,2,2,3,1]",
      hidden: true,
      note: "the answer continues past a power of two",
    },
    {
      args: [15],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4]",
      hidden: true,
      note: "the highest four-bit value, then the next power of two",
    },
    {
      args: [16],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1]",
      hidden: true,
      note: "the offset doubles at this length",
    },
    {
      args: [17],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2]",
      hidden: true,
      note: "one past a power of two, so the offset must not advance again",
    },
    {
      args: [31],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5]",
      hidden: true,
      note: "a run of five consecutive set bits at its end",
    },
    {
      args: [45],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,1,2,2,3,2,3,3,4,2,3,3,4,3,4]",
      hidden: true,
      note: "a length that is not a power of two, with several offset changes",
    },
    {
      args: [255],
      expected: "[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,4,5,5,6,5,6,6,7,5,6,6,7,6,7,7,8]",
      hidden: true,
      note: "the longest authored run: eight set bits at the end",
    },
  ],
  starterCode: {
    python: `class Solution:
    def countBits(self, n: int) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Build the answer from smaller answers instead of counting each value from scratch. For an index `i`, stripping its lowest set bit (`i & (i - 1)`) leaves a smaller index whose count is already known, so `ans[i] = ans[i & (i - 1)] + 1`. The reference uses the equivalent trick of remembering the highest power of two seen so far and reading `ans[i - offset]`.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n) for the returned array, no other storage",
  },
  signature: {
    name: "countBits",
    params: [{ name: "n", kind: "int" }],
    returns: "int[]",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/counting-bits/",
  reference: `class Solution:
    def countBits(self, n: int) -> List[int]:
        dp = [0] * (n + 1)
        offset = 1

        for i in range(1, n + 1):
            if offset * 2 == i:
                offset = i
            dp[i] = 1 + dp[i - offset]
        return dp
`,
  rejection: `class Solution:
    def countBits(self, n):
        # The offset trick needs dp[i - offset], not a fixed earlier index; this
        # version is wrong from the first power of two onwards.
        dp = [0] * (n + 1)
        offset = 1
        for i in range(1, n + 1):
            if offset * 2 == i:
                offset = i
            dp[i] = 1 + dp[offset - 1]
        return dp
`,
} satisfies AuthoredProblem;
