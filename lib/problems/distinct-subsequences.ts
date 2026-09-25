import type { AuthoredProblem } from "./authoring";

export const distinctSubsequences = {
  slug: "distinct-subsequences",
  number: 115,
  title: "Distinct Subsequences",
  difficulty: "hard",
  tags: ["string","dynamic-programming","neetcode-150"],
  statement: "Return how many subsequences of s equal t. A subsequence is formed by deleting zero or more characters without changing the order of those that remain.",
  examples: [
    { args: ["rabbbit","rabbit"], output: "3", explanation: "There are three choices for which repeated b is omitted." },
    { args: ["babgbag","bag"], output: "5", explanation: "Five different index selections spell bag." },
  ],
  constraints: [
    "For this judge, 1 <= s.length, t.length <= 30 and the answer fits signed 32-bit.",
    "s and t contain English letters.",
  ],
  testcases: [
    { args: ["rabbbit","rabbit"], expected: "3", hidden: false, note: "There are three choices for which repeated b is omitted." },
    { args: ["babgbag","bag"], expected: "5", hidden: false, note: "Five different index selections spell bag." },
    { args: ["a","a"], expected: "1", hidden: true, note: "The only position spells the target." },
    { args: ["a","b"], expected: "0", hidden: true, note: "The target character does not appear in s." },
    { args: ["aa","a"], expected: "2", hidden: true, note: "Either source position can be selected." },
    { args: ["aaa","aa"], expected: "3", hidden: true, note: "Choose any two of the three positions." },
    { args: ["abc","ac"], expected: "1", hidden: true, note: "Only the a and c positions form the target." },
    { args: ["abc","abc"], expected: "1", hidden: true, note: "Keeping every character gives one subsequence." },
    { args: ["aaaaaa","aaa"], expected: "20", hidden: true, note: "Choose three of six equal-character positions." },
    { args: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaa"], expected: "155117520", hidden: true, note: "Choose fifteen of thirty positions; this remains within int32." },
    { args: ["banana","ana"], expected: "4", hidden: true, note: "Four ordered position selections spell ana." },
  ],
  starterCode: { python: `class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        
` },
  notes: {
    approach: "Scan the source from left to right while counting ways to form each prefix of t. A matching source character can extend every way to form the preceding target prefix; it can also be skipped.",
    timeComplexity: "O(s.length × t.length)",
    spaceComplexity: "O(t.length)",
  },
  signature: {
    name: "numDistinct",
    params: [
      { name: "s", kind: "string" },
      { name: "t", kind: "string" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/distinct-subsequences/",
  reference: `class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        cache = {}

        for i in range(len(s) + 1):
            cache[(i, len(t))] = 1
        for j in range(len(t)):
            cache[(len(s), j)] = 0

        for i in range(len(s) - 1, -1, -1):
            for j in range(len(t) - 1, -1, -1):
                if s[i] == t[j]:
                    cache[(i, j)] = cache[(i + 1, j + 1)] + cache[(i + 1, j)]
                else:
                    cache[(i, j)] = cache[(i + 1, j)]
        return cache[(0, 0)]
`,
  rejection: `class Solution:
    def numDistinct(self, s, t):
        # Counts matching characters, not ordered position selections.
        return sum(1 for ch in t if ch in s)
`,
} satisfies AuthoredProblem;
