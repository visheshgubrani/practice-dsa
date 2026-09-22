import type { AuthoredProblem } from "./authoring";

export const mergeTripletsToFormTargetTriplet = {
  slug: "merge-triplets-to-form-target-triplet",
  number: 1899,
  title: "Merge Triplets to Form Target Triplet",
  difficulty: "medium",
  tags: ["array", "greedy", "neetcode-150"],
  statement: [
    "A merge of two triplets replaces them with their position-wise maximum: index 0 with the larger of the two index-0 values, and the same for indexes 1 and 2. Values only ever stay or grow.",
    "",
    "Return whether some sequence of merges, starting from the given triplets, can produce `target` exactly.",
  ].join("\n"),
  examples: [
    {
      args: [
        [
          [2, 5, 3],
          [1, 8, 4],
          [1, 7, 5],
        ],
        [2, 7, 5],
      ],
      output: "true",
      explanation:
        "[1,8,4] is too tall in the middle to be used. Merging [2,5,3] with [1,7,5] gives [2,7,5].",
    },
    {
      args: [
        [
          [3, 4, 5],
          [4, 5, 6],
        ],
        [3, 2, 5],
      ],
      output: "false",
      explanation: "Both triplets already exceed the target in some position, and a merge cannot shrink them.",
    },
    {
      args: [
        [
          [2, 5, 3],
          [2, 3, 4],
          [1, 2, 5],
          [5, 2, 3],
        ],
        [5, 5, 5],
      ],
      output: "true",
      explanation:
        "The first triplet supplies the middle 5, the third supplies the last 5, and the fourth supplies the first 5. None of those three exceeds the target.",
    },
  ],
  constraints: [
    "`1 <= triplets.length <= 10⁵`",
    "`triplets[i].length == target.length == 3`",
    "`1 <= triplets[i][j], target[j] <= 1000`",
  ],
  testcases: [
    {
      args: [
        [
          [2, 5, 3],
          [1, 8, 4],
          [1, 7, 5],
        ],
        [2, 7, 5],
      ],
      expected: "true",
      note: "The triplet that exceeds the target is discarded; the other two merge to it.",
    },
    {
      args: [
        [
          [3, 4, 5],
          [4, 5, 6],
        ],
        [3, 2, 5],
      ],
      expected: "false",
      note: "Every triplet exceeds the target somewhere.",
    },
    {
      args: [
        [
          [2, 5, 3],
          [2, 3, 4],
          [1, 2, 5],
          [5, 2, 3],
        ],
        [5, 5, 5],
      ],
      expected: "true",
      note: "Each coordinate of the target comes from a different triplet.",
    },
    {
      args: [[[1, 2, 3]], [1, 2, 3]],
      expected: "true",
      hidden: true,
      note: "one triplet is already the target",
    },
    {
      args: [[[1, 2, 3]], [1, 2, 4]],
      expected: "false",
      hidden: true,
      note: "the only triplet is short in the last position and nothing can grow it",
    },
    {
      args: [
        [
          [2, 7, 6],
          [2, 7, 5],
        ],
        [2, 7, 5],
      ],
      expected: "true",
      hidden: true,
      note: "an exceeding copy sits next to an exact match",
    },
    {
      args: [
        [
          [2, 1, 1],
          [1, 7, 1],
          [1, 1, 5],
        ],
        [2, 7, 5],
      ],
      expected: "true",
      hidden: true,
      note: "each triplet contributes exactly one coordinate",
    },
    {
      args: [
        [
          [2, 1, 1],
          [1, 7, 1],
        ],
        [2, 7, 5],
      ],
      expected: "false",
      hidden: true,
      note: "no triplet supplies the target's last coordinate",
    },
    {
      args: [[[5, 5, 5]], [4, 5, 5]],
      expected: "false",
      hidden: true,
      note: "the only triplet exceeds the target in the first position",
    },
    {
      args: [
        [
          [1, 1, 1],
          [2, 2, 2],
        ],
        [2, 2, 2],
      ],
      expected: "true",
      hidden: true,
      note: "merging a smaller triplet into an exact match stays on the target",
    },
    {
      args: [
        [
          [1, 1, 2],
          [1, 2, 1],
          [2, 1, 1],
        ],
        [2, 2, 2],
      ],
      expected: "true",
      hidden: true,
      note: "the position-wise maximum of three safe triplets is the target",
    },
  ],
  starterCode: {
    python: `class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        `,
  },
  notes: {
    approach:
      "A merge takes the maximum in each position, so it can never repair a triplet that already exceeds the target. Discard those. Among the rest, the target is reachable exactly when each of its three values shows up in that same position at least once: merging those triplets produces the target and nothing larger.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "mergeTriplets",
    params: [
      { name: "triplets", kind: "int[][]" },
      { name: "target", kind: "int[]" },
    ],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/merge-triplets-to-form-target-triplet/",
  reference: `class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        good = set()

        for t in triplets:
            if t[0] > target[0] or t[1] > target[1] or t[2] > target[2]:
                continue
            for i, v in enumerate(t):
                if v == target[i]:
                    good.add(i)
        return len(good) == 3
`,
  rejection: `class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        # Takes the maximum of every triplet, including ones that already
        # overshoot the target and can never be part of a valid merge.
        merged = [0, 0, 0]
        for triplet in triplets:
            for i in range(3):
                merged[i] = max(merged[i], triplet[i])
        return merged == list(target)
`,
} satisfies AuthoredProblem;
