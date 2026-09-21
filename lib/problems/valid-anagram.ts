import type { AuthoredProblem } from "./authoring";

export const validAnagram = {
  slug: "valid-anagram",
  number: 242,
  title: "Valid Anagram",
  difficulty: "easy",
  tags: ["hash-table", "string", "sorting"],
  statement: [
    "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
  ].join("\n"),
  examples: [
    {
      args: ["anagram", "nagaram"],
      output: "true",
      explanation: "Both strings use the same letters the same number of times.",
    },
    {
      args: ["rat", "car"],
      output: "false",
      explanation: "The letter counts differ.",
    },
    {
      args: ["a", "a"],
      output: "true",
      explanation: "A single matching letter is an anagram of itself.",
    },
  ],
  constraints: [
    "`1 <= s.length, t.length <= 5 * 10⁴`",
    "`s` and `t` consist of lowercase English letters.",
  ],
  testcases: [
    {
      args: ["anagram", "nagaram"],
      expected: "true",
      note: "Both strings use the same letters the same number of times.",
    },
    {
      args: ["rat", "car"],
      expected: "false",
      note: "The letter counts differ.",
    },
    {
      args: ["a", "a"],
      expected: "true",
      note: "A single matching letter is an anagram of itself.",
    },
    {
      args: ["aa", "a"],
      expected: "false",
      hidden: true,
      note: "same letters, different lengths",
    },
    {
      args: ["aa", "ab"],
      expected: "false",
      hidden: true,
      note: "same length, different counts",
    },
    {
      args: ["aab", "aba"],
      expected: "true",
      hidden: true,
      note: "counts match with a repeated letter",
    },
    {
      args: ["aab", "abb"],
      expected: "false",
      hidden: true,
      note: "same set of letters, swapped counts",
    },
    {
      args: ["z", "y"],
      expected: "false",
      hidden: true,
      note: "minimum length, different letters",
    },
    {
      args: ["listen", "silent"],
      expected: "true",
      hidden: true,
      note: "permutation of a longer word",
    },
    {
      args: ["aaaaa", "aaaaa"],
      expected: "true",
      hidden: true,
      note: "all the same letter",
    },
    {
      args: ["abc", "abcd"],
      expected: "false",
      hidden: true,
      note: "extra letter on t",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        `,
  },
  notes: {
    approach:
      "Anagrams are strings with identical letter counts. A 26-slot tally of s, decremented by t, must finish at zero — a leftover or a dip below zero means the counts disagree. Comparing sets is not enough, because it drops multiplicity.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "isAnagram",
    params: [
      { name: "s", kind: "string" },
      { name: "t", kind: "string" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/valid-anagram/",
  reference: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False
        counts = [0] * 26
        for char in s:
            counts[ord(char) - 97] += 1
        for char in t:
            index = ord(char) - 97
            counts[index] -= 1
            if counts[index] < 0:
                return False
        return True
`,
} satisfies AuthoredProblem;
