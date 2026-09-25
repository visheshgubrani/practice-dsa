import type { AuthoredProblem } from "./authoring";

export const editDistance = {
  slug: "edit-distance",
  number: 72,
  title: "Edit Distance",
  difficulty: "medium",
  tags: ["string","dynamic-programming","neetcode-150"],
  statement: "Return the minimum number of single-character insertions, deletions, and replacements needed to change word1 into word2.",
  examples: [
    { args: ["horse","ros"], output: "3", explanation: "One sequence deletes h, replaces r with o, and deletes the final e." },
    { args: ["intention","execution"], output: "5", explanation: "Five edits transform intention into execution." },
  ],
  constraints: [
    "0 <= word1.length, word2.length <= 500.",
    "Both words contain lowercase English letters.",
  ],
  testcases: [
    { args: ["horse","ros"], expected: "3", hidden: false, note: "One sequence deletes h, replaces r with o, and deletes the final e." },
    { args: ["intention","execution"], expected: "5", hidden: false, note: "Five edits transform intention into execution." },
    { args: ["",""], expected: "0", hidden: true, note: "Two empty strings already match." },
    { args: ["a",""], expected: "1", hidden: true, note: "Delete the only character." },
    { args: ["","abc"], expected: "3", hidden: true, note: "Insert the three target characters." },
    { args: ["a","a"], expected: "0", hidden: true, note: "The words are already equal." },
    { args: ["abc","yabd"], expected: "2", hidden: true, note: "Insert y at the start and replace c with d." },
    { args: ["kitten","sitting"], expected: "3", hidden: true, note: "The standard transformation uses two replacements and one insertion." },
    { args: ["ab","ba"], expected: "2", hidden: true, note: "Two replacements or a delete followed by an insert suffice." },
    { args: ["aaaa","bbbb"], expected: "4", hidden: true, note: "Each position needs a replacement." },
    { args: ["abc","abc"], expected: "0", hidden: true, note: "No edit is needed for equal words." },
  ],
  starterCode: { python: `class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        
` },
  notes: {
    approach: "Compare suffixes of both words. Equal next characters need no edit; otherwise consider inserting, deleting, or replacing one character, then add one to the remaining suffix distance.",
    timeComplexity: "O(word1.length × word2.length)",
    spaceComplexity: "O(word1.length × word2.length)",
  },
  signature: {
    name: "minDistance",
    params: [
      { name: "word1", kind: "string" },
      { name: "word2", kind: "string" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/edit-distance/",
  reference: `class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        dp = [[float("inf")] * (len(word2) + 1) for i in range(len(word1) + 1)]

        for j in range(len(word2) + 1):
            dp[len(word1)][j] = len(word2) - j
        for i in range(len(word1) + 1):
            dp[i][len(word2)] = len(word1) - i

        for i in range(len(word1) - 1, -1, -1):
            for j in range(len(word2) - 1, -1, -1):
                if word1[i] == word2[j]:
                    dp[i][j] = dp[i + 1][j + 1]
                else:
                    dp[i][j] = 1 + min(dp[i + 1][j], dp[i][j + 1], dp[i + 1][j + 1])
        return dp[0][0]
`,
  rejection: `class Solution:
    def minDistance(self, word1, word2):
        # Uses only length difference and ignores substitutions.
        return abs(len(word1) - len(word2))
`,
} satisfies AuthoredProblem;
