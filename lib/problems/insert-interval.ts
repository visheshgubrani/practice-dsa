import type { AuthoredProblem } from "./authoring";

export const insertInterval = {
  slug: "insert-interval",
  number: 57,
  title: "Insert Interval",
  difficulty: "medium",
  tags: ["array", "neetcode-150"],
  statement: [
    "You are given non-overlapping intervals, already sorted by start, and one `newInterval`. Insert it into the list, merging every interval that overlaps or merely touches it.",
    "",
    "Return the resulting intervals sorted by start. Each interval is `[start, end]` with the endpoints in that order.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 3],
          [6, 9],
        ],
        [2, 5],
      ],
      output: "[[1,5],[6,9]]",
      explanation:
        "[2,5] overlaps [1,3] and merges into [1,5]. [6,9] starts after that, so it stays.",
    },
    {
      args: [
        [
          [1, 2],
          [3, 5],
          [6, 7],
          [8, 10],
          [12, 16],
        ],
        [4, 8],
      ],
      output: "[[1,2],[3,10],[12,16]]",
      explanation:
        "[4,8] swallows [3,5], [6,7], and [8,10] into [3,10]. The intervals on either side stay.",
    },
    {
      args: [[], [5, 7]],
      output: "[[5,7]]",
      explanation: "An empty list has nothing to merge with, so the new interval is the whole answer.",
    },
  ],
  constraints: [
    "`0 <= intervals.length <= 10⁴`",
    "`intervals[i].length == 2`",
    "`0 <= startᵢ <= endᵢ <= 10⁵`",
    "`intervals` is sorted by start and does not overlap",
    "`newInterval.length == 2`",
    "`0 <= start <= end <= 10⁵`",
  ],
  testcases: [
    {
      args: [
        [
          [1, 3],
          [6, 9],
        ],
        [2, 5],
      ],
      expected: "[[1,5],[6,9]]",
      note: "[2,5] overlaps [1,3] and leaves [6,9] alone.",
    },
    {
      args: [
        [
          [1, 2],
          [3, 5],
          [6, 7],
          [8, 10],
          [12, 16],
        ],
        [4, 8],
      ],
      expected: "[[1,2],[3,10],[12,16]]",
      note: "One new interval merges three that it touches.",
    },
    {
      args: [[], [5, 7]],
      expected: "[[5,7]]",
      note: "Inserting into an empty list.",
    },
    {
      args: [[[1, 5]], [2, 3]],
      expected: "[[1,5]]",
      hidden: true,
      note: "the new interval sits entirely inside an existing one",
    },
    {
      args: [[[1, 5]], [6, 8]],
      expected: "[[1,5],[6,8]]",
      hidden: true,
      note: "a gap, so nothing merges",
    },
    {
      args: [[[3, 5]], [1, 2]],
      expected: "[[1,2],[3,5]]",
      hidden: true,
      note: "the new interval belongs at the front",
    },
    {
      args: [
        [
          [1, 3],
          [6, 9],
        ],
        [3, 6],
      ],
      expected: "[[1,9]]",
      hidden: true,
      note: "touching both neighbors bridges them into one interval",
    },
    {
      args: [
        [
          [1, 5],
          [6, 8],
        ],
        [5, 6],
      ],
      expected: "[[1,8]]",
      hidden: true,
      note: "endpoint touches chain three intervals together",
    },
    {
      args: [
        [
          [2, 5],
          [6, 7],
          [8, 9],
        ],
        [0, 1],
      ],
      expected: "[[0,1],[2,5],[6,7],[8,9]]",
      hidden: true,
      note: "a new interval before everything, with a gap",
    },
    {
      args: [
        [
          [1, 4],
          [6, 8],
        ],
        [0, 10],
      ],
      expected: "[[0,10]]",
      hidden: true,
      note: "the new interval covers the whole list",
    },
    {
      args: [[[10, 12]], [1, 1]],
      expected: "[[1,1],[10,12]]",
      hidden: true,
      note: "a point interval inserted before a later one",
    },
  ],
  starterCode: {
    python: `class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        `,
  },
  notes: {
    approach:
      "The intervals are already sorted and non-overlapping, so one left-to-right pass is enough. Copy every interval that ends before the new one, fold each overlapping or touching interval into a single span, then append whatever remains. The result stays sorted by start, with endpoints in order, which is the order the comparator checks.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "insert",
    params: [
      { name: "intervals", kind: "int[][]" },
      { name: "newInterval", kind: "int[]" },
    ],
    returns: "int[][]",
  },
  // Sorted by start, endpoints already ordered — the same contract as merge-intervals.
  compare: "intervals",
  sourceUrl: "https://leetcode.com/problems/insert-interval/",
  reference: `class Solution:
    def insert(
        self, intervals: List[List[int]], newInterval: List[int]
    ) -> List[List[int]]:
        res = []

        for i in range(len(intervals)):
            if newInterval[1] < intervals[i][0]:
                res.append(newInterval)
                return res + intervals[i:]
            elif newInterval[0] > intervals[i][1]:
                res.append(intervals[i])
            else:
                newInterval = [
                    min(newInterval[0], intervals[i][0]),
                    max(newInterval[1], intervals[i][1]),
                ]
        res.append(newInterval)
        return res
`,
  rejection: `class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        res = []
        for i in range(len(intervals)):
            # Touching endpoints are treated as a gap, so [1,5] and [5,6] stay apart.
            if newInterval[1] <= intervals[i][0]:
                res.append(newInterval)
                return res + intervals[i:]
            elif newInterval[0] >= intervals[i][1]:
                res.append(intervals[i])
            else:
                newInterval = [
                    min(newInterval[0], intervals[i][0]),
                    max(newInterval[1], intervals[i][1]),
                ]
        res.append(newInterval)
        return res
`,
} satisfies AuthoredProblem;
