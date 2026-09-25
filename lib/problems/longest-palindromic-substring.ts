import type { AuthoredProblem } from "./authoring";

export const longestPalindromicSubstring = {
  "slug": "longest-palindromic-substring",
  "number": 5,
  "title": "Longest Palindromic Substring",
  "difficulty": "medium",
  "tags": [
    "two-pointers",
    "string",
    "dynamic-programming",
    "manacher",
    "neetcode-150"
  ],
  "statement": "Return the longest contiguous substring of s that reads the same forward and backward. If several longest palindromes exist, return the one whose starting index is smallest.",
  "examples": [
    {
      "args": [
        "babad"
      ],
      "output": "\"bab\"",
      "explanation": "Both bab and aba have length 3; bab starts earlier."
    },
    {
      "args": [
        "cbbd"
      ],
      "output": "\"bb\"",
      "explanation": "The middle two characters form the longest palindrome."
    }
  ],
  "constraints": [
    "1 <= s.length <= 1000",
    "s contains only digits and English letters."
  ],
  "testcases": [
    {
      "args": [
        "babad"
      ],
      "expected": "\"bab\"",
      "hidden": false,
      "note": "The tied longest answers are resolved by choosing the earlier starting position."
    },
    {
      "args": [
        "cbbd"
      ],
      "expected": "\"bb\"",
      "hidden": false,
      "note": "The answer can have even length."
    },
    {
      "args": [
        "a"
      ],
      "expected": "\"a\"",
      "hidden": false,
      "note": "A one-character string is a palindrome."
    },
    {
      "args": [
        "ac"
      ],
      "expected": "\"a\"",
      "hidden": true,
      "note": "Both single characters tie, so the earlier one is returned."
    },
    {
      "args": [
        "racecar"
      ],
      "expected": "\"racecar\"",
      "hidden": true,
      "note": "The entire string is palindromic."
    },
    {
      "args": [
        "abacdfgdcaba"
      ],
      "expected": "\"aba\"",
      "hidden": true,
      "note": "The longest palindrome occurs at both ends; choose the first."
    },
    {
      "args": [
        "forgeeksskeegfor"
      ],
      "expected": "\"geeksskeeg\"",
      "hidden": true,
      "note": "The longest palindrome is centered between two characters."
    },
    {
      "args": [
        "banana"
      ],
      "expected": "\"anana\"",
      "hidden": true,
      "note": "The longest palindrome starts after the first character."
    },
    {
      "args": [
        "aacabdkacaa"
      ],
      "expected": "\"aca\"",
      "hidden": true,
      "note": "The earliest of the tied longest palindromes is returned."
    },
    {
      "args": [
        "abcdc"
      ],
      "expected": "\"cdc\"",
      "hidden": true,
      "note": "The longest palindrome is the final three characters."
    },
    {
      "args": [
        "abcddcba"
      ],
      "expected": "\"abcddcba\"",
      "hidden": true,
      "note": "The whole even-length input is a palindrome."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        "
  },
  "notes": {
    "approach": "Every palindrome has a center at one character or between two characters. Expand outward from each center while the ends match, recording longer spans and keeping the earliest span on a tie.",
    "timeComplexity": "O(n²)",
    "spaceComplexity": "O(1) extra"
  },
  "signature": {
    "name": "longestPalindrome",
    "params": [
      {
        "name": "s",
        "kind": "string"
      }
    ],
    "returns": "string"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/longest-palindromic-substring/",
  "reference": "\nclass Solution:\n    def longestPalindrome(self, s: str) -> str:\n        self.res = \"\"\n        self.lenres = 0\n        for i in range(len(s)):\n            s1 = self.helper(s, i, i)\n            s2 = self.helper(s, i, i + 1)\n        return s2\n        \n    def helper(self, s, left, right):\n            while left >= 0 and right < len(s) and s[left] == s[right]:\n                if (right - left + 1) > self.lenres:\n                    self.res = s[left:right+1]\n                    self.lenres = right - left + 1\n                left -= 1\n                right += 1\n            return self.res\n\n\n",
  "rejection": "class Solution:\n    def longestPalindrome(self, s):\n        # Searches only odd-length centers and misses even-length palindromes.\n        best = s[0]\n        for center in range(len(s)):\n            left = right = center\n            while left >= 0 and right < len(s) and s[left] == s[right]:\n                if right - left + 1 > len(best):\n                    best = s[left:right + 1]\n                left -= 1\n                right += 1\n        return best\n"
} satisfies AuthoredProblem;
