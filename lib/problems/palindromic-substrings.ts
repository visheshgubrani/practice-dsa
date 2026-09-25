import type { AuthoredProblem } from "./authoring";

export const palindromicSubstrings = {
  "slug": "palindromic-substrings",
  "number": 647,
  "title": "Palindromic Substrings",
  "difficulty": "medium",
  "tags": [
    "two-pointers",
    "string",
    "dynamic-programming",
    "neetcode-150"
  ],
  "statement": "Count all contiguous substrings of s that read the same forward and backward. Substrings at different positions count separately, even when their text is identical.",
  "examples": [
    {
      "args": [
        "abc"
      ],
      "output": "3",
      "explanation": "Each single letter is a palindrome, and no longer substring is."
    },
    {
      "args": [
        "aaa"
      ],
      "output": "6",
      "explanation": "There are three single letters, two length-two substrings, and one length-three substring."
    }
  ],
  "constraints": [
    "1 <= s.length <= 1000",
    "s contains only lowercase English letters."
  ],
  "testcases": [
    {
      "args": [
        "abc"
      ],
      "expected": "3",
      "hidden": false,
      "note": "Only the three single-character substrings are palindromes."
    },
    {
      "args": [
        "aaa"
      ],
      "expected": "6",
      "hidden": false,
      "note": "Every contiguous substring of this repeated-letter string is a palindrome."
    },
    {
      "args": [
        "a"
      ],
      "expected": "1",
      "hidden": false,
      "note": "The single character is counted once."
    },
    {
      "args": [
        "aa"
      ],
      "expected": "3",
      "hidden": true,
      "note": "Both characters and the full two-character string are palindromes."
    },
    {
      "args": [
        "ab"
      ],
      "expected": "2",
      "hidden": true,
      "note": "Different single-character positions count separately."
    },
    {
      "args": [
        "aba"
      ],
      "expected": "4",
      "hidden": true,
      "note": "The center character and the full string add to the three singles."
    },
    {
      "args": [
        "abba"
      ],
      "expected": "6",
      "hidden": true,
      "note": "The two middle characters and the full string are even-length palindromes."
    },
    {
      "args": [
        "abcd"
      ],
      "expected": "4",
      "hidden": true,
      "note": "With distinct letters, only single characters qualify."
    },
    {
      "args": [
        "ababa"
      ],
      "expected": "9",
      "hidden": true,
      "note": "Odd centers produce several overlapping palindromes."
    },
    {
      "args": [
        "aabbaa"
      ],
      "expected": "11",
      "hidden": true,
      "note": "Repeated ends create both even and odd palindromes."
    },
    {
      "args": [
        "abcba"
      ],
      "expected": "7",
      "hidden": true,
      "note": "The full string and its palindromic inner ranges add to five singles."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def countSubstrings(self, s: str) -> int:\n        "
  },
  "notes": {
    "approach": "Treat each character and each gap between characters as a possible center. Expand outward while the characters match and count every successful span.",
    "timeComplexity": "O(n²)",
    "spaceComplexity": "O(1)"
  },
  "signature": {
    "name": "countSubstrings",
    "params": [
      {
        "name": "s",
        "kind": "string"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/palindromic-substrings/",
  "reference": "class Solution:\n    def countSubstrings(self, s: str) -> int:\n        res = 0\n\n        for i in range(len(s)):\n            res += self.countPali(s, i, i)\n            res += self.countPali(s, i, i + 1)\n        return res\n\n    def countPali(self, s, l, r):\n        res = 0\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            res += 1\n            l -= 1\n            r += 1\n        return res\n",
  "rejection": "class Solution:\n    def countSubstrings(self, s):\n        # Counts odd-length palindromes but never checks centers between characters.\n        count = 0\n        for center in range(len(s)):\n            left = right = center\n            while left >= 0 and right < len(s) and s[left] == s[right]:\n                count += 1\n                left -= 1\n                right += 1\n        return count\n"
} satisfies AuthoredProblem;
