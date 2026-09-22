import type { AuthoredProblem } from "./authoring";

export const kClosestPointsToOrigin = {
  slug: "k-closest-points-to-origin",
  number: 973,
  title: "K Closest Points to Origin",
  difficulty: "medium",
  tags: [
    "array",
    "math",
    "divide-and-conquer",
    "geometry",
    "sorting",
    "heap-priority-queue",
    "quickselect",
    "k-d-tree",
    "neetcode-150",
  ],
  statement: [
    "Return the `k` points closest to the origin. Distance is squared Euclidean distance, `x² + y²`, so the square root is unnecessary.",
    "",
    "The points may be listed in any order. Each point stays `[x, y]`, with the coordinates in that order.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [1, 3],
          [-2, 2],
        ],
        1,
      ],
      output: "[[-2,2]]",
      explanation: "[-2,2] is distance 8 from the origin. [1,3] is distance 10.",
    },
    {
      args: [
        [
          [3, 3],
          [5, -1],
          [-2, 4],
        ],
        2,
      ],
      output: "[[3,3],[-2,4]]",
      explanation:
        "The squared distances are 18, 26, and 20. The two smallest are [3,3] and [-2,4], in either order.",
    },
    {
      args: [
        [
          [0, 1],
          [1, 0],
        ],
        2,
      ],
      output: "[[0,1],[1,0]]",
      explanation: "k is the whole list, so both points are returned.",
    },
  ],
  constraints: ["`1 <= k <= points.length <= 10⁴`", "`-10⁴ <= xᵢ, yᵢ <= 10⁴`"],
  testcases: [
    {
      args: [
        [
          [1, 3],
          [-2, 2],
        ],
        1,
      ],
      expected: "[[-2,2]]",
      note: "The closer of two points.",
    },
    {
      args: [
        [
          [3, 3],
          [5, -1],
          [-2, 4],
        ],
        2,
      ],
      expected: "[[3,3],[-2,4]]",
      note: "Two of three, and the order of those two is free.",
    },
    {
      args: [
        [
          [0, 1],
          [1, 0],
        ],
        2,
      ],
      expected: "[[0,1],[1,0]]",
      note: "k equals the number of points.",
    },
    {
      args: [[[1, 1]], 1],
      expected: "[[1,1]]",
      hidden: true,
      note: "a single point",
    },
    {
      args: [
        [
          [2, 2],
          [1, 1],
          [-1, -1],
        ],
        2,
      ],
      expected: "[[-1,-1],[1,1]]",
      hidden: true,
      note: "the two points at distance 2; [2,2] is farther",
    },
    {
      args: [
        [
          [0, 0],
          [1, 1],
        ],
        1,
      ],
      expected: "[[0,0]]",
      hidden: true,
      note: "the origin itself",
    },
    {
      args: [
        [
          [10, 0],
          [0, 10],
          [-1, 0],
        ],
        1,
      ],
      expected: "[[-1,0]]",
      hidden: true,
      note: "a nearby point beats two that sit on the axes far out",
    },
    {
      args: [
        [
          [1, 2],
          [2, 1],
          [3, 3],
        ],
        2,
      ],
      expected: "[[1,2],[2,1]]",
      hidden: true,
      note: "two points share a distance and both belong in the answer",
    },
    {
      args: [
        [
          [-5, -1],
          [1, 1],
        ],
        1,
      ],
      expected: "[[1,1]]",
      hidden: true,
      note: "negative coordinates; distance uses the squares",
    },
    {
      args: [
        [
          [4, 4],
          [1, 2],
          [0, 1],
        ],
        2,
      ],
      expected: "[[0,1],[1,2]]",
      hidden: true,
      note: "the farthest point is left out",
    },
    {
      args: [
        [
          [1, 0],
          [-1, 0],
          [0, 2],
        ],
        2,
      ],
      expected: "[[1,0],[-1,0]]",
      hidden: true,
      note: "two points at the same distance, both closer than the third",
    },
  ],
  starterCode: {
    python: `class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        `,
  },
  notes: {
    approach:
      "Push every point onto a min-heap keyed by `x² + y²`, then pop `k` times. The popped points are a closest set. Their order in the returned list does not matter; each point must stay `[x, y]`. Squared distance keeps the comparison exact, with no square root.",
    timeComplexity: "O(n + k log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "kClosest",
    params: [
      { name: "points", kind: "int[][]" },
      { name: "k", kind: "int" },
    ],
    returns: "int[][]",
  },
  // Outer order is free. Swapping a point's coordinates is a different point.
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/k-closest-points-to-origin/",
  reference: `class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        minHeap = []
        for x, y in points:
            dist = (x ** 2) + (y ** 2)
            minHeap.append((dist, x, y))
        
        heapq.heapify(minHeap)
        res = []
        for _ in range(k):
            _, x, y = heapq.heappop(minHeap)
            res.append((x, y))
        return res
`,
  rejection: `class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        # The first k points in input order, with no look at the distance.
        return points[:k]
`,
} satisfies AuthoredProblem;
