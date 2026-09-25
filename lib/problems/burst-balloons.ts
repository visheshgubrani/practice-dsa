import type { AuthoredProblem } from "./authoring";

export const burstBalloons = {
  slug: "burst-balloons",
  number: 312,
  title: "Burst Balloons",
  difficulty: "hard",
  tags: ["array","dynamic-programming","neetcode-150"],
  statement: "Each time a balloon i is burst, gain nums[left] × nums[i] × nums[right] coins, where left and right are its current neighbors; a missing neighbor has value 1. Return the maximum coins from bursting every balloon.",
  examples: [
    { args: [[3,1,5,8]], output: "167", explanation: "Bursting the 1, then 5, then 3, then 8 earns 167 coins." },
    { args: [[1,5]], output: "10", explanation: "Burst 1 first for 5 coins, then burst 5 for 5 more." },
  ],
  constraints: [
    "1 <= nums.length <= 300.",
    "0 <= nums[i] <= 100.",
  ],
  testcases: [
    { args: [[3,1,5,8]], expected: "167", hidden: false, note: "Bursting the 1, then 5, then 3, then 8 earns 167 coins." },
    { args: [[1,5]], expected: "10", hidden: false, note: "Burst 1 first for 5 coins, then burst 5 for 5 more." },
    { args: [[0]], expected: "0", hidden: true, note: "Bursting the only zero-value balloon earns zero." },
    { args: [[1]], expected: "1", hidden: true, note: "The boundary values are both one." },
    { args: [[100]], expected: "100", hidden: true, note: "A single balloon earns its own value." },
    { args: [[1,1]], expected: "2", hidden: true, note: "Each balloon earns one coin when burst." },
    { args: [[2,3]], expected: "9", hidden: true, note: "Burst 2 first for six, then 3 for three." },
    { args: [[3,5]], expected: "20", hidden: true, note: "Burst 3 first for fifteen, then 5 for five." },
    { args: [[0,9]], expected: "9", hidden: true, note: "Burst zero first, then the 9 balloon remains between boundary values." },
    { args: [[5,0]], expected: "5", hidden: true, note: "Burst zero last so it is multiplied by the boundary values." },
    { args: [[4,1]], expected: "8", hidden: true, note: "Burst 1 first for four, then 4 for four." },
  ],
  starterCode: { python: `class Solution:
    def maxCoins(self, nums: list[int]) -> int:
        
` },
  notes: {
    approach: "Choose the last balloon burst inside an interval. At that point its neighboring balloons are the interval boundaries, while the balloons on either side have already been optimally removed.",
    timeComplexity: "O(n³)",
    spaceComplexity: "O(n²)",
  },
  signature: {
    name: "maxCoins",
    params: [
      { name: "nums", kind: "int[]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/burst-balloons/",
  reference: `class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        cache = {}
        nums = [1] + nums + [1]

        for offset in range(2, len(nums)):
            for left in range(len(nums) - offset):
                right = left + offset
                for pivot in range(left + 1, right):
                    coins = nums[left] * nums[pivot] * nums[right]
                    coins += cache.get((left, pivot), 0) + cache.get((pivot, right), 0)
                    cache[(left, right)] = max(coins, cache.get((left, right), 0))
        return cache.get((0, len(nums) - 1), 0)
`,
  rejection: `class Solution:
    def maxCoins(self, nums):
        # Greedily bursts the largest-valued balloon at each step.
        balloons = [1] + list(nums) + [1]
        total = 0
        while len(balloons) > 2:
            i = max(range(1, len(balloons) - 1), key=lambda j: balloons[j])
            total += balloons[i - 1] * balloons[i] * balloons[i + 1]
            balloons.pop(i)
        return total
`,
} satisfies AuthoredProblem;
