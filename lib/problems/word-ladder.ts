import type { AuthoredProblem } from "./authoring";

export const wordLadder = {
  slug: "word-ladder",
  number: 127,
  title: "Word Ladder",
  difficulty: "hard",
  tags: ["hash-table","string","breadth-first-search","bidirectional-search","neetcode-150"],
  statement: "A transformation changes exactly one letter at a time, and each intermediate word must be in `wordList`. Return the number of words in a shortest transformation from `beginWord` to `endWord`, including both endpoints, or 0 if no route exists.",
  examples: [
    {
      "args": [
        "hit",
        "cog",
        [
          "hot",
          "dot",
          "dog",
          "lot",
          "log",
          "cog"
        ]
      ],
      "output": "5",
      "explanation": "A shortest route connects the endpoints through five words."
    },
    {
      "args": [
        "hit",
        "cog",
        [
          "hot",
          "dot",
          "dog",
          "lot",
          "log"
        ]
      ],
      "output": "0",
      "explanation": "The target is absent from the allowed list."
    }
  ],
  constraints: [
    "`1 <= beginWord.length <= 10` and `endWord` has the same length.",
    "`1 <= wordList.length <= 5000`; every word has the same length and uses lowercase English letters.",
    "Words in `wordList` are unique and `beginWord != endWord`."
  ],
  testcases: [
    {
      "args": [
        "hit",
        "cog",
        [
          "hot",
          "dot",
          "dog",
          "lot",
          "log",
          "cog"
        ]
      ],
      "expected": "5",
      "note": "A shortest route connects the endpoints through five words."
    },
    {
      "args": [
        "hit",
        "cog",
        [
          "hot",
          "dot",
          "dog",
          "lot",
          "log"
        ]
      ],
      "expected": "0",
      "note": "The target is absent from the allowed list."
    },
    {
      "args": [
        "a",
        "b",
        [
          "b"
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "The endpoints differ by one letter."
    },
    {
      "args": [
        "aaa",
        "bbb",
        [
          "aab",
          "abb",
          "bbb"
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "Each step changes one letter and uses an allowed intermediate."
    },
    {
      "args": [
        "red",
        "tax",
        [
          "ted",
          "tex",
          "red",
          "tax",
          "tad",
          "den",
          "rex",
          "pee"
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "Two shortest routes each contain four words."
    },
    {
      "args": [
        "same",
        "came",
        [
          "came"
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "Only one letter changes."
    },
    {
      "args": [
        "cold",
        "warm",
        [
          "cord",
          "card",
          "ward",
          "warm"
        ]
      ],
      "expected": "5",
      "hidden": true,
      "note": "The allowed chain is the only route to the target."
    },
    {
      "args": [
        "talk",
        "tail",
        [
          "tall",
          "tail"
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The route passes through tall."
    },
    {
      "args": [
        "hit",
        "hot",
        [
          "hot",
          "dot",
          "dog"
        ]
      ],
      "expected": "2",
      "hidden": true,
      "note": "The target is one change away."
    },
    {
      "args": [
        "aaa",
        "bbb",
        [
          "aab",
          "abb",
          "bab",
          "bbb"
        ]
      ],
      "expected": "4",
      "hidden": true,
      "note": "The route through bab is shorter than the other branch."
    },
    {
      "args": [
        "ab",
        "ba",
        [
          "ba",
          "aa"
        ]
      ],
      "expected": "3",
      "hidden": true,
      "note": "The allowed intermediate is needed because both letters differ."
    }
  ],
  starterCode: { python: `class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        
` },
  notes: {
    "approach": "Treat words as vertices connected when they differ in one position. Breadth-first search explores paths in increasing length, so the first visit to the target is a shortest transformation.",
    "timeComplexity": "O(M² * N), where M is the number of words and N is their length",
    "spaceComplexity": "O(M² * N)"
  },
  signature: {
    "name": "ladderLength",
    "params": [
      {
        "name": "beginWord",
        "kind": "string"
      },
      {
        "name": "endWord",
        "kind": "string"
      },
      {
        "name": "wordList",
        "kind": "string[]"
      }
    ],
    "returns": "int"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/word-ladder/",
  reference: `class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        if endWord not in wordList:
            return 0

        nei = collections.defaultdict(list)
        wordList.append(beginWord)
        for word in wordList:
            for j in range(len(word)):
                pattern = word[:j] + "*" + word[j + 1 :]
                nei[pattern].append(word)

        visit = set([beginWord])
        q = deque([beginWord])
        res = 1
        while q:
            for i in range(len(q)):
                word = q.popleft()
                if word == endWord:
                    return res
                for j in range(len(word)):
                    pattern = word[:j] + "*" + word[j + 1 :]
                    for neiWord in nei[pattern]:
                        if neiWord not in visit:
                            visit.add(neiWord)
                            q.append(neiWord)
            res += 1
        return 0
`,
  rejection: `class Solution:
    def ladderLength(self, beginWord, endWord, wordList):
        return len(wordList) + 1 if endWord in wordList else 0
`,
} satisfies AuthoredProblem;
