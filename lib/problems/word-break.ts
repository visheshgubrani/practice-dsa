import type { AuthoredProblem } from "./authoring";

export const wordBreak = {
  "slug": "word-break",
  "number": 139,
  "title": "Word Break",
  "difficulty": "medium",
  "tags": [
    "array",
    "hash-table",
    "string",
    "dynamic-programming",
    "trie",
    "memoization",
    "brute-force-search",
    "neetcode-150"
  ],
  "statement": "Return true if s can be split into one or more dictionary words placed consecutively. A dictionary word may be reused, and the entire string must be consumed.",
  "examples": [
    {
      "args": [
        "leetcode",
        [
          "leet",
          "code"
        ]
      ],
      "output": "true",
      "explanation": "The string splits into leet followed by code."
    },
    {
      "args": [
        "applepenapple",
        [
          "apple",
          "pen"
        ]
      ],
      "output": "true",
      "explanation": "The word apple can be reused on both sides of pen."
    },
    {
      "args": [
        "catsandog",
        [
          "cats",
          "dog",
          "sand",
          "and",
          "cat"
        ]
      ],
      "output": "false",
      "explanation": "No dictionary-word split consumes the final g."
    }
  ],
  "constraints": [
    "1 <= s.length <= 300",
    "1 <= wordDict.length <= 1000",
    "1 <= wordDict[i].length <= 20",
    "s and every dictionary word contain lowercase English letters.",
    "Dictionary words are unique."
  ],
  "testcases": [
    {
      "args": [
        "leetcode",
        [
          "leet",
          "code"
        ]
      ],
      "expected": "true",
      "hidden": false,
      "note": "The two dictionary words consume the whole string."
    },
    {
      "args": [
        "applepenapple",
        [
          "apple",
          "pen"
        ]
      ],
      "expected": "true",
      "hidden": false,
      "note": "A dictionary entry may appear more than once."
    },
    {
      "args": [
        "catsandog",
        [
          "cats",
          "dog",
          "sand",
          "and",
          "cat"
        ]
      ],
      "expected": "false",
      "hidden": false,
      "note": "The remaining suffix cannot be segmented."
    },
    {
      "args": [
        "a",
        [
          "a"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The whole input is one dictionary word."
    },
    {
      "args": [
        "a",
        [
          "b"
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "No dictionary word begins with the input character."
    },
    {
      "args": [
        "cars",
        [
          "car",
          "ca",
          "rs"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The valid split ca + rs requires not committing to the longer car prefix."
    },
    {
      "args": [
        "aaaaaaa",
        [
          "aaaa",
          "aaa"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The full string splits into aaaa + aaa."
    },
    {
      "args": [
        "abcd",
        [
          "a",
          "abc",
          "b",
          "cd"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The valid split is a + b + cd."
    },
    {
      "args": [
        "abcd",
        [
          "a",
          "abc",
          "d"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "The split abc + d consumes the entire string."
    },
    {
      "args": [
        "aaaaab",
        [
          "a",
          "aa",
          "aaa"
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "Dictionary pieces cover the a prefix but never the final b."
    },
    {
      "args": [
        "pineapplepenapple",
        [
          "apple",
          "pen",
          "applepen",
          "pine",
          "pineapple"
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "There are multiple valid segmentations of the full string."
    }
  ],
  "starterCode": {
    "python": "class Solution:\n    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n        "
  },
  "notes": {
    "approach": "Mark index 0 reachable. For each reachable boundary, try dictionary words that match there and mark their ending boundaries. The answer is whether the end of the string becomes reachable.",
    "timeComplexity": "O(n × m × w) in the direct prefix-DP formulation",
    "spaceComplexity": "O(n)"
  },
  "signature": {
    "name": "wordBreak",
    "params": [
      {
        "name": "s",
        "kind": "string"
      },
      {
        "name": "wordDict",
        "kind": "string[]"
      }
    ],
    "returns": "bool"
  },
  "compare": "exact",
  "sourceUrl": "https://leetcode.com/problems/word-break/",
  "reference": "class Solution:\n    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n\n        dp = [False] * (len(s) + 1)\n        dp[len(s)] = True\n\n        for i in range(len(s) - 1, -1, -1):\n            for w in wordDict:\n                if (i + len(w)) <= len(s) and s[i : i + len(w)] == w:\n                    dp[i] = dp[i + len(w)]\n                if dp[i]:\n                    break\n\n        return dp[0]\n",
  "rejection": "class Solution:\n    def wordBreak(self, s, wordDict):\n        # Commits to the longest matching word at each position without backtracking.\n        words = set(wordDict)\n        index = 0\n        while index < len(s):\n            matches = [word for word in words if s.startswith(word, index)]\n            if not matches:\n                return False\n            index += len(max(matches, key=len))\n        return True\n"
} satisfies AuthoredProblem;
