import type { AuthoredProblem } from "./authoring";

export const permutationInString = {
  slug: "permutation-in-string",
  number: 567,
  title: "Permutation in String",
  difficulty: "medium",
  tags: ["hash-table", "two-pointers", "string", "sliding-window", "neetcode-150"],
  statement: [
    "Given two strings `s1` and `s2`, return `true` when some permutation of `s1` appears as a contiguous substring of `s2`.",
    "",
    "In other words: does `s2` contain a window of length `s1.length` whose letters are exactly the letters of `s1`?",
  ].join("\n"),
  examples: [
    {
      args: ["ab", "eidbaooo"],
      output: "true",
      explanation: "`s2` contains `ba`, which is a permutation of `ab`.",
    },
    {
      args: ["ab", "eidboaoo"],
      output: "false",
      explanation:
        "Every window of length two is `ei`, `id`, `db`, `bo`, `oa`, or `oo` — none is `ab` or `ba`.",
    },
  ],
  constraints: [
    "`1 <= s1.length, s2.length <= 10⁴`",
    "`s1` and `s2` consist of lowercase English letters.",
  ],
  testcases: [
    {
      args: ["ab", "eidbaooo"],
      expected: "true",
      note: "A permutation appears in the middle of `s2`.",
    },
    {
      args: ["ab", "eidboaoo"],
      expected: "false",
      note: "The same letters appear, but never together in one window.",
    },
    { args: ["a", "a"], expected: "true", hidden: true, note: "minimum length, equal strings" },
    { args: ["a", "b"], expected: "false", hidden: true, note: "single characters that differ" },
    { args: ["ab", "ab"], expected: "true", hidden: true, note: "the strings are equal" },
    { args: ["ab", "ba"], expected: "true", hidden: true, note: "a reversed permutation" },
    { args: ["abc", "cba"], expected: "true", hidden: true, note: "three letters reversed" },
    {
      args: ["abc", "abcd"],
      expected: "true",
      hidden: true,
      note: "the window sits at the start",
    },
    {
      args: ["abcd", "abc"],
      expected: "false",
      hidden: true,
      note: "`s1` is longer than `s2`, so no window can exist",
    },
    { args: ["aa", "aa"], expected: "true", hidden: true, note: "a repeated letter matches itself" },
    { args: ["ab", "aab"], expected: "true", hidden: true, note: "the window is not at the start" },
    { args: ["aa", "ab"], expected: "false", hidden: true, note: "counts differ by one letter" },
    {
      args: ["abc", "bbbca"],
      expected: "true",
      hidden: true,
      note: "the window is `bca`, a permutation of `abc` — not the obvious left-to-right order",
    },
    {
      args: ["abc", "bbbcc"],
      expected: "false",
      hidden: true,
      note: "windows of the right length with no `a` at all",
    },
    {
      args: ["aab", "abb"],
      expected: "false",
      hidden: true,
      note: "same letters but different counts — a set comparison would accept this",
    },
  ],
  starterCode: {
    python: `class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        `,
  },
  notes: {
    approach:
      "A permutation of `s1` has the same letter counts, so slide a window of exactly `s1.length` over `s2` and compare the 26 counts as the window moves: add the letter entering on the right, remove the letter leaving on the left. Keeping a running count of how many letters already match avoids comparing all 26 array slots at every step.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "checkInclusion",
    params: [
      { name: "s1", kind: "string" },
      { name: "s2", kind: "string" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/permutation-in-string/",
  reference: `class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        if len(s1) > len(s2):
            return False

        s1Count, s2Count = [0] * 26, [0] * 26
        for i in range(len(s1)):
            s1Count[ord(s1[i]) - ord("a")] += 1
            s2Count[ord(s2[i]) - ord("a")] += 1

        matches = 0
        for i in range(26):
            matches += 1 if s1Count[i] == s2Count[i] else 0

        l = 0
        for r in range(len(s1), len(s2)):
            if matches == 26:
                return True

            index = ord(s2[r]) - ord("a")
            s2Count[index] += 1
            if s1Count[index] == s2Count[index]:
                matches += 1
            elif s1Count[index] + 1 == s2Count[index]:
                matches -= 1

            index = ord(s2[l]) - ord("a")
            s2Count[index] -= 1
            if s1Count[index] == s2Count[index]:
                matches += 1
            elif s1Count[index] - 1 == s2Count[index]:
                matches -= 1
            l += 1
        return matches == 26
`,
  rejection: `class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        # Compares the set of letters in the window rather than their counts, so
        # "aab" in "abb" looks like a match.
        target = set(s1)
        for i in range(len(s2) - len(s1) + 1):
            if set(s2[i : i + len(s1)]) == target:
                return True
        return False
`,
} satisfies AuthoredProblem;
