import type { AuthoredProblem } from "./authoring";

export const interleavingString = {
  slug: "interleaving-string",
  number: 97,
  title: "Interleaving String",
  difficulty: "medium",
  tags: ["string","dynamic-programming","neetcode-150"],
  statement: "Return true if s3 can be formed by interleaving s1 and s2. Each source string must keep its character order, and every character from both sources must be used exactly once.",
  examples: [
    { args: ["aabcc","dbbca","aadbbcbcac"], output: "true", explanation: "Taking characters from the two strings in order forms s3." },
    { args: ["aabcc","dbbca","aadbbbaccc"], output: "false", explanation: "The characters cannot be assigned to the two source strings while keeping both orders." },
    { args: ["","",""], output: "true", explanation: "Two empty strings interleave to form the empty string." },
  ],
  constraints: [
    "0 <= s1.length, s2.length <= 100.",
    "0 <= s3.length <= 200.",
    "All three strings contain lowercase English letters.",
  ],
  testcases: [
    { args: ["aabcc","dbbca","aadbbcbcac"], expected: "true", hidden: false, note: "Taking characters from the two strings in order forms s3." },
    { args: ["aabcc","dbbca","aadbbbaccc"], expected: "false", hidden: false, note: "The characters cannot be assigned to the two source strings while keeping both orders." },
    { args: ["","",""], expected: "true", hidden: false, note: "Two empty strings interleave to form the empty string." },
    { args: ["a","b","ab"], expected: "true", hidden: true, note: "Take the character from s1 before the character from s2." },
    { args: ["a","b","ba"], expected: "true", hidden: true, note: "Take the character from s2 before the character from s1." },
    { args: ["a","b","aa"], expected: "false", hidden: true, note: "The source strings do not contain two a characters." },
    { args: ["ab","cd","acbd"], expected: "true", hidden: true, note: "The characters alternate while preserving each source order." },
    { args: ["ab","cd","abcd"], expected: "true", hidden: true, note: "All of s1 can be followed by all of s2." },
    { args: ["aa","ab","aaba"], expected: "true", hidden: true, note: "The repeated a can be chosen from either source when needed." },
    { args: ["abc","def","abdecf"], expected: "true", hidden: true, note: "The characters from both strings keep their original order." },
    { args: ["abc","def","abdfec"], expected: "false", hidden: true, note: "The d, e, f order from the second string is violated." },
  ],
  starterCode: { python: `class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        
` },
  notes: {
    approach: "At a prefix position, the next character of s3 must come from the next unused character of s1 or s2. Track reachable pairs of prefix lengths and accept when both sources are fully consumed.",
    timeComplexity: "O(s1.length × s2.length)",
    spaceComplexity: "O(s1.length × s2.length)",
  },
  signature: {
    name: "isInterleave",
    params: [
      { name: "s1", kind: "string" },
      { name: "s2", kind: "string" },
      { name: "s3", kind: "string" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/interleaving-string/",
  reference: `class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False

        dp = [[False] * (len(s2) + 1) for i in range(len(s1) + 1)]
        dp[len(s1)][len(s2)] = True

        for i in range(len(s1), -1, -1):
            for j in range(len(s2), -1, -1):
                if i < len(s1) and s1[i] == s3[i + j] and dp[i + 1][j]:
                    dp[i][j] = True
                if j < len(s2) and s2[j] == s3[i + j] and dp[i][j + 1]:
                    dp[i][j] = True
        return dp[0][0]
`,
  rejection: `class Solution:
    def isInterleave(self, s1, s2, s3):
        # Greedily takes from s1 whenever its next character matches.
        if len(s1) + len(s2) != len(s3):
            return False
        i = j = 0
        for ch in s3:
            if i < len(s1) and s1[i] == ch:
                i += 1
            elif j < len(s2) and s2[j] == ch:
                j += 1
            else:
                return False
        return i == len(s1) and j == len(s2)
`,
} satisfies AuthoredProblem;
