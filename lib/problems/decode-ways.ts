import type { AuthoredProblem } from "./authoring";

export const decodeWays = {
  "slug": "decode-ways",
  "number": 91,
  "title": "Decode Ways",
  "difficulty": "medium",
  "tags": ["string", "dynamic-programming", "neetcode-150"],
  "statement": "Digits 1 through 26 map to letters A through Z. Return the number of ways to decode the digit string, preserving its order. A zero is valid only as part of 10 or 20. This judge limits the string to 45 digits so the answer fits its signed 32-bit return type.",
  "examples": [
    {
      "args": [
        "12"
      ],
      "output": "2",
      "explanation": "12 can be decoded as AB or as L."
    },
    {
      "args": [
        "226"
      ],
      "output": "3",
      "explanation": "226 can be decoded as BBF, BZ, or VF."
    },
    {
      "args": [
        "06"
      ],
      "output": "0",
      "explanation": "A leading zero cannot be decoded."
    }
  ],
  "constraints": [
    "1 <= s.length <= 45 for this judge’s signed 32-bit answer",
    "s contains only digits.",
    "A leading zero is allowed and has no standalone decoding."
  ],
  "testcases": [
    {
      "args": [
        "12"
      ],
      "expected": "2",
      "hidden": false,
      "note": "Decode as 1|2 or 12."
    },
    {
      "args": [
        "226"
      ],
      "expected": "3",
      "hidden": false,
      "note": "The valid two-digit choices create three total decodings."
    },
    {
      "args": [
        "06"
      ],
      "expected": "0",
      "hidden": false,
      "note": "The first zero has no valid mapping."
    },
    {
      "args": [
        "0"
      ],
      "expected": "0",
      "hidden": true,
      "note": "Zero cannot be decoded by itself."
    },
    {
      "args": [
        "10"
      ],
      "expected": "1",
      "hidden": true,
      "note": "10 maps only as one two-digit letter."
    },
    {
      "args": [
        "20"
      ],
      "expected": "1",
      "hidden": true,
      "note": "20 maps to T; 0 cannot stand alone."
    },
    {
      "args": [
        "27"
      ],
      "expected": "1",
      "hidden": true,
      "note": "27 is too large to be a two-digit letter."
    },
    {
      "args": [
        "101"
      ],
      "expected": "1",
      "hidden": true,
      "note": "The middle zero must pair with the preceding 1."
    },
    {
      "args": [
        "2101"
      ],
      "expected": "1",
      "hidden": true,
      "note": "Each zero must be paired with the digit immediately before it."
    },
    {
      "args": [
        "11106"
      ],
      "expected": "2",
      "hidden": true,
      "note": "The zero can pair with the preceding 1, with two ways to decode the earlier prefix."
    },
    {
      "args": [
        "111111111111111111111111111111111111111111111"
      ],
      "expected": "1836311903",
      "hidden": true,
      "note": "Forty-five ones reach the largest answer used for this judge type."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def numDecodings(self, s: str) -> int:\n        "
  },
  "notes": {
    "approach": "At each position, a nonzero digit can be decoded on its own. If the current two digits form a value from 10 to 26, they add the ways from two positions earlier. A zero contributes only through that valid pair.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "signature": {
    "name": "numDecodings",
    "params": [
      {
        "name": "s",
        "kind": "string"
      }
    ],
    "returns": "int"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/decode-ways/",
  "reference": "class Solution:\n    def numDecodings(self, s: str) -> int:\n        # Memoization\n        dp = {len(s): 1}\n\n        def dfs(i):\n            if i in dp:\n                return dp[i]\n            if s[i] == \"0\":\n                return 0\n\n            res = dfs(i + 1)\n            if i + 1 < len(s) and (\n                s[i] == \"1\" or s[i] == \"2\" and s[i + 1] in \"0123456\"\n            ):\n                res += dfs(i + 2)\n            dp[i] = res\n            return res\n\n        return dfs(0)\n\n        # Dynamic Programming\n        dp = {len(s): 1}\n        for i in range(len(s) - 1, -1, -1):\n            if s[i] == \"0\":\n                dp[i] = 0\n            else:\n                dp[i] = dp[i + 1]\n\n            if i + 1 < len(s) and (\n                s[i] == \"1\" or s[i] == \"2\" and s[i + 1] in \"0123456\"\n            ):\n                dp[i] += dp[i + 2]\n        return dp[0]\n",
  "rejection": "class Solution:\n    def numDecodings(self, s):\n        # Counts nonzero digits but overlooks choices that combine two digits.\n        return sum(char != '0' for char in s)\n"
} satisfies AuthoredProblem;
