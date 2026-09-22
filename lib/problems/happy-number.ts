import type { AuthoredProblem } from "./authoring";

export const happyNumber = {
  slug: "happy-number",
  number: 202,
  title: "Happy Number",
  difficulty: "easy",
  tags: ["hash-table", "math", "two-pointers", "floyds-cycle-finding-algorithm", "neetcode-150"],
  statement: [
    "Replace `n` with the sum of the squares of its decimal digits, and repeat. If the process reaches `1`, `n` is happy and the answer is `true`.",
    "",
    "A number that is not happy never reaches `1`: its values fall into a cycle that does not contain `1`, so the process never ends. The answer is then `false`.",
  ].join("\n"),
  examples: [
    {
      args: [19],
      output: "true",
      explanation:
        "`19 → 1² + 9² = 82 → 68 → 100 → 1`, so the process reaches one.",
    },
    {
      args: [2],
      output: "false",
      explanation:
        "`2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4` returns to `4`, so it cycles without ever reaching `1`.",
    },
  ],
  constraints: [
    "`1 <= n <= 2³¹ - 1`",
    "The process is deterministic: each value has exactly one successor.",
    "A non-happy number repeats a value; the cycle never contains `1`.",
  ],
  testcases: [
    {
      args: [19],
      expected: "true",
      note: "The classic happy number: four steps to one.",
    },
    {
      args: [2],
      expected: "false",
      note: "The classic unhappy number; its cycle returns to four.",
    },
    {
      args: [1],
      expected: "true",
      hidden: true,
      note: "one is happy without any step",
    },
    {
      args: [7],
      expected: "true",
      hidden: true,
      note: "a single digit that is happy after several steps",
    },
    {
      args: [10],
      expected: "true",
      hidden: true,
      note: "a trailing zero does not change the sum of squares",
    },
    {
      args: [100],
      expected: "true",
      hidden: true,
      note: "reaches one after the first step",
    },
    {
      args: [1111111],
      expected: "true",
      hidden: true,
      note: "seven equal digits, which is happy",
    },
    {
      args: [3],
      expected: "false",
      hidden: true,
      note: "a single digit that is not happy",
    },
    {
      args: [4],
      expected: "false",
      hidden: true,
      note: "the value every unhappy chain returns to",
    },
    {
      args: [20],
      expected: "false",
      hidden: true,
      note: "one step away from the unhappy cycle",
    },
    {
      args: [999],
      expected: "false",
      hidden: true,
      note: "three large digits push the sum far above the input",
    },
    {
      args: [2147483647],
      expected: "false",
      hidden: true,
      note: "the largest legal input, which is not happy",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isHappy(self, n: int) -> bool:
        `,
  },
  notes: {
    approach:
      "Two ways to stop: remember every value seen in a set and stop when one repeats, or treat the successor function as a linked list and use a slow and a fast pointer to find the cycle. Either way, only the meeting point matters — if the cycle contains `1`, that is where both walkers end up. The reference uses the two-pointer version, with `sumSquareDigits` as a helper. There is no closed-form test: a handful of chains reach `1` and the rest fall into one single cycle.",
    timeComplexity: "O(log n) steps per value, with a bounded number of values",
    spaceComplexity: "O(1) for the two-pointer version",
  },
  signature: {
    name: "isHappy",
    params: [{ name: "n", kind: "int" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/happy-number/",
  reference: `class Solution:
    def isHappy(self, n: int) -> bool:
        slow, fast = n, self.sumSquareDigits(n)

        while slow != fast:
            fast = self.sumSquareDigits(fast)
            fast = self.sumSquareDigits(fast)
            slow = self.sumSquareDigits(slow)

        return True if fast == 1 else False

    def sumSquareDigits(self, n):
        output = 0
        while n:
            output += (n % 10) ** 2
            n = n // 10
        return output
`,
  rejection: `class Solution:
    def isHappy(self, n):
        # Stopping at the first single-digit value is wrong: a single digit is
        # happy only when it is one, and 7 keeps going to 49, 97, 130, 10, 1.
        while n >= 10:
            n = sum(int(d) ** 2 for d in str(n))
        return n == 1
`,
} satisfies AuthoredProblem;
