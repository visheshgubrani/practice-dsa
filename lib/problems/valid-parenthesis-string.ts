import type { AuthoredProblem } from "./authoring";

export const validParenthesisString = {
  slug: "valid-parenthesis-string",
  number: 678,
  title: "Valid Parenthesis String",
  difficulty: "medium",
  tags: ["string", "dynamic-programming", "stack", "greedy", "bracket-sequences", "neetcode-150"],
  statement: [
    "`s` contains `(`, `)`, and `*`. A star may stand for an empty string, an opening parenthesis, or a closing parenthesis.",
    "",
    "Return whether some choice for every star makes `s` a valid parentheses string: every closer has an unmatched opener before it, and every opener is closed by the end.",
  ].join("\n"),
  examples: [
    {
      args: ["()"],
      output: "true",
      explanation: "One pair, already matched.",
    },
    {
      args: ["(*)"],
      output: "true",
      explanation: "The star can be empty, leaving `()`.",
    },
    {
      args: ["(*))"],
      output: "true",
      explanation: "Treat the star as an opener. Then `(())` is balanced.",
    },
  ],
  constraints: ["`1 <= s.length <= 100`", "`s[i]` is `(`, `)`, or `*`."],
  testcases: [
    {
      args: ["()"],
      expected: "true",
      note: "A single matched pair.",
    },
    {
      args: ["(*)"],
      expected: "true",
      note: "The star can disappear.",
    },
    {
      args: ["(*))"],
      expected: "true",
      note: "The star has to be an opener, not empty.",
    },
    {
      args: ["("],
      expected: "false",
      hidden: true,
      note: "an opener with nothing to close it",
    },
    {
      args: [")"],
      expected: "false",
      hidden: true,
      note: "a closer with no opener",
    },
    {
      args: ["*"],
      expected: "true",
      hidden: true,
      note: "a single star can be empty",
    },
    {
      args: ["(*"],
      expected: "true",
      hidden: true,
      note: "the star closes the opener",
    },
    {
      args: [")*"],
      expected: "false",
      hidden: true,
      note: "a star after a closer cannot move in front of it",
    },
    {
      args: [")("],
      expected: "false",
      hidden: true,
      note: "the closer comes first",
    },
    {
      args: ["***"],
      expected: "true",
      hidden: true,
      note: "every star can be empty",
    },
    {
      args: ["((())"],
      expected: "false",
      hidden: true,
      note: "one opener is left over and there is no star to absorb it",
    },
  ],
  starterCode: {
    python: `class Solution:
    def checkValidString(self, s: str) -> bool:
        `,
  },
  notes: {
    approach:
      "Keep the smallest and largest number of unmatched openers the string could still have. An opener raises both, a closer lowers both, and a star lowers the smallest while raising the largest. If the largest count goes negative, some closer had no opener. If the smallest goes negative, clamp it to zero: a star can be empty instead of a closer. The string works when the smallest count finishes at zero.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "checkValidString",
    params: [{ name: "s", kind: "string" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/valid-parenthesis-string/",
  reference: `# Dynamic Programming: O(n^2)
class Solution:
    def checkValidString(self, s: str) -> bool:
        dp = {(len(s), 0): True}  # key=(i, leftCount) -> isValid

        def dfs(i, left):
            if i == len(s) or left < 0:
                return left == 0
            if (i, left) in dp:
                return dp[(i, left)]

            if s[i] == "(":
                dp[(i, left)] = dfs(i + 1, left + 1)
            elif s[i] == ")":
                dp[(i, left)] = dfs(i + 1, left - 1)
            else:
                dp[(i, left)] = (
                    dfs(i + 1, left + 1) or dfs(i + 1, left - 1) or dfs(i + 1, left)
                )
            return dp[(i, left)]

        return dfs(0, 0)


# Greedy: O(n)
class Solution:
    def checkValidString(self, s: str) -> bool:
        leftMin, leftMax = 0, 0

        for c in s:
            if c == "(":
                leftMin, leftMax = leftMin + 1, leftMax + 1
            elif c == ")":
                leftMin, leftMax = leftMin - 1, leftMax - 1
            else:
                leftMin, leftMax = leftMin - 1, leftMax + 1
            if leftMax < 0:
                return False
            if leftMin < 0:  # required because -> s = ( * ) (
                leftMin = 0
        return leftMin == 0
`,
  rejection: `class Solution:
    def checkValidString(self, s: str) -> bool:
        # Stars are ignored, so a star that is needed as a parenthesis looks invalid.
        balance = 0
        for c in s:
            if c == "(":
                balance += 1
            elif c == ")":
                balance -= 1
                if balance < 0:
                    return False
        return balance == 0
`,
} satisfies AuthoredProblem;
