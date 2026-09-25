import type { AuthoredProblem } from "./authoring";

export const palindromePartitioning = {
  slug: "palindrome-partitioning",
  number: 131,
  title: "Palindrome Partitioning",
  difficulty: "medium",
  tags: ["string", "dynamic-programming", "backtracking", "neetcode-150"],
  statement: [
    "Split the string `s` into contiguous pieces so every piece is a palindrome.",
    "",
    "Return every valid partition in any order. The order of pieces inside a partition is fixed by the string.",
  ].join("\\n"),
  examples: [
    { args: ["aab"], output: "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]", explanation: "The prefix can be split as a-a or aa; b must remain the final piece." },
    { args: ["a"], output: "[[\"a\"]]", explanation: "The one-character string is already a palindrome." },
  ],
  constraints: ["`1 <= s.length <= 16`", "`s` contains only lowercase English letters."],
  testcases: [
    { args: ["aab"], expected: "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]", note: "The two valid ways to partition aab." },
    { args: ["a"], expected: "[[\"a\"]]", note: "A single character forms one partition." },
    { args: ["aa"], expected: "[[\"a\",\"a\"],[\"aa\"]]", hidden: true, note: "The whole string and two single characters are palindromic." },
    { args: ["aba"], expected: "[[\"a\",\"b\",\"a\"],[\"aba\"]]", hidden: true, note: "The full string is a palindrome as well as its one-character split." },
    { args: ["abc"], expected: "[[\"a\",\"b\",\"c\"]]", hidden: true, note: "No multi-character substring is palindromic." },
    { args: ["abba"], expected: "[[\"a\",\"b\",\"b\",\"a\"],[\"a\",\"bb\",\"a\"],[\"abba\"]]", hidden: true, note: "The inner bb and the entire abba are palindromes." },
    { args: ["aaa"], expected: "[[\"a\",\"a\",\"a\"],[\"a\",\"aa\"],[\"aa\",\"a\"],[\"aaa\"]]", hidden: true, note: "Every contiguous piece is palindromic, giving four partitions." },
    { args: ["cdd"], expected: "[[\"c\",\"d\",\"d\"],[\"c\",\"dd\"]]", hidden: true, note: "Only the final pair forms a multi-character palindrome." },
    { args: ["efe"], expected: "[[\"e\",\"f\",\"e\"],[\"efe\"]]", hidden: true, note: "The full three-character string is palindromic." },
    { args: ["baab"], expected: "[[\"b\",\"a\",\"a\",\"b\"],[\"b\",\"aa\",\"b\"],[\"baab\"]]", hidden: true, note: "A palindrome with a two-character center." },
  ],
  starterCode: { python: `class Solution:\n    def partition(self, s: str) -> List[List[str]]:\n        ` },
  notes: { approach: "At each start index, try every ending index and continue only when the selected substring reads the same from both ends. Add the piece, recurse from the next index, and then remove it.", timeComplexity: "O(n · 2ⁿ) time for exploring partitions and palindrome checks", spaceComplexity: "O(n) recursion and current-partition space, excluding results" },
  signature: { name: "partition", params: [{ name: "s", kind: "string" }], returns: "string[][]" },
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/palindrome-partitioning/",
  reference: `class Solution:\n    def partition(self, s: str) -> List[List[str]]:\n        res, part = [], []\n\n        def dfs(i):\n            if i >= len(s):\n                res.append(part.copy())\n                return\n            for j in range(i, len(s)):\n                if self.isPali(s, i, j):\n                    part.append(s[i : j + 1])\n                    dfs(j + 1)\n                    part.pop()\n\n        dfs(0)\n        return res\n\n    def isPali(self, s, l, r):\n        while l < r:\n            if s[l] != s[r]:\n                return False\n            l, r = l + 1, r - 1\n        return True\n`,
  rejection: `class Solution:\n    def partition(self, s):\n        # Reports only the partition into single characters and misses longer palindromes.\n        return [[char for char in s]]\n`,
} satisfies AuthoredProblem;
