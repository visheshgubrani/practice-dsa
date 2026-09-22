import type { AuthoredProblem } from "./authoring";

export const nonOverlappingIntervals = {
  slug: "non-overlapping-intervals",
  number: 435,
  title: "Non-overlapping Intervals",
  difficulty: "medium",
  tags: ["array", "dynamic-programming", "greedy", "sorting", "neetcode-150"],
  statement: [
    "Given a list of intervals `[start, end]`, return the fewest intervals you must remove so the rest do not overlap.",
    "",
    "Two intervals overlap when one starts strictly before the other ends. Touching at a single endpoint does not count.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 2],
          [2, 3],
          [3, 4],
          [1, 3],
        ],
      ],
      output: "1",
      explanation:
        "Remove [1,3]. The other three only touch at endpoints, so they can all stay.",
    },
    {
      args: [
        [
          [1, 2],
          [1, 2],
          [1, 2],
        ],
      ],
      output: "2",
      explanation: "All three cover the same span, so only one of them can remain.",
    },
    {
      args: [
        [
          [1, 2],
          [2, 3],
        ],
      ],
      output: "0",
      explanation: "They meet at 2 and do not overlap, so nothing is removed.",
    },
  ],
  constraints: [
    "`1 <= intervals.length <= 10⁵`",
    "`intervals[i].length == 2`",
    "`-5 * 10⁴ <= startᵢ < endᵢ <= 5 * 10⁴`",
  ],
  testcases: [
    {
      args: [
        [
          [1, 2],
          [2, 3],
          [3, 4],
          [1, 3],
        ],
      ],
      expected: "1",
      note: "Dropping [1,3] leaves a chain that only touches at endpoints.",
    },
    {
      args: [
        [
          [1, 2],
          [1, 2],
          [1, 2],
        ],
      ],
      expected: "2",
      note: "Three copies of the same interval leave one.",
    },
    {
      args: [
        [
          [1, 2],
          [2, 3],
        ],
      ],
      expected: "0",
      note: "Touching at an endpoint is not an overlap.",
    },
    {
      args: [[[1, 2]]],
      expected: "0",
      hidden: true,
      note: "a single interval",
    },
    {
      args: [
        [
          [1, 10],
          [2, 3],
          [4, 5],
        ],
      ],
      expected: "1",
      hidden: true,
      note: "the long interval overlaps two that do not overlap each other",
    },
    {
      args: [
        [
          [-5, 1],
          [1, 2],
        ],
      ],
      expected: "0",
      hidden: true,
      note: "a negative start that only touches the next interval",
    },
    {
      args: [
        [
          [1, 3],
          [2, 4],
          [3, 5],
        ],
      ],
      expected: "1",
      hidden: true,
      note: "each interval overlaps the next",
    },
    {
      args: [
        [
          [0, 2],
          [1, 3],
          [2, 4],
          [3, 5],
          [4, 6],
        ],
      ],
      expected: "2",
      hidden: true,
      note: "a staggered chain where every other interval can stay",
    },
    {
      args: [
        [
          [5, 6],
          [1, 2],
          [2, 3],
        ],
      ],
      expected: "0",
      hidden: true,
      note: "unsorted, but nothing actually overlaps",
    },
    {
      args: [
        [
          [1, 100],
          [11, 22],
          [1, 11],
          [2, 12],
        ],
      ],
      expected: "2",
      hidden: true,
      note: "several overlapping spans, two removals",
    },
    {
      args: [
        [
          [1, 4],
          [2, 3],
          [3, 4],
        ],
      ],
      expected: "1",
      hidden: true,
      note: "a contained interval plus one that touches its end",
    },
  ],
  starterCode: {
    python: `class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        `,
  },
  notes: {
    approach:
      "Sort by start. Walk once, remembering the end of the interval you kept. When the next interval starts before that end, the two overlap: drop the one that ends later and count it. An interval that starts exactly at the previous end only touches, so it stays.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "eraseOverlapIntervals",
    params: [{ name: "intervals", kind: "int[][]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/non-overlapping-intervals/",
  reference: `class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort()
        res = 0
        prevEnd = intervals[0][1]
        for start, end in intervals[1:]:
            if start >= prevEnd:
                prevEnd = end
            else:
                res += 1
                prevEnd = min(end, prevEnd)
        return res
`,
  rejection: `class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort()
        res = 0
        prevEnd = intervals[0][1]
        for start, end in intervals[1:]:
            # Touching at an endpoint is counted as an overlap.
            if start > prevEnd:
                prevEnd = end
            else:
                res += 1
                prevEnd = min(end, prevEnd)
        return res
`,
} satisfies AuthoredProblem;
