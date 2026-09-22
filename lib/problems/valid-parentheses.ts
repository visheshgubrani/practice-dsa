import type { AuthoredProblem } from "./authoring";

export const validParentheses = {
  slug: "valid-parentheses",
  number: 20,
  title: "Valid Parentheses",
  difficulty: "easy",
  tags: ["string", "stack", "neetcode-150"],
  statement: [
    "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.",
    "",
    "An input string is valid if:",
    "",
    "1. Open brackets must be closed by the same type of brackets.",
    "2. Open brackets must be closed in the correct order.",
    "3. Every close bracket has a corresponding open bracket of the same type.",
  ].join("\n"),
  examples: [
    {
      args: ["()"],
      output: "true",
      explanation: "A single matching pair.",
    },
    {
      args: ["()[]{}"],
      output: "true",
      explanation: "Adjacent pairs of each type, closed in order.",
    },
    {
      args: ["(]"],
      output: "false",
      explanation: "The closer does not match the opener.",
    },
  ],
  constraints: [
    "`1 <= s.length <= 10⁴`",
    "`s` consists of parentheses only `'()[]{}'`.",
  ],
  testcases: [
    {
      args: ["()"],
      expected: "true",
      note: "A single matching pair.",
    },
    {
      args: ["()[]{}"],
      expected: "true",
      note: "Adjacent pairs of each type, closed in order.",
    },
    {
      args: ["(]"],
      expected: "false",
      note: "The closer does not match the opener.",
    },
    {
      args: ["([)]"],
      expected: "false",
      hidden: true,
      note: "counts match; order does not",
    },
    {
      args: ["{[]}"],
      expected: "true",
      hidden: true,
      note: "nested mixed types",
    },
    { args: ["("], expected: "false", hidden: true, note: "minimum unclosed opener" },
    { args: [")"], expected: "false", hidden: true, note: "minimum extra closer" },
    { args: ["((("], expected: "false", hidden: true, note: "unclosed openers" },
    {
      args: ["{[()]}"],
      expected: "true",
      hidden: true,
      note: "all three types nested",
    },
    {
      args: ["(){}}{"],
      expected: "false",
      hidden: true,
      note: "extra closer then a leftover opener",
    },
    {
      args: ["[[[]]]"],
      expected: "true",
      hidden: true,
      note: "same type nested",
    },
    {
      args: ["{[}"],
      expected: "false",
      hidden: true,
      note: "incomplete mix",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isValid(self, s: str) -> bool:
        `,
  },
  notes: {
    approach:
      "Push every opening bracket onto a stack. On a closing bracket, the top of the stack must be its matching opener — otherwise the string is invalid. The stack also has to be empty at the end, which catches unclosed openers.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "isValid",
    params: [{ name: "s", kind: "string" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/valid-parentheses/",
  reference: `class Solution:
    def isValid(self, s: str) -> bool:
        pairs = {")": "(", "]": "[", "}": "{"}
        stack = []
        for char in s:
            if char in pairs:
                if not stack or stack.pop() != pairs[char]:
                    return False
            else:
                stack.append(char)
        return not stack
`,
} satisfies AuthoredProblem;
