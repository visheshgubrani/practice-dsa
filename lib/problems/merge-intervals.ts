import type { AuthoredProblem } from "./authoring";

export const mergeIntervals = {
  slug: "merge-intervals",
  number: 56,
  title: "Merge Intervals",
  difficulty: "medium",
  tags: ["array", "sorting"],
  statement: [
    "Given an array of `intervals` where `intervals[i] = [startᵢ, endᵢ]`, merge all overlapping intervals, and return *an array of the non-overlapping intervals that cover all the intervals in the input*.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 3],
          [2, 6],
          [8, 10],
          [15, 18],
        ],
      ],
      output: "[[1,6],[8,10],[15,18]]",
      explanation:
        "[1,3] and [2,6] overlap, so they merge into [1,6]. The other intervals stay.",
    },
    {
      args: [
        [
          [1, 4],
          [4, 5],
        ],
      ],
      output: "[[1,5]]",
      explanation: "Intervals that touch at an endpoint overlap and merge.",
    },
    {
      args: [
        [
          [1, 4],
          [0, 4],
        ],
      ],
      output: "[[0,4]]",
      explanation: "The second interval starts earlier and covers the first.",
    },
  ],
  constraints: [
    "`1 <= intervals.length <= 10⁴`",
    "`intervals[i].length == 2`",
    "`0 <= startᵢ <= endᵢ <= 10⁴`",
  ],
  testcases: [
    {
      args: [
        [
          [1, 3],
          [2, 6],
          [8, 10],
          [15, 18],
        ],
      ],
      expected: "[[1,6],[8,10],[15,18]]",
      note: "[1,3] and [2,6] overlap, so they merge into [1,6]. The other intervals stay.",
    },
    {
      args: [
        [
          [1, 4],
          [4, 5],
        ],
      ],
      expected: "[[1,5]]",
      note: "Intervals that touch at an endpoint overlap and merge.",
    },
    {
      args: [
        [
          [1, 4],
          [0, 4],
        ],
      ],
      expected: "[[0,4]]",
      note: "The second interval starts earlier and covers the first.",
    },
    {
      args: [[[1, 1]]],
      expected: "[[1,1]]",
      hidden: true,
      note: "minimum length, a point interval",
    },
    {
      args: [
        [
          [1, 4],
          [2, 3],
        ],
      ],
      expected: "[[1,4]]",
      hidden: true,
      note: "contained interval",
    },
    {
      args: [
        [
          [1, 4],
          [0, 1],
        ],
      ],
      expected: "[[0,4]]",
      hidden: true,
      note: "unsorted, touching at 1",
    },
    {
      args: [
        [
          [1, 4],
          [5, 6],
        ],
      ],
      expected: "[[1,4],[5,6]]",
      hidden: true,
      note: "a gap, do not merge",
    },
    {
      args: [
        [
          [1, 3],
          [1, 3],
        ],
      ],
      expected: "[[1,3]]",
      hidden: true,
      note: "duplicate intervals",
    },
    {
      args: [
        [
          [8, 10],
          [1, 3],
          [2, 6],
          [15, 18],
        ],
      ],
      expected: "[[1,6],[8,10],[15,18]]",
      hidden: true,
      note: "same coverage as example 1, unsorted",
    },
    {
      args: [
        [
          [0, 0],
          [0, 10_000],
        ],
      ],
      expected: "[[0,10000]]",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [
        [
          [1, 10],
          [2, 3],
          [4, 5],
          [6, 7],
        ],
      ],
      expected: "[[1,10]]",
      hidden: true,
      note: "many intervals swallowed by one",
    },
  ],
  starterCode: {
    python: `class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        `,
  },
  notes: {
    approach:
      "Sort by start. Then scan once: a new interval either starts after the last merged end (append it) or overlaps/touches (extend the last end). Sorting first is what makes a single left-to-right pass enough; the compare policy requires that result in ascending start order with endpoints already ordered.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "merge",
    params: [{ name: "intervals", kind: "int[][]" }],
    returns: "int[][]",
  },
  // Ordered endpoints, ascending interval order — not recursive unordered.
  compare: "intervals",
  sourceUrl: "https://leetcode.com/problems/merge-intervals/",
  reference: `class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        ordered = sorted(intervals)
        merged = []
        for start, end in ordered:
            if not merged or start > merged[-1][1]:
                merged.append([start, end])
            else:
                merged[-1][1] = max(merged[-1][1], end)
        return merged
`,
} satisfies AuthoredProblem;
