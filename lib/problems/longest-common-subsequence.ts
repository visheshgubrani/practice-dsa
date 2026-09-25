import type { AuthoredProblem } from "./authoring";

export const longestCommonSubsequence = {
  slug: "longest-common-subsequence",
  number: 1143,
  title: "Longest Common Subsequence",
  difficulty: "medium",
  tags: ["string","dynamic-programming","longest-common-subsequence","neetcode-150"],
  statement: "Return the length of the longest sequence of characters that appears in both text1 and text2 in the same relative order. Characters need not be adjacent in either string.",
  examples: [
    { args: ["abcde","ace"], output: "3", explanation: "The characters a, c, and e appear in order in both strings." },
    { args: ["abc","abc"], output: "3", explanation: "The strings share all three characters." },
    { args: ["abc","def"], output: "0", explanation: "The strings share no characters." },
  ],
  constraints: [
    "1 <= text1.length, text2.length <= 1000.",
    "Both strings contain lowercase English letters.",
  ],
  testcases: [
    { args: ["abcde","ace"], expected: "3", hidden: false, note: "The characters a, c, and e appear in order in both strings." },
    { args: ["abc","abc"], expected: "3", hidden: false, note: "The strings share all three characters." },
    { args: ["abc","def"], expected: "0", hidden: false, note: "The strings share no characters." },
    { args: ["a","b"], expected: "0", hidden: true, note: "Different one-character strings have no common subsequence." },
    { args: ["abc","ac"], expected: "2", hidden: true, note: "The characters a and c remain in order." },
    { args: ["abc","bac"], expected: "2", hidden: true, note: "Either ac or bc is a common subsequence of length two." },
    { args: ["aaaa","aa"], expected: "2", hidden: true, note: "The shorter string can be matched twice." },
    { args: ["abcdef","fedcba"], expected: "1", hidden: true, note: "The strings share characters but no pair in the same order." },
    { args: ["xabxac","abc"], expected: "3", hidden: true, note: "The subsequence abc appears in order in the first string." },
    { args: ["zzza","za"], expected: "2", hidden: true, note: "The final a follows a z in both strings." },
    { args: ["abc","abcabc"], expected: "3", hidden: true, note: "The entire first string is a subsequence of the second." },
  ],
  starterCode: { python: `class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        
` },
  notes: {
    approach: "Compare suffixes of the two strings. When their first remaining characters match, keep that character and advance both suffixes. Otherwise, skip one character from either string and take the longer result.",
    timeComplexity: "O(text1.length × text2.length)",
    spaceComplexity: "O(text1.length × text2.length)",
  },
  signature: {
    name: "longestCommonSubsequence",
    params: [
      { name: "text1", kind: "string" },
      { name: "text2", kind: "string" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/longest-common-subsequence/",
  reference: `class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        dp = [[0 for j in range(len(text2) + 1)] for i in range(len(text1) + 1)]

        for i in range(len(text1) - 1, -1, -1):
            for j in range(len(text2) - 1, -1, -1):
                if text1[i] == text2[j]:
                    dp[i][j] = 1 + dp[i + 1][j + 1]
                else:
                    dp[i][j] = max(dp[i][j + 1], dp[i + 1][j])

        return dp[0][0]
`,
  rejection: `class Solution:
    def longestCommonSubsequence(self, text1, text2):
        # Counts shared characters without preserving their order.
        return sum(min(text1.count(ch), text2.count(ch)) for ch in set(text1))
`,
} satisfies AuthoredProblem;
