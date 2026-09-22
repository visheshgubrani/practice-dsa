import type { AuthoredProblem } from "./authoring";

export const minimumWindowSubstring = {
  slug: "minimum-window-substring",
  number: 76,
  title: "Minimum Window Substring",
  difficulty: "hard",
  tags: ["hash-table", "string", "sliding-window", "neetcode-150"],
  statement: [
    "Given strings `s` and `t`, return the shortest substring of `s` that contains every character of `t`, including duplicates.",
    "",
    "If no such substring exists, return `\"\"`. The tests are generated so that the answer is unique.",
  ].join("\n"),
  examples: [
    {
      args: ["ADOBECODEBANC", "ABC"],
      output: "\"BANC\"",
      explanation:
        "`BANC` is the shortest window holding an `A`, a `B`, and a `C`; `ADOBEC` also works but is longer.",
    },
    {
      args: ["a", "a"],
      output: "\"a\"",
      explanation: "The single character is the whole string and covers `t`.",
    },
    {
      args: ["a", "aa"],
      output: "\"\"",
      explanation: "`t` needs two `a`s and `s` has only one, so no window qualifies.",
    },
  ],
  constraints: [
    "`m == s.length`",
    "`n == t.length`",
    "`1 <= m, n <= 10⁵`",
    "`s` and `t` consist of uppercase and lowercase English letters.",
  ],
  testcases: [
    {
      args: ["ADOBECODEBANC", "ABC"],
      expected: "\"BANC\"",
      note: "The winning window starts after a longer valid one.",
    },
    {
      args: ["a", "a"],
      expected: "\"a\"",
      note: "Minimum length, and the window is the whole string.",
    },
    {
      args: ["a", "aa"],
      expected: "\"\"",
      note: "Duplicates in `t` cannot be covered, so the answer is empty.",
    },
    { args: ["a", "b"], expected: "\"\"", hidden: true, note: "`t` is absent from `s`" },
    { args: ["ab", "b"], expected: "\"b\"", hidden: true, note: "the window is a suffix" },
    { args: ["ab", "a"], expected: "\"a\"", hidden: true, note: "the window is a prefix" },
    {
      args: ["aa", "aa"],
      expected: "\"aa\"",
      hidden: true,
      note: "both letters of `t` are needed",
    },
    {
      args: ["abc", "cba"],
      expected: "\"abc\"",
      hidden: true,
      note: "every character of `s`, in reversed order in `t`",
    },
    {
      args: ["bba", "ba"],
      expected: "\"ba\"",
      hidden: true,
      note: "the tighter window skips a leading duplicate",
    },
    {
      args: ["cabwefgewcwaefgcf", "cae"],
      expected: "\"cwae\"",
      hidden: true,
      note: "the window must close around a late `c` and an earlier `e`",
    },
    {
      args: ["aaaaaaaaaaaabbbbbcdd", "abcdd"],
      expected: "\"abbbbbcdd\"",
      hidden: true,
      note: "the answer must start where the remaining counts allow it",
    },
    {
      args: ["xyz", "xyz"],
      expected: "\"xyz\"",
      hidden: true,
      note: "the two strings are equal",
    },
    {
      args: ["a", "aaaaaaaaaa"],
      expected: "\"\"",
      hidden: true,
      note: "`t` repeats one character far more often than `s` provides",
    },
  ],
  starterCode: {
    python: `class Solution:
    def minWindow(self, s: str, t: str) -> str:
        `,
  },
  notes: {
    approach:
      "Keep a window over `s` and a count of how many distinct letters of `t` are currently satisfied with the right multiplicity. Expand right until every letter is satisfied, then shrink from the left while it stays satisfied, recording the shortest window seen. A letter's requirement is only met when the window count matches `t`'s count exactly, which is what makes duplicates in `t` matter.",
    timeComplexity: "O(m + n)",
    spaceComplexity: "O(k)",
  },
  signature: {
    name: "minWindow",
    params: [
      { name: "s", kind: "string" },
      { name: "t", kind: "string" },
    ],
    returns: "string",
  },
  // The tests guarantee a unique answer, so the exact text is the answer.
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/minimum-window-substring/",
  reference: `class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if len(s) < len(t):
            return ""

        countT, window = {}, {}
        for c in t:
            countT[c] = 1 + countT.get(c, 0)

        have, need = 0, len(countT)
        res, resLen = [-1, -1], float("infinity")
        l = 0
        for r in range(len(s)):
            c = s[r]
            window[c] = 1 + window.get(c, 0)

            if c in countT and window[c] == countT[c]:
                have += 1

            while have == need:
                # update our result
                if (r - l + 1) < resLen:
                    res = [l, r]
                    resLen = r - l + 1
                # pop from the left of our window
                window[s[l]] -= 1
                if s[l] in countT and window[s[l]] < countT[s[l]]:
                    have -= 1
                l += 1
        l, r = res
        return s[l : r + 1] if resLen != float("infinity") else ""
`,
  rejection: `class Solution:
    def minWindow(self, s: str, t: str) -> str:
        # Requires every letter of t to appear, but ignores how many times: a
        # window with one "a" satisfies t = "aa".
        need = set(t)
        best = ""
        l = 0
        for r in range(len(s)):
            while need.issubset(set(s[l : r + 1])):
                window = s[l : r + 1]
                if best == "" or len(window) < len(best):
                    best = window
                l += 1
        return best
`,
} satisfies AuthoredProblem;
