import type { AuthoredProblem } from "./authoring";

export const partitionLabels = {
  slug: "partition-labels",
  number: 763,
  title: "Partition Labels",
  difficulty: "medium",
  tags: ["hash-table", "two-pointers", "string", "greedy", "neetcode-150"],
  statement: [
    "Split `s` into as many pieces as possible so that each letter appears in at most one piece.",
    "",
    "Return the lengths of those pieces from left to right.",
  ].join("\n"),
  examples: [
    {
      args: ["ababcbacadefegdehijhklij"],
      output: "[9,7,8]",
      explanation:
        "The first 9 letters are the whole life of a, b, and c. The next 7 cover d, e, f, and g. The last 8 cover the rest.",
    },
    {
      args: ["eccbbbbdec"],
      output: "[10]",
      explanation: "Every letter appears again later, so the string cannot be split.",
    },
    {
      args: ["a"],
      output: "[1]",
      explanation: "One letter is one piece.",
    },
  ],
  constraints: ["`1 <= s.length <= 500`", "`s` consists of lowercase English letters."],
  testcases: [
    {
      args: ["ababcbacadefegdehijhklij"],
      expected: "[9,7,8]",
      note: "Three pieces, each letter confined to one of them.",
    },
    {
      args: ["eccbbbbdec"],
      expected: "[10]",
      note: "The first and last letters tie the whole string into one piece.",
    },
    {
      args: ["a"],
      expected: "[1]",
      note: "A single character.",
    },
    {
      args: ["abc"],
      expected: "[1,1,1]",
      hidden: true,
      note: "three letters, each used once",
    },
    {
      args: ["abac"],
      expected: "[3,1]",
      hidden: true,
      note: "the second a pulls the first piece through index 2",
    },
    {
      args: ["aaa"],
      expected: "[3]",
      hidden: true,
      note: "one letter repeated",
    },
    {
      args: ["ab"],
      expected: "[1,1]",
      hidden: true,
      note: "two distinct letters",
    },
    {
      args: ["abab"],
      expected: "[4]",
      hidden: true,
      note: "a and b both reach the end",
    },
    {
      args: ["abcabc"],
      expected: "[6]",
      hidden: true,
      note: "every letter occurs in both halves",
    },
    {
      args: ["abcab"],
      expected: "[5]",
      hidden: true,
      note: "the last b extends the piece past the last a",
    },
    {
      args: ["caedbdedda"],
      expected: "[1,9]",
      hidden: true,
      note: "the first letter is finished immediately; the rest are tied together",
    },
  ],
  starterCode: {
    python: `class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Record the last index of every letter. Scan left to right and extend the current piece through the last index of each letter it contains. When the scan reaches that end, the piece is as short as it can be: close it, record its length, and start the next one.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "partitionLabels",
    params: [{ name: "s", kind: "string" }],
    returns: "int[]",
  },
  // Left-to-right piece lengths. A different order is a different partition.
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/partition-labels/",
  reference: `class Solution:
    def partitionLabels(self, S: str) -> List[int]:
        count = {}
        res = []
        i, length = 0, len(S)
        for j in range(length):
            c = S[j]
            count[c] = j

        curLen = 0
        goal = 0
        while i < length:
            c = S[i]
            goal = max(goal, count[c])
            curLen += 1

            if goal == i:
                res.append(curLen)
                curLen = 0
            i += 1
        return res
`,
  rejection: `class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        # Closes each piece at the last copy of its first letter, and never
        # extends it when a letter inside the piece appears further on.
        last = {c: i for i, c in enumerate(s)}
        parts = []
        i = 0
        while i < len(s):
            end = last[s[i]]
            parts.append(end - i + 1)
            i = end + 1
        return parts
`,
} satisfies AuthoredProblem;
