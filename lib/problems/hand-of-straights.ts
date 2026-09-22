import type { AuthoredProblem } from "./authoring";

export const handOfStraights = {
  slug: "hand-of-straights",
  number: 846,
  title: "Hand of Straights",
  difficulty: "medium",
  tags: ["array", "hash-table", "greedy", "sorting", "neetcode-150"],
  statement: [
    "`hand` is a multiset of card values. Rearrange every card into groups of length `groupSize` where the values in each group are consecutive.",
    "",
    "Return whether that is possible. Each card is used once.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 2, 3, 6, 2, 3, 4, 7, 8], 3],
      output: "true",
      explanation: "One rearrangement is [1,2,3], [2,3,4], and [6,7,8].",
    },
    {
      args: [[1, 2, 3, 4, 5], 4],
      output: "false",
      explanation: "Five cards cannot be split into groups of four.",
    },
    {
      args: [[1], 1],
      output: "true",
      explanation: "A group of one is just that card.",
    },
  ],
  constraints: [
    "`1 <= hand.length <= 10⁴`",
    "`0 <= hand[i] <= 10⁹`",
    "`1 <= groupSize <= hand.length`",
  ],
  testcases: [
    {
      args: [[1, 2, 3, 6, 2, 3, 4, 7, 8], 3],
      expected: "true",
      note: "Duplicates are spread across consecutive groups, not piled into one.",
    },
    {
      args: [[1, 2, 3, 4, 5], 4],
      expected: "false",
      note: "The length is not a multiple of the group size.",
    },
    {
      args: [[1], 1],
      expected: "true",
      note: "One card, group size one.",
    },
    {
      args: [[1, 2, 3], 3],
      expected: "true",
      hidden: true,
      note: "a single consecutive group",
    },
    {
      args: [[1, 2, 4], 3],
      expected: "false",
      hidden: true,
      note: "the length divides, but 3 is missing",
    },
    {
      args: [[1, 1, 2, 2, 3, 3], 3],
      expected: "true",
      hidden: true,
      note: "two copies of the same straight",
    },
    {
      args: [[1, 1, 2, 2, 3, 3], 2],
      expected: "false",
      hidden: true,
      note: "pairs would have to be consecutive, and the 3s are not",
    },
    {
      args: [[0, 0], 2],
      expected: "false",
      hidden: true,
      note: "equal values are not consecutive, even at zero",
    },
    {
      args: [[5, 4, 3], 3],
      expected: "true",
      hidden: true,
      note: "the hand is not given in order",
    },
    {
      args: [[1, 2, 3, 4], 2],
      expected: "true",
      hidden: true,
      note: "two adjacent pairs",
    },
    {
      args: [[1000000000, 999999999], 2],
      expected: "true",
      hidden: true,
      note: "consecutive values at the top of the allowed range",
    },
  ],
  starterCode: {
    python: `class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        `,
  },
  notes: {
    approach:
      "If the hand's length is not a multiple of `groupSize`, stop. Otherwise count each value and always start the next group at the smallest value that is still left. That group must also contain the next `groupSize - 1` integers; a missing one makes the hand impossible. Using the smallest start first is safe, because that card cannot belong to any earlier group.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "isNStraightHand",
    params: [
      { name: "hand", kind: "int[]" },
      { name: "groupSize", kind: "int" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/hand-of-straights/",
  reference: `class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        if len(hand) % groupSize:
            return False

        count = {}
        for n in hand:
            count[n] = 1 + count.get(n, 0)

        minH = list(count.keys())
        heapq.heapify(minH)
        while minH:
            first = minH[0]
            for i in range(first, first + groupSize):
                if i not in count:
                    return False
                count[i] -= 1
                if count[i] == 0:
                    if i != minH[0]:
                        return False
                    heapq.heappop(minH)
        return True
`,
  rejection: `class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        # Sorts and slices into chunks, so duplicate values break a hand that
        # should be regrouped as several straights.
        if len(hand) % groupSize:
            return False
        ordered = sorted(hand)
        for i in range(0, len(ordered), groupSize):
            chunk = ordered[i : i + groupSize]
            for a, b in zip(chunk, chunk[1:]):
                if b != a + 1:
                    return False
        return True
`,
} satisfies AuthoredProblem;
