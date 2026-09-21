import type { AuthoredProblem } from "./authoring";

export const longestSubstringWithoutRepeatingCharacters = {
  slug: "longest-substring-without-repeating-characters",
  number: 3,
  title: "Longest Substring Without Repeating Characters",
  difficulty: "medium",
  tags: ["hash-table", "string", "sliding-window"],
  statement: [
    "Given a string `s`, find the length of the **longest substring** without repeating characters.",
  ].join("\n"),
  examples: [
    {
      args: ["abcabcbb"],
      output: "3",
      explanation: 'The answer is "abc", with the length of 3.',
    },
    {
      args: ["bbbbb"],
      output: "1",
      explanation: 'The answer is "b", with the length of 1.',
    },
    {
      args: ["pwwkew"],
      output: "3",
      explanation:
        'The answer is "wke", with the length of 3. "pwke" is a subsequence, not a substring.',
    },
  ],
  constraints: [
    "`0 <= s.length <= 5 * 10⁴`",
    "`s` consists of English letters, digits, symbols and spaces.",
  ],
  testcases: [
    {
      args: ["abcabcbb"],
      expected: "3",
      note: 'The answer is "abc", with the length of 3.',
    },
    {
      args: ["bbbbb"],
      expected: "1",
      note: 'The answer is "b", with the length of 1.',
    },
    {
      args: ["pwwkew"],
      expected: "3",
      note: 'The answer is "wke", with the length of 3. "pwke" is a subsequence, not a substring.',
    },
    { args: [""], expected: "0", hidden: true, note: "empty string is allowed" },
    { args: ["a"], expected: "1", hidden: true, note: "single character" },
    { args: ["au"], expected: "2", hidden: true, note: "two distinct" },
    {
      args: ["dvdf"],
      expected: "3",
      hidden: true,
      note: "repeat is not at the window start",
    },
    {
      args: ["abba"],
      expected: "2",
      hidden: true,
      note: "window must jump past the earlier duplicate",
    },
    { args: [" "], expected: "1", hidden: true, note: "a single space" },
    {
      args: ["tmmzuxt"],
      expected: "5",
      hidden: true,
      note: "a char from before the window may re-enter",
    },
    {
      args: ["anviaj"],
      expected: "5",
      hidden: true,
      note: "repeat of the first letter, then a new one",
    },
  ],
  starterCode: {
    python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        `,
  },
  notes: {
    approach:
      "A sliding window of unique characters. Remember the last index of each character; when a repeat falls inside the window, jump the start just past that last index. The window length at every right endpoint is a candidate for the answer.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(k)",
  },
  signature: {
    name: "lengthOfLongestSubstring",
    params: [{ name: "s", kind: "string" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl:
    "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
  reference: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}
        start = 0
        best = 0
        for i, char in enumerate(s):
            if char in last and last[char] >= start:
                start = last[char] + 1
            last[char] = i
            best = max(best, i - start + 1)
        return best
`,
} satisfies AuthoredProblem;
