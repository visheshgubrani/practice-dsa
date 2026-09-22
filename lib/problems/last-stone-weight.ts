import type { AuthoredProblem } from "./authoring";

export const lastStoneWeight = {
  slug: "last-stone-weight",
  number: 1046,
  title: "Last Stone Weight",
  difficulty: "easy",
  tags: ["array", "heap-priority-queue", "neetcode-150"],
  statement: [
    "You smash stones two at a time. Each turn, take the two heaviest. If they weigh the same, both are destroyed. If not, the lighter one is destroyed and the heavier one is replaced by the difference.",
    "",
    "Return the weight of the last stone. When none remain, return `0`.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 7, 4, 1, 8, 1]],
      output: "1",
      explanation:
        "Smash 8 and 7, leaving 1. The stones are then 1, 4, 2, 1, 1, and they keep colliding down to a single 1.",
    },
    {
      args: [[1]],
      output: "1",
      explanation: "One stone is never smashed.",
    },
    {
      args: [[2, 2]],
      output: "0",
      explanation: "The two stones match, so both are destroyed.",
    },
  ],
  constraints: ["`1 <= stones.length <= 30`", "`1 <= stones[i] <= 1000`"],
  testcases: [
    {
      args: [[2, 7, 4, 1, 8, 1]],
      expected: "1",
      note: "The heaviest pair is 8 and 7, and the difference has to go back into the pile.",
    },
    {
      args: [[1]],
      expected: "1",
      note: "A single stone.",
    },
    {
      args: [[2, 2]],
      expected: "0",
      note: "Equal stones destroy each other.",
    },
    {
      args: [[1, 3]],
      expected: "2",
      hidden: true,
      note: "one smash, the difference remains",
    },
    {
      args: [[3, 7, 2]],
      expected: "2",
      hidden: true,
      note: "7 and 3 leave 4, then 4 and 2 leave 2",
    },
    {
      args: [[9, 3, 2, 1]],
      expected: "3",
      hidden: true,
      note: "the difference has to be smashed again, not returned as the answer",
    },
    {
      args: [[1, 1, 1]],
      expected: "1",
      hidden: true,
      note: "two equal stones vanish and the third remains",
    },
    {
      args: [[10, 10, 10]],
      expected: "10",
      hidden: true,
      note: "one pair cancels and the third stone is left",
    },
    {
      args: [[5, 5, 5, 5]],
      expected: "0",
      hidden: true,
      note: "two cancelling pairs leave nothing",
    },
    {
      args: [[1000]],
      expected: "1000",
      hidden: true,
      note: "the heaviest allowed stone, alone",
    },
    {
      args: [[8, 7, 6, 5]],
      expected: "0",
      hidden: true,
      note: "the differences cancel on the next rounds",
    },
  ],
  starterCode: {
    python: `class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Always smash the two heaviest stones, which a max-heap hands you in order. Equal weights destroy both. Otherwise push the positive difference back, because it may be heavier than what is left. The last value in the heap is the answer, or 0 when the heap ends empty.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "lastStoneWeight",
    params: [{ name: "stones", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/last-stone-weight/",
  reference: `class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        stones = [-s for s in stones]
        heapq.heapify(stones)

        while len(stones) > 1:
            first = heapq.heappop(stones)
            second = heapq.heappop(stones)
            if second > first:
                heapq.heappush(stones, first - second)

        stones.append(0)
        return abs(stones[0])

# There's a private _heapify_max method.
# https://github.com/python/cpython/blob/1170d5a292b46f754cd29c245a040f1602f70301/Lib/heapq.py#L198
class Solution(object):
    def lastStoneWeight(self, stones):
        heapq._heapify_max(stones)
        while len(stones) > 1:
            max_stone = heapq._heappop_max(stones)
            diff = max_stone - stones[0]
            if diff:
                heapq._heapreplace_max(stones, diff)
            else:
                heapq._heappop_max(stones)
        
        stones.append(0)
        return stones[0]
`,
  rejection: `class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        # Smashes stones from the front of the list, not the two heaviest.
        pile = list(stones)
        while len(pile) > 1:
            first = pile.pop(0)
            second = pile.pop(0)
            if first != second:
                pile.append(abs(first - second))
        return pile[0] if pile else 0
`,
} satisfies AuthoredProblem;
