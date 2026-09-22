import type { AuthoredProblem } from "./authoring";

export const minimumIntervalToIncludeEachQuery = {
  slug: "minimum-interval-to-include-each-query",
  number: 1851,
  title: "Minimum Interval to Include Each Query",
  difficulty: "hard",
  tags: ["array", "binary-search", "sweep-line", "sorting", "heap-priority-queue", "neetcode-150"],
  statement: [
    "You are given closed intervals `[left, right]` and a list of queries. For each query, choose an interval that contains it and has the smallest length, `right - left + 1`.",
    "",
    "Return those lengths in the same order as the queries. When no interval contains a query, that answer is `-1`.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 4],
          [2, 4],
          [3, 6],
          [4, 4],
        ],
        [2, 3, 4, 5],
      ],
      output: "[3,3,1,4]",
      explanation:
        "Query 2 is inside [2,4] (length 3). Query 4 is inside the point [4,4] (length 1). Query 5 is only inside [3,6] (length 4).",
    },
    {
      args: [
        [
          [2, 3],
          [2, 5],
          [1, 8],
          [20, 25],
        ],
        [2, 19, 5, 22],
      ],
      output: "[2,-1,4,6]",
      explanation:
        "19 sits in no interval. 22 is inside [20,25] only. 2 prefers the short [2,3] over the longer covers.",
    },
    {
      args: [[[1, 1]], [1]],
      output: "[1]",
      explanation: "A point interval has length 1, and the query lands on it.",
    },
  ],
  constraints: [
    "`1 <= intervals.length, queries.length <= 10⁵`",
    "`intervals[i].length == 2`",
    "`1 <= leftᵢ <= rightᵢ <= 10⁷`",
    "`1 <= queries[j] <= 10⁷`",
  ],
  testcases: [
    {
      args: [
        [
          [1, 4],
          [2, 4],
          [3, 6],
          [4, 4],
        ],
        [2, 3, 4, 5],
      ],
      expected: "[3,3,1,4]",
      note: "The point interval wins for the query that lands on it.",
    },
    {
      args: [
        [
          [2, 3],
          [2, 5],
          [1, 8],
          [20, 25],
        ],
        [2, 19, 5, 22],
      ],
      expected: "[2,-1,4,6]",
      note: "One query falls in a gap and is -1.",
    },
    {
      args: [[[1, 1]], [1]],
      expected: "[1]",
      note: "A single point interval.",
    },
    {
      args: [[[1, 10]], [1, 10, 5, 11]],
      expected: "[10,10,10,-1]",
      hidden: true,
      note: "both endpoints match; a query just past the end does not",
    },
    {
      args: [
        [
          [1, 2],
          [3, 4],
        ],
        [2, 3],
      ],
      expected: "[2,2]",
      hidden: true,
      note: "each query hits exactly one endpoint",
    },
    {
      args: [
        [
          [5, 5],
          [1, 10],
        ],
        [5],
      ],
      expected: "[1]",
      hidden: true,
      note: "a point interval is shorter than a long cover of the same point",
    },
    {
      args: [
        [
          [1, 3],
          [2, 2],
          [2, 4],
        ],
        [2],
      ],
      expected: "[1]",
      hidden: true,
      note: "three covers, the shortest has length 1",
    },
    {
      args: [
        [
          [1, 100],
          [50, 51],
        ],
        [50, 1, 100],
      ],
      expected: "[2,100,100]",
      hidden: true,
      note: "the short interval covers only the middle query",
    },
    {
      args: [[[8, 8]], [7, 8, 9]],
      expected: "[-1,1,-1]",
      hidden: true,
      note: "neighbors of a point interval miss it",
    },
    {
      args: [
        [
          [1, 2],
          [2, 3],
          [3, 4],
        ],
        [2],
      ],
      expected: "[2]",
      hidden: true,
      note: "two intervals of equal length both contain the query",
    },
    {
      args: [
        [
          [10, 20],
          [15, 16],
          [1, 1000],
        ],
        [15, 16, 9],
      ],
      expected: "[2,2,1000]",
      hidden: true,
      note: "a tiny interval beats a huge one, and a query outside both short ones uses the huge one",
    },
  ],
  starterCode: {
    python: `class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Sort the intervals by start and sweep the queries from small to large. Push every interval that has already started onto a min-heap keyed by length, and drop any whose right end is before the current query. The heap's top is the shortest interval that still covers the query; if the heap is empty the answer is -1. Write each answer back next to the original query so the result follows query order, not sorted order.",
    timeComplexity: "O((n + m) log (n + m))",
    spaceComplexity: "O(n + m)",
  },
  signature: {
    name: "minInterval",
    params: [
      { name: "intervals", kind: "int[][]" },
      { name: "queries", kind: "int[]" },
    ],
    returns: "int[]",
  },
  // Aligned with the query list. A shuffled answer is a different assignment.
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/minimum-interval-to-include-each-query/",
  reference: `class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals.sort()
        minHeap = []
        res = {}
        i = 0
        for q in sorted(queries):
            while i < len(intervals) and intervals[i][0] <= q:
                l, r = intervals[i]
                heapq.heappush(minHeap, (r - l + 1, r))
                i += 1

            while minHeap and minHeap[0][1] < q:
                heapq.heappop(minHeap)
            res[q] = minHeap[0][0] if minHeap else -1
        return [res[q] for q in queries]
`,
  rejection: `class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        # Length is right - left, so every real interval is reported one short
        # and a point interval is reported as 0.
        ans = []
        for q in queries:
            best = None
            for left, right in intervals:
                if left <= q <= right:
                    length = right - left
                    if best is None or length < best:
                        best = length
            ans.append(-1 if best is None else best)
        return ans
`,
} satisfies AuthoredProblem;
