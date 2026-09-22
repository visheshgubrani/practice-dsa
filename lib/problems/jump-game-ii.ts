import type { AuthoredProblem } from "./authoring";

export const jumpGameIi = {
  slug: "jump-game-ii",
  number: 45,
  title: "Jump Game II",
  difficulty: "medium",
  tags: ["array", "dynamic-programming", "greedy", "neetcode-150"],
  statement: [
    "You start at index `0` of `nums`. From index `i` you may jump forward to any index in `i + 1 .. i + nums[i]`. A path to the last index always exists.",
    "",
    "Return the fewest jumps that reach it.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 3, 1, 1, 4]],
      output: "2",
      explanation: "Jump from 0 to 1, then from 1 to the last index.",
    },
    {
      args: [[2, 3, 0, 1, 4]],
      output: "2",
      explanation: "The 0 can be skipped: 0 to 1, then 1 to the end.",
    },
    {
      args: [[0]],
      output: "0",
      explanation: "You are already on the last index, so no jump is needed.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁴`",
    "`0 <= nums[i] <= 1000`",
    "A path to the last index always exists.",
  ],
  testcases: [
    {
      args: [[2, 3, 1, 1, 4]],
      expected: "2",
      note: "Two jumps, not one per step.",
    },
    {
      args: [[2, 3, 0, 1, 4]],
      expected: "2",
      note: "The zero is skipped by a longer jump.",
    },
    {
      args: [[0]],
      expected: "0",
      note: "A one-element array needs no jump.",
    },
    {
      args: [[1, 1, 1, 1]],
      expected: "3",
      hidden: true,
      note: "every jump covers exactly one index",
    },
    {
      args: [[3, 2, 1]],
      expected: "1",
      hidden: true,
      note: "the first index can reach the end directly",
    },
    {
      args: [[1, 3, 1, 1, 1]],
      expected: "2",
      hidden: true,
      note: "the second index's jump reaches the end",
    },
    {
      args: [[4, 1, 1, 1, 1]],
      expected: "1",
      hidden: true,
      note: "one jump of 4 finishes the array",
    },
    {
      args: [[1, 2, 1, 1, 1]],
      expected: "3",
      hidden: true,
      note: "the long jump in the middle still leaves one step",
    },
    {
      args: [[5, 4, 3, 2, 1, 0]],
      expected: "1",
      hidden: true,
      note: "the opening jump lands on the last index",
    },
    {
      args: [[2, 3, 1]],
      expected: "1",
      hidden: true,
      note: "a jump of 2 from the start is enough",
    },
    {
      args: [[1, 1, 1]],
      expected: "2",
      hidden: true,
      note: "three indexes, two single steps",
    },
  ],
  starterCode: {
    python: `class Solution:
    def jump(self, nums: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "The minimum jumps form windows. The indexes reachable in the current number of jumps are a contiguous range; the farthest index any of them can touch is the end of the next window, and crossing into that window costs one jump. Stop when a window reaches the last index.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "jump",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/jump-game-ii/",
  reference: `class Solution:
    def jump(self, nums: List[int]) -> int:
        l, r = 0, 0
        res = 0
        while r < (len(nums) - 1):
            maxJump = 0
            for i in range(l, r + 1):
                maxJump = max(maxJump, i + nums[i])
            l = r + 1
            r = maxJump
            res += 1
        return res
`,
  rejection: `class Solution:
    def jump(self, nums: List[int]) -> int:
        # Reports how far the array can reach, not how many jumps that takes.
        reach = 0
        for i in range(len(nums)):
            if i > reach:
                break
            reach = max(reach, i + nums[i])
        return reach
`,
} satisfies AuthoredProblem;
