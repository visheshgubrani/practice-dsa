import type { AuthoredProblem } from "./authoring";

export const longestRepeatingCharacterReplacement = {
  slug: "longest-repeating-character-replacement",
  number: 424,
  title: "Longest Repeating Character Replacement",
  difficulty: "medium",
  tags: ["hash-table", "string", "sliding-window", "neetcode-150"],
  statement: [
    "You may change any character of `s` to any other uppercase English letter, at most `k` times in total.",
    "",
    "Return the length of the longest substring that can be made up of a single repeated letter using those changes.",
  ].join("\n"),
  examples: [
    {
      args: ["ABAB", 2],
      output: "4",
      explanation:
        "Changing both `A`s to `B`s (or both `B`s to `A`s) uses both changes and makes the whole string uniform.",
    },
    {
      args: ["AABABBA", 1],
      output: "4",
      explanation:
        "`AABA` already holds three `A`s, so one change to the remaining `B` gives four equal letters.",
    },
  ],
  constraints: [
    "`1 <= s.length <= 10⁵`",
    "`s` consists of only uppercase English letters.",
    "`0 <= k <= s.length`",
  ],
  testcases: [
    {
      args: ["ABAB", 2],
      expected: "4",
      note: "Two changes cover the whole string.",
    },
    {
      args: ["AABABBA", 1],
      expected: "4",
      note: "The best window is not the whole string.",
    },
    { args: ["A", 0], expected: "1", hidden: true, note: "minimum length, no changes allowed" },
    { args: ["A", 1], expected: "1", hidden: true, note: "a change with nothing to change" },
    { args: ["AB", 0], expected: "1", hidden: true, note: "two letters, no changes allowed" },
    { args: ["AB", 1], expected: "2", hidden: true, note: "one change is enough for both" },
    {
      args: ["ABA", 1],
      expected: "3",
      hidden: true,
      note: "the middle letter is the one to replace",
    },
    { args: ["AAAA", 0], expected: "4", hidden: true, note: "already uniform" },
    {
      args: ["ABCDE", 1],
      expected: "2",
      hidden: true,
      note: "all distinct, so only a pair can be made equal",
    },
    {
      args: ["AABABBA", 0],
      expected: "2",
      hidden: true,
      note: "no changes, so only a repeated run counts",
    },
    {
      args: ["BAAAB", 2],
      expected: "5",
      hidden: true,
      note: "both changes finish the whole string",
    },
    {
      args: ["ABBB", 2],
      expected: "4",
      hidden: true,
      note: "more changes available than needed",
    },
    {
      args: ["ABABAB", 1],
      expected: "3",
      hidden: true,
      note: "one window wins while a longer one does not fit",
    },
  ],
  starterCode: {
    python: `class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        `,
  },
  notes: {
    approach:
      "A window is affordable when its length minus the count of its most common letter is at most `k` — that difference is exactly how many replacements the window needs. Grow the window on the right, and when it becomes too expensive move the left edge by one. The largest window ever reached is the answer, because a window that already fits never has to shrink below a previously valid size.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "characterReplacement",
    params: [
      { name: "s", kind: "string" },
      { name: "k", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/longest-repeating-character-replacement/",
  reference: `class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        count = {}
        
        l = 0
        maxf = 0
        for r in range(len(s)):
            count[s[r]] = 1 + count.get(s[r], 0)
            maxf = max(maxf, count[s[r]])

            if (r - l + 1) - maxf > k:
                count[s[l]] -= 1
                l += 1

        return (r - l + 1)
`,
  rejection: `class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        # Counts the longest run of one letter anywhere, ignoring that a window
        # may mix letters as long as the minority fits inside k.
        best = 0
        run = 1
        for i in range(1, len(s)):
            if s[i] == s[i - 1]:
                run += 1
            else:
                run = 1
            best = max(best, run)
        return min(len(s), best + k)
`,
} satisfies AuthoredProblem;
