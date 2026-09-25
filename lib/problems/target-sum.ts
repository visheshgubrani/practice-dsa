import type { AuthoredProblem } from "./authoring";

export const targetSum = {
  slug: "target-sum",
  number: 494,
  title: "Target Sum",
  difficulty: "medium",
  tags: ["array","dynamic-programming","backtracking","knapsack-problem","0-1-knapsack","neetcode-150"],
  statement: "For every value in nums, choose either a plus or a minus sign and add the signed values. Return the number of sign assignments whose total equals target.",
  examples: [
    { args: [[1,1,1,1,1],3], output: "5", explanation: "Choose four plus signs and one minus sign; any of the five positions can be negative." },
    { args: [[1],1], output: "1", explanation: "Using a plus sign reaches the target once." },
  ],
  constraints: [
    "1 <= nums.length <= 20.",
    "0 <= nums[i] <= 1000 and sum(nums) <= 1000.",
    "-1000 <= target <= 1000.",
  ],
  testcases: [
    { args: [[1,1,1,1,1],3], expected: "5", hidden: false, note: "Choose four plus signs and one minus sign; any of the five positions can be negative." },
    { args: [[1],1], expected: "1", hidden: false, note: "Using a plus sign reaches the target once." },
    { args: [[1],-1], expected: "1", hidden: true, note: "A single minus sign reaches -1." },
    { args: [[1],0], expected: "0", hidden: true, note: "Neither sign assignment reaches zero." },
    { args: [[0],0], expected: "2", hidden: true, note: "The plus and minus choices for zero are distinct assignments." },
    { args: [[0,0,1],1], expected: "4", hidden: true, note: "Both zeroes double the four assignments for the value 1." },
    { args: [[1,2,3],0], expected: "2", hidden: true, note: "The assignments +1 +2 -3 and -1 -2 +3 reach zero." },
    { args: [[2,2,2],2], expected: "3", hidden: true, note: "Exactly two of the three values must have a plus sign." },
    { args: [[1,2,7],4], expected: "1", hidden: true, note: "Only +7 -2 -1 reaches four." },
    { args: [[1,2,3],6], expected: "1", hidden: true, note: "All three plus signs are required." },
    { args: [[1,2,3],7], expected: "0", hidden: true, note: "The target is larger than the sum of all values." },
  ],
  starterCode: { python: `class Solution:
    def findTargetSumWays(self, nums: list[int], target: int) -> int:
        
` },
  notes: {
    approach: "Explore the two sign choices for each position and count the assignments that finish at the target. Memoizing by position and running total avoids repeating the same suffix calculation.",
    timeComplexity: "O(n × sum(nums)) states",
    spaceComplexity: "O(n × sum(nums))",
  },
  signature: {
    name: "findTargetSumWays",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "target", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/target-sum/",
  reference: `class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        dp = {}  # (index, total) -> # of ways

        def backtrack(i, total):
            if i == len(nums):
                return 1 if total == target else 0
            if (i, total) in dp:
                return dp[(i, total)]

            dp[(i, total)] = backtrack(i + 1, total + nums[i]) + backtrack(
                i + 1, total - nums[i]
            )
            return dp[(i, total)]

        return backtrack(0, 0)
`,
  rejection: `class Solution:
    def findTargetSumWays(self, nums, target):
        # Keeps reachable totals but collapses different sign assignments together.
        totals = {0}
        for value in nums:
            totals = {total + value for total in totals} | {total - value for total in totals}
        return int(target in totals)
`,
} satisfies AuthoredProblem;
