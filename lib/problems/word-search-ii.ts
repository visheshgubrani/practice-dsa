import type { AuthoredProblem } from "./authoring";

export const wordSearchIi = {
  slug: "word-search-ii",
  number: 212,
  title: "Word Search II",
  difficulty: "hard",
  tags: ["array", "string", "backtracking", "trie", "matrix", "neetcode-150"],
  statement: [
    "Given a board of lowercase letters and a list of words, return every word that can be traced on the board. A word is traced by moving from a cell to a horizontally or vertically adjacent cell, one letter per step, without visiting the same cell twice within that word.",
    "",
    "The words in the answer may be returned in **any order**; the judge compares them as a set. Each word may appear at most once in the answer, and the input words are distinct.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          ["o", "a", "a", "n"],
          ["e", "t", "a", "e"],
          ["i", "h", "k", "r"],
          ["i", "f", "l", "v"],
        ],
        ["oath", "pea", "eat", "rain"],
      ],
      output: "[\"eat\",\"oath\"]",
      explanation:
        "`oath` runs along the top-left and `eat` sits beside it; `pea` and `rain` have no path.",
    },
    {
      args: [
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ["abcb"],
      ],
      output: "[]",
      explanation:
        "The only `a` is in a corner and `abcb` would have to step back onto the `b` it started from.",
    },
  ],
  constraints: [
    "`m == board.length` and `n == board[i].length`",
    "`1 <= m, n <= 12`",
    "Every board cell is a lowercase English letter.",
    "`1 <= words.length <= 3 * 10⁴`",
    "`1 <= words[i].length <= 10`",
    "All the words in `words` are unique.",
    "The answer may be in any order.",
  ],
  testcases: [
    {
      args: [
        [
          ["o", "a", "a", "n"],
          ["e", "t", "a", "e"],
          ["i", "h", "k", "r"],
          ["i", "f", "l", "v"],
        ],
        ["oath", "pea", "eat", "rain"],
      ],
      expected: "[\"eat\",\"oath\"]",
      note: "Two words are traceable and two are not.",
    },
    {
      args: [
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ["abcb"],
      ],
      expected: "[]",
      note: "The path would have to reuse a cell, which is not allowed.",
    },
    {
      args: [[["a"]], ["a"]],
      expected: "[\"a\"]",
      hidden: true,
      note: "the smallest board and a single matching letter",
    },
    {
      args: [[["a"]], ["a", "b", "ab"]],
      expected: "[\"a\"]",
      hidden: true,
      note: "words longer than the board cannot be traced",
    },
    {
      args: [
        [["a", "b"]],
        ["a", "ab", "b", "ba", "c"],
      ],
      expected: "[\"ba\",\"b\",\"a\",\"ab\"]",
      hidden: true,
      note: "both directions along a two-cell board, and one absent word",
    },
    {
      args: [
        [["a", "a"]],
        ["a", "aa", "aaa"],
      ],
      expected: "[\"a\",\"aa\"]",
      hidden: true,
      note: "a letter that appears twice must still yield one entry",
    },
    {
      args: [
        [
          ["a", "a", "a"],
          ["a", "a", "a"],
        ],
        ["aaaaa", "aaaaaa", "aaaaaaa"],
      ],
      expected: "[\"aaaaaa\",\"aaaaa\"]",
      hidden: true,
      note: "six cells cap the longest word at six letters",
    },
    {
      args: [
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ["abcb", "abc", "ab", "abd", "dca"],
      ],
      expected: "[\"ab\",\"abd\",\"dca\"]",
      hidden: true,
      note: "a diagonal detour succeeds where the straight line fails",
    },
    {
      args: [
        [
          ["a", "b"],
          ["b", "a"],
        ],
        ["ab", "ba", "aba", "bab", "abab"],
      ],
      expected: "[\"bab\",\"aba\",\"ba\",\"ab\",\"abab\"]",
      hidden: true,
      note: "the same letters repeat, so several words share a prefix",
    },
    {
      args: [
        [
          ["a", "b", "c"],
          ["d", "e", "f"],
        ],
        ["ab", "de", "abcdef", "fedcba", "abcfed"],
      ],
      expected: "[\"ab\",\"abcfed\",\"de\"]",
      hidden: true,
      note: "only the ordering that follows the board is traceable",
    },
    {
      args: [
        [
          ["a", "b", "c"],
          ["c", "b", "a"],
        ],
        ["abc", "cba", "abccba", "bb", "cc", "aa"],
      ],
      expected: "[\"bb\",\"abc\",\"cba\"]",
      hidden: true,
      note: "mirrored rows: a vertical repeat works, a repeated letter in one row does not",
    },
  ],
  starterCode: {
    python: `class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        `,
  },
  notes: {
    approach:
      "A depth-first walk from every cell that tries each word separately repeats the same prefixes once per word. Building a trie of the words first lets one walk serve them all: the walk stops as soon as the current path is not a trie node's child, and a node flagged as a word end records an answer. Removing a found word from the trie prunes duplicate walks, and the visited set makes sure a cell is not used twice inside one word. Since the answer is compared as a set, the order the walk happens to produce is irrelevant.",
    timeComplexity: "O(m * n * 4 * 3^(L - 1)) for the walk, plus O(total letters) to build the trie",
    spaceComplexity: "O(total letters) for the trie and the visited set",
  },
  signature: {
    name: "findWords",
    params: [
      { name: "board", kind: "string[][]" },
      { name: "words", kind: "string[]" },
    ],
    returns: "string[]",
  },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/word-search-ii/",
  reference: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.isWord = False
        self.refs = 0

    def addWord(self, word):
        cur = self
        cur.refs += 1
        for c in word:
            if c not in cur.children:
                cur.children[c] = TrieNode()
            cur = cur.children[c]
            cur.refs += 1
        cur.isWord = True

    def removeWord(self, word):
        cur = self
        cur.refs -= 1
        for c in word:
            if c in cur.children:
                cur = cur.children[c]
                cur.refs -= 1


class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        root = TrieNode()
        for w in words:
            root.addWord(w)

        ROWS, COLS = len(board), len(board[0])
        res, visit = set(), set()

        def dfs(r, c, node, word):
            if (
                r not in range(ROWS) 
                or c not in range(COLS)
                or board[r][c] not in node.children
                or node.children[board[r][c]].refs < 1
                or (r, c) in visit
            ):
                return

            visit.add((r, c))
            node = node.children[board[r][c]]
            word += board[r][c]
            if node.isWord:
                node.isWord = False
                res.add(word)
                root.removeWord(word)

            dfs(r + 1, c, node, word)
            dfs(r - 1, c, node, word)
            dfs(r, c + 1, node, word)
            dfs(r, c - 1, node, word)
            visit.remove((r, c))

        for r in range(ROWS):
            for c in range(COLS):
                dfs(r, c, root, "")

        return list(res)
`,
  rejection: `class Solution:
    def findWords(self, board, words):
        # Plain prefix matching ignores that a cell cannot be reused inside one
        # word, so words like "aaa" on a two-cell board are reported.
        ROWS, COLS = len(board), len(board[0])
        res = []

        def dfs(r, c, word, index):
            if index == len(word):
                return True
            if r < 0 or r >= ROWS or c < 0 or c >= COLS:
                return False
            if board[r][c] != word[index]:
                return False
            return (
                dfs(r + 1, c, word, index + 1)
                or dfs(r - 1, c, word, index + 1)
                or dfs(r, c + 1, word, index + 1)
                or dfs(r, c - 1, word, index + 1)
            )

        for word in words:
            if any(dfs(r, c, word, 0) for r in range(ROWS) for c in range(COLS)):
                res.append(word)
        return res
`,
} satisfies AuthoredProblem;
