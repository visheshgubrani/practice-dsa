import type { AuthoredProblem } from "./authoring";

export const regularExpressionMatching = {
  slug: "regular-expression-matching",
  number: 10,
  title: "Regular Expression Matching",
  difficulty: "hard",
  tags: ["string","dynamic-programming","recursion","neetcode-150"],
  statement: "Implement full-string matching for patterns containing lowercase letters, . and *. A dot matches any one character. A star makes the preceding character match zero or more times.",
  examples: [
    { args: ["aa","a"], output: "false", explanation: "The pattern a matches one character, not both." },
    { args: ["aa","a*"], output: "true", explanation: "The star lets a match both characters." },
    { args: ["ab",".*"], output: "true", explanation: ".* matches any sequence of characters." },
  ],
  constraints: [
    "1 <= s.length, p.length <= 20.",
    "s contains lowercase English letters; p contains lowercase English letters, . and *.",
    "Every * follows a valid preceding pattern character.",
  ],
  testcases: [
    { args: ["aa","a"], expected: "false", hidden: false, note: "The pattern a matches one character, not both." },
    { args: ["aa","a*"], expected: "true", hidden: false, note: "The star lets a match both characters." },
    { args: ["ab",".*"], expected: "true", hidden: false, note: ".* matches any sequence of characters." },
    { args: ["a","ab*"], expected: "true", hidden: true, note: "The b* part can match zero characters." },
    { args: ["ab","c*a*b"], expected: "true", hidden: true, note: "The c* part is empty, followed by a and b." },
    { args: ["mississippi","mis*is*p*."], expected: "false", hidden: true, note: "The pattern cannot account for all characters in the middle." },
    { args: ["aab","c*a*b"], expected: "true", hidden: true, note: "The pattern matches aab after skipping c*." },
    { args: ["aaa","a*a"], expected: "true", hidden: true, note: "The starred a matches two characters and the final a matches one." },
    { args: ["ab",".*c"], expected: "false", hidden: true, note: "The final c cannot match the last character." },
    { args: ["bbbba",".*a*a"], expected: "true", hidden: true, note: "The wildcard-star covers bbbb and the final a matches." },
    { args: ["ab","a.b"], expected: "false", hidden: true, note: "The pattern requires three matched characters." },
  ],
  starterCode: { python: `class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        
` },
  notes: {
    approach: "At each position, match a literal or dot. When the next pattern character is a star, either skip that character pair or consume one matching input character and try the same pattern position again.",
    timeComplexity: "O(s.length × p.length)",
    spaceComplexity: "O(s.length × p.length)",
  },
  signature: {
    name: "isMatch",
    params: [
      { name: "s", kind: "string" },
      { name: "p", kind: "string" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/regular-expression-matching/",
  reference: `# BOTTOM-UP Dynamic Programming
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        cache = [[False] * (len(p) + 1) for i in range(len(s) + 1)]
        cache[len(s)][len(p)] = True

        for i in range(len(s), -1, -1):
            for j in range(len(p) - 1, -1, -1):
                match = i < len(s) and (s[i] == p[j] or p[j] == ".")

                if (j + 1) < len(p) and p[j + 1] == "*":
                    cache[i][j] = cache[i][j + 2]
                    if match:
                        cache[i][j] = cache[i + 1][j] or cache[i][j]
                elif match:
                    cache[i][j] = cache[i + 1][j + 1]

        return cache[0][0]


# TOP DOWN MEMOIZATION
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        cache = {}

        def dfs(i, j):
            if (i, j) in cache:
                return cache[(i, j)]
            if i >= len(s) and j >= len(p):
                return True
            if j >= len(p):
                return False

            match = i < len(s) and (s[i] == p[j] or p[j] == ".")
            if (j + 1) < len(p) and p[j + 1] == "*":
                cache[(i, j)] = dfs(i, j + 2) or (  # dont use *
                    match and dfs(i + 1, j)
                )  # use *
                return cache[(i, j)]
            if match:
                cache[(i, j)] = dfs(i + 1, j + 1)
                return cache[(i, j)]
            cache[(i, j)] = False
            return False

        return dfs(0, 0)
`,
  rejection: `class Solution:
    def isMatch(self, s, p):
        # Treats a star as matching at most one preceding character.
        def visit(i, j):
            if j == len(p):
                return i == len(s)
            same = i < len(s) and (p[j] == "." or p[j] == s[i])
            if j + 1 < len(p) and p[j + 1] == "*":
                return visit(i, j + 2) or (same and visit(i + 1, j + 2))
            return same and visit(i + 1, j + 1)
        return visit(0, 0)
`,
} satisfies AuthoredProblem;
