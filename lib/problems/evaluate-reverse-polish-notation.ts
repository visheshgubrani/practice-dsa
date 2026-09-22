import type { AuthoredProblem } from "./authoring";

export const evaluateReversePolishNotation = {
  slug: "evaluate-reverse-polish-notation",
  number: 150,
  title: "Evaluate Reverse Polish Notation",
  difficulty: "medium",
  tags: ["array", "math", "stack", "neetcode-150"],
  statement: [
    "Evaluate the arithmetic expression `tokens`, written in Reverse Polish Notation, and return its integer value.",
    "",
    "Operands come before their operator. The operators are `+`, `-`, `*`, and `/`; division truncates toward zero, and no expression divides by zero.",
  ].join("\n"),
  examples: [
    {
      args: [["2", "1", "+", "3", "*"]],
      output: "9",
      explanation: "`(2 + 1) * 3 = 9`.",
    },
    {
      args: [["4", "13", "5", "/", "+"]],
      output: "6",
      explanation: "`4 + (13 / 5) = 4 + 2 = 6`, because integer division drops the remainder.",
    },
    {
      args: [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]],
      output: "22",
      explanation:
        "`((10 * (6 / ((9 + 3) * -11))) + 17) + 5 = 22`, a longer expression that mixes every operator.",
    },
  ],
  constraints: [
    "`1 <= tokens.length <= 10⁴`",
    "`tokens[i]` is either an operator: `\"+\"`, `\"-\"`, `\"*\"`, or `\"/\"`, or an integer in the range `[-200, 200]`.",
  ],
  testcases: [
    {
      args: [["2", "1", "+", "3", "*"]],
      expected: "9",
      note: "Multiplication applied to a parenthesised sum.",
    },
    {
      args: [["4", "13", "5", "/", "+"]],
      expected: "6",
      note: "Division truncates instead of keeping a fraction.",
    },
    {
      args: [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]],
      expected: "22",
      note: "Every operator, with a negative operand in the middle.",
    },
    { args: [["3"]], expected: "3", hidden: true, note: "a single operand, no operator" },
    { args: [["1", "2", "+"]], expected: "3", hidden: true, note: "the shortest real expression" },
    { args: [["2", "1", "-"]], expected: "1", hidden: true, note: "subtraction order matters" },
    {
      args: [["-3", "2", "/"]],
      expected: "-1",
      hidden: true,
      note: "division truncates toward zero, not toward negative infinity",
    },
    { args: [["-4", "-2", "/"]], expected: "2", hidden: true, note: "two negatives divide to a positive" },
    { args: [["2", "-2", "*"]], expected: "-4", hidden: true, note: "a negative operand in a product" },
    { args: [["0", "3", "/"]], expected: "0", hidden: true, note: "zero as the dividend" },
    {
      args: [["5", "1", "2", "+", "4", "*", "+", "3", "-"]],
      expected: "14",
      hidden: true,
      note: "`5 + ((1 + 2) * 4) - 3`, the classic nested case",
    },
    {
      args: [["-200", "200", "*"]],
      expected: "-40000",
      hidden: true,
      note: "constraint-boundary operands",
    },
    { args: [["200", "-200", "+"]], expected: "0", hidden: true, note: "boundary operands that cancel" },
  ],
  starterCode: {
    python: `class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        `,
  },
  notes: {
    approach:
      "Push every number onto a stack; on an operator, pop the two most recent operands, apply it, and push the result. Order matters for `-` and `/`: the first pop is the right-hand operand. Division must truncate toward zero, which is what `int(float(b) / a)` does and `//` does not for negative operands.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "evalRPN",
    params: [{ name: "tokens", kind: "string[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
  reference: `class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for c in tokens:
            if c == "+":
                stack.append(stack.pop() + stack.pop())
            elif c == "-":
                a, b = stack.pop(), stack.pop()
                stack.append(b - a)
            elif c == "*":
                stack.append(stack.pop() * stack.pop())
            elif c == "/":
                a, b = stack.pop(), stack.pop()
                stack.append(int(float(b) / a))
            else:
                stack.append(int(c))
        return stack[0]
`,
  rejection: `class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for c in tokens:
            if c == "+":
                stack.append(stack.pop() + stack.pop())
            elif c == "-":
                a, b = stack.pop(), stack.pop()
                stack.append(b - a)
            elif c == "*":
                stack.append(stack.pop() * stack.pop())
            elif c == "/":
                a, b = stack.pop(), stack.pop()
                # Floor division instead of truncation toward zero.
                stack.append(b // a)
            else:
                stack.append(int(c))
        return stack[0]
`,
} satisfies AuthoredProblem;
