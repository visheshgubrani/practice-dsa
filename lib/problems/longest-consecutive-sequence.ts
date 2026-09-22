import type { AuthoredProblem } from "./authoring";

export const longestConsecutiveSequence = {
  slug: "longest-consecutive-sequence",
  number: 128,
  title: "Longest Consecutive Sequence",
  difficulty: "medium",
  tags: ["array", "hash-table", "union-find", "neetcode-150"],
  statement: [
    "Given an unsorted array of integers `nums`, return *the length of the longest consecutive elements sequence*.",
    "",
    "You must write an algorithm that runs in `O(n)` time.",
  ].join("\n"),
  examples: [
    {
      args: [[100, 4, 200, 1, 3, 2]],
      output: "4",
      explanation:
        "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.",
    },
    {
      args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]],
      output: "9",
      explanation: "The values 0 through 8 form one run of length 9.",
    },
    {
      args: [[1, 0, 1, 2]],
      output: "3",
      explanation: "Duplicates do not extend the run; 0, 1, 2 is length 3.",
    },
  ],
  constraints: [
    "`0 <= nums.length <= 10⁵`",
    "`-10⁹ <= nums[i] <= 10⁹`",
  ],
  testcases: [
    {
      args: [[100, 4, 200, 1, 3, 2]],
      expected: "4",
      note: "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.",
    },
    {
      args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]],
      expected: "9",
      note: "The values 0 through 8 form one run of length 9.",
    },
    {
      args: [[1, 0, 1, 2]],
      expected: "3",
      note: "Duplicates do not extend the run; 0, 1, 2 is length 3.",
    },
    { args: [[]], expected: "0", hidden: true, note: "empty input is allowed" },
    { args: [[1]], expected: "1", hidden: true, note: "single element" },
    {
      args: [[-2, -3, -1]],
      expected: "3",
      hidden: true,
      note: "consecutive negatives",
    },
    {
      args: [[1, 3, 5, 7]],
      expected: "1",
      hidden: true,
      note: "no two values are consecutive",
    },
    { args: [[0, 0, 0]], expected: "1", hidden: true, note: "all duplicates" },
    {
      args: [[-1, 0]],
      expected: "2",
      hidden: true,
      note: "crosses zero",
    },
    {
      args: [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]],
      expected: "7",
      hidden: true,
      note: "a long run after a short one around zero",
    },
    {
      args: [[-1_000_000_000, 1_000_000_000]],
      expected: "1",
      hidden: true,
      note: "constraint endpoints, far apart",
    },
  ],
  starterCode: {
    python: `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Put the values in a set so lookups are O(1). A run should be counted only from its start — skip any value whose predecessor is also present — then walk value+1, value+2, … until the set misses. Each number is then visited a constant number of times, which is what keeps the whole scan O(n). Duplicates collapse in the set; the empty array is length 0.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "longestConsecutive",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/longest-consecutive-sequence/",
  reference: `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        values = set(nums)
        best = 0
        for value in values:
            if value - 1 in values:
                continue
            length = 1
            while value + length in values:
                length += 1
            best = max(best, length)
        return best
`,
} satisfies AuthoredProblem;
