import type { AuthoredProblem } from "./authoring";

export const jumpGame = {
  slug: "jump-game",
  number: 55,
  title: "Jump Game",
  difficulty: "medium",
  tags: ["array", "dynamic-programming", "greedy", "neetcode-150"],
  statement: [
    "You start at index `0` of `nums`. From index `i` you may jump forward to any index in `i + 1 .. i + nums[i]`, staying inside the array.",
    "",
    "Return whether some sequence of jumps reaches the last index.",
  ].join("\n"),
  examples: [
    {
      args: [[2, 3, 1, 1, 4]],
      output: "true",
      explanation: "Jump 1 step to index 1, then 3 steps to the last index.",
    },
    {
      args: [[3, 2, 1, 0, 4]],
      output: "false",
      explanation: "Every path lands on the 0, and from there you cannot move.",
    },
    {
      args: [[0]],
      output: "true",
      explanation: "The array is a single index, so you are already finished.",
    },
  ],
  constraints: ["`1 <= nums.length <= 10⁴`", "`0 <= nums[i] <= 10⁵`"],
  testcases: [
    {
      args: [[2, 3, 1, 1, 4]],
      expected: "true",
      note: "A jump of 1 then a jump of 3 reaches the end.",
    },
    {
      args: [[3, 2, 1, 0, 4]],
      expected: "false",
      note: "The 0 blocks every path to the last index.",
    },
    {
      args: [[0]],
      expected: "true",
      note: "Already standing on the only index.",
    },
    {
      args: [[1, 0]],
      expected: "true",
      hidden: true,
      note: "one step lands on the last index, which is a zero",
    },
    {
      args: [[0, 1]],
      expected: "false",
      hidden: true,
      note: "stuck on the first index",
    },
    {
      args: [[2, 0, 0]],
      expected: "true",
      hidden: true,
      note: "the first jump skips the zero in the middle",
    },
    {
      args: [[1, 1, 0, 1]],
      expected: "false",
      hidden: true,
      note: "the only path stops on a zero one index early",
    },
    {
      args: [[2, 0, 1, 0]],
      expected: "true",
      hidden: true,
      note: "a jump of 2 reaches an index that can finish the trip",
    },
    {
      args: [[1, 2, 3]],
      expected: "true",
      hidden: true,
      note: "each index can reach further than the last",
    },
    {
      args: [[5, 0, 0, 0, 0, 0]],
      expected: "true",
      hidden: true,
      note: "one jump from the start covers the whole array",
    },
    {
      args: [[1, 0, 1]],
      expected: "false",
      hidden: true,
      note: "the middle zero is the only landing spot and it cannot continue",
    },
  ],
  starterCode: {
    python: `class Solution:
    def canJump(self, nums: List[int]) -> bool:
        `,
  },
  notes: {
    approach:
      "Walk backward from the last index, keeping the leftmost index that can still reach the current goal. When `i + nums[i]` reaches that goal, move the goal to `i`. The last index is reachable exactly when the goal walks all the way back to 0.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "canJump",
    params: [{ name: "nums", kind: "int[]" }],
    returns: "bool",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/jump-game/",
  reference: `class Solution:
    def canJump(self, nums: List[int]) -> bool:
        goal = len(nums) - 1

        for i in range(len(nums) - 2, -1, -1):
            if i + nums[i] >= goal:
                goal = i
        return goal == 0
`,
  rejection: `class Solution:
    def canJump(self, nums: List[int]) -> bool:
        # Only the opening jump is considered, so a path of several jumps looks impossible.
        return nums[0] >= len(nums) - 1
`,
} satisfies AuthoredProblem;
