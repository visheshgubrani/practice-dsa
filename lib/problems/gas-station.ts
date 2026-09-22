import type { AuthoredProblem } from "./authoring";

export const gasStation = {
  slug: "gas-station",
  number: 134,
  title: "Gas Station",
  difficulty: "medium",
  tags: ["array", "greedy", "neetcode-150"],
  statement: [
    "Stations sit on a circle. At station `i` you collect `gas[i]`, and the drive to the next station costs `cost[i]`. You start with an empty tank and may only move forward.",
    "",
    "Return the index of the station where a full loop is possible. When no station works, return `-1`. The inputs here have at most one such start, so the index is unique.",
  ].join("\n"),
  examples: [
    {
      args: [
        [1, 2, 3, 4, 5],
        [3, 4, 5, 1, 2],
      ],
      output: "3",
      explanation:
        "Start at 3: the tank goes 4-1, then 5-2, 1-3, 2-4, 3-5 and never goes negative. Every earlier start fails.",
    },
    {
      args: [
        [2, 3, 4],
        [3, 4, 3],
      ],
      output: "-1",
      explanation: "The stations hold 9 gas and the loop costs 10, so the tank cannot finish.",
    },
    {
      args: [[5], [4]],
      output: "0",
      explanation: "One station, and it holds more gas than the trip back to itself costs.",
    },
  ],
  constraints: [
    "`gas.length == cost.length`",
    "`1 <= gas.length <= 10⁵`",
    "`0 <= gas[i], cost[i] <= 10⁴`",
    "At most one station completes the circuit.",
  ],
  testcases: [
    {
      args: [
        [1, 2, 3, 4, 5],
        [3, 4, 5, 1, 2],
      ],
      expected: "3",
      note: "The unique start is station 3, not the station with the most gas.",
    },
    {
      args: [
        [2, 3, 4],
        [3, 4, 3],
      ],
      expected: "-1",
      note: "Total cost exceeds total gas.",
    },
    {
      args: [[5], [4]],
      expected: "0",
      note: "A single station with gas left over.",
    },
    {
      args: [[1], [2]],
      expected: "-1",
      hidden: true,
      note: "a single station that cannot afford its own loop",
    },
    {
      args: [
        [3, 1, 1],
        [1, 2, 2],
      ],
      expected: "0",
      hidden: true,
      note: "the tank returns to empty exactly at the end of the loop",
    },
    {
      args: [
        [0, 1],
        [1, 0],
      ],
      expected: "1",
      hidden: true,
      note: "the only workable start is the second station",
    },
    {
      args: [
        [2, 3, 4],
        [3, 4, 2],
      ],
      expected: "2",
      hidden: true,
      note: "start at the last station; the totals match exactly",
    },
    {
      args: [
        [5, 8, 2, 8],
        [6, 5, 6, 6],
      ],
      expected: "3",
      hidden: true,
      note: "a four-station circuit whose unique start is the last index",
    },
    {
      args: [
        [1, 5, 3],
        [3, 1, 4],
      ],
      expected: "1",
      hidden: true,
      note: "total gas exceeds total cost, and only index 1 completes the loop",
    },
    {
      args: [
        [6, 1, 4, 3, 5],
        [3, 8, 2, 4, 2],
      ],
      expected: "2",
      hidden: true,
      note: "station 1 cannot be a start because its cost exceeds its gas",
    },
    {
      args: [
        [5, 0, 0, 0],
        [1, 2, 1, 1],
      ],
      expected: "0",
      hidden: true,
      note: "later stations add no gas, so the opening surplus has to carry the loop",
    },
  ],
  starterCode: {
    python: `class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "If the total gas is less than the total cost, no start works. Otherwise one pass is enough: walk the circle with a running tank, and whenever the tank would go negative, every station in that stretch fails as a start. The next station becomes the candidate and the tank resets. The unique-start guarantee makes that candidate the answer.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "canCompleteCircuit",
    params: [
      { name: "gas", kind: "int[]" },
      { name: "cost", kind: "int[]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/gas-station/",
  reference: `class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        start, end = len(gas) - 1, 0
        total = gas[start] - cost[start]

        while start >= end:
            while total < 0 and start >= end:
                start -= 1
                total += gas[start] - cost[start]
            if start == end:
                return start
            total += gas[end] - cost[end]
            end += 1
        return -1
`,
  rejection: `class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        # A non-negative total is not a start index. Index 0 is not always the start.
        total = 0
        for i in range(len(gas)):
            total += gas[i] - cost[i]
        return 0 if total >= 0 else -1
`,
} satisfies AuthoredProblem;
