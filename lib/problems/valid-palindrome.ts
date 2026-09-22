import type { AuthoredProblem } from "./authoring";

export const validPalindrome = {
  slug: "valid-palindrome",
  number: 125,
  title: "Valid Palindrome",
  difficulty: "easy",
  tags: ["two-pointers", "string", "neetcode-150"],
  statement: [
    "A phrase is a palindrome when, after lowercasing every letter and dropping every character that is neither a letter nor a digit, it reads the same forwards and backwards.",
    "",
    "Given a string `s`, return `true` if it is a palindrome, and `false` otherwise.",
  ].join("\n"),
  examples: [
    {
      args: ["A man, a plan, a canal: Panama"],
      output: "true",
      explanation:
        "Removing punctuation and spaces leaves `amanaplanacanalpanama`, which reads the same both ways.",
    },
    {
      args: ["race a car"],
      output: "false",
      explanation: "The cleaned text is `raceacar`, which starts with `r` and ends with `r` but then differs.",
    },
    {
      args: [" "],
      output: "true",
      explanation: "Nothing survives cleaning, and an empty string is a palindrome.",
    },
  ],
  constraints: [
    "`1 <= s.length <= 2 * 10⁵`",
    "`s` consists only of printable ASCII characters.",
  ],
  testcases: [
    {
      args: ["A man, a plan, a canal: Panama"],
      expected: "true",
      note: "Letters, spaces, and punctuation mixed; the cleaned text is a palindrome.",
    },
    {
      args: ["race a car"],
      expected: "false",
      note: "A near miss: the cleaned text is not a palindrome.",
    },
    {
      args: [" "],
      expected: "true",
      note: "Only whitespace, so nothing is compared.",
    },
    { args: ["a"], expected: "true", hidden: true, note: "minimum length" },
    { args: ["aa"], expected: "true", hidden: true, note: "two equal characters" },
    { args: ["ab"], expected: "false", hidden: true, note: "two different characters" },
    {
      args: ["0P"],
      expected: "false",
      hidden: true,
      note: "a digit against a letter — the classic case-insensitive trap",
    },
    {
      args: ["a."],
      expected: "true",
      hidden: true,
      note: "trailing punctuation is dropped",
    },
    {
      args: [".,"],
      expected: "true",
      hidden: true,
      note: "no letters or digits at all",
    },
    {
      args: ["No 'x' in Nixon"],
      expected: "true",
      hidden: true,
      note: "mixed case, spaces, and apostrophes",
    },
    { args: ["ab2ba"], expected: "true", hidden: true, note: "digits in the middle" },
    { args: ["1a2"], expected: "false", hidden: true, note: "digits around a letter" },
    {
      args: ["abcdefghij"],
      expected: "false",
      hidden: true,
      note: "all distinct characters, no cleaning needed",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        `,
  },
  notes: {
    approach:
      "Walk two pointers inward and skip anything that is not a letter or a digit. When both pointers sit on a kept character, compare them lowercased; a mismatch means it is not a palindrome. Nothing needs to be rebuilt, so the extra space stays constant.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "isPalindrome",
    params: [{ name: "s", kind: "string" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/valid-palindrome/",
  reference: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        new = ''
        for a in s:
            if a.isalpha() or a.isdigit():
                new += a.lower()
        return (new == new[::-1])
`,
  rejection: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        # Forgets to ignore punctuation and case.
        return s == s[::-1]
`,
} satisfies AuthoredProblem;
