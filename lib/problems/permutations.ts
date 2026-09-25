import type { AuthoredProblem } from "./authoring";

export const permutations = {
  slug: "permutations",
  number: 46,
  title: "Permutations",
  difficulty: "medium",
  tags: ["array", "backtracking", "neetcode-150"],
  statement: [
    "Given an array of distinct integers, return every possible ordering of its values.",
    "",
    "The permutations may be returned in any order, but the order inside each permutation matters.",
  ].join("\\n"),
  examples: [
    { args: [[1, 2, 3]], output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", explanation: "Three distinct values have six possible orderings." },
    { args: [[0, 1]], output: "[[0,1],[1,0]]", explanation: "Swapping the two values gives the only two orderings." },
  ],
  constraints: ["`1 <= nums.length <= 6`", "`-10 <= nums[i] <= 10`", "All values in `nums` are distinct."],
  testcases: [
    { args: [[1, 2, 3]], expected: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", note: "All six permutations of three values." },
    { args: [[0, 1]], expected: "[[0,1],[1,0]]", note: "Both orders of the two values." },
    { args: [[1]], expected: "[[1]]", hidden: true, note: "A one-element array has one permutation." },
    { args: [[1, 2]], expected: "[[1,2],[2,1]]", hidden: true, note: "The two-element base case." },
    { args: [[-1, 0]], expected: "[[-1,0],[0,-1]]", hidden: true, note: "Negative and zero are still distinct values." },
    { args: [[2, 3]], expected: "[[2,3],[3,2]]", hidden: true, note: "A second two-element ordering." },
    { args: [[-1, 0, 1]], expected: "[[-1,0,1],[-1,1,0],[0,-1,1],[0,1,-1],[1,-1,0],[1,0,-1]]", hidden: true, note: "Three mixed-sign values have six orderings." },
    { args: [[0, 1, 2]], expected: "[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]", hidden: true, note: "Zero can appear in any of the three positions." },
    { args: [[2, 4, 6]], expected: "[[2,4,6],[2,6,4],[4,2,6],[4,6,2],[6,2,4],[6,4,2]]", hidden: true, note: "A non-consecutive ascending input." },
    { args: [[1, 3, 5]], expected: "[[1,3,5],[1,5,3],[3,1,5],[3,5,1],[5,1,3],[5,3,1]]", hidden: true, note: "The algorithm must not depend on consecutive values." },
  ],
  starterCode: { python: `class Solution:\n    def permute(self, nums: List[int]) -> List[List[int]]:\n        ` },
  notes: { approach: "Choose one unused value for the next position, recurse, and then undo the choice. Every depth fixes one position, so each leaf is one complete ordering.", timeComplexity: "O(n · n!)", spaceComplexity: "O(n) recursion and used-state space, excluding the returned permutations" },
  signature: { name: "permute", params: [{ name: "nums", kind: "int[]" }], returns: "int[][]" },
  compare: "unordered_outer",
  sourceUrl: "https://leetcode.com/problems/permutations/",
  reference: `class Solution:\n    def permute(self, nums: List[int]) -> List[List[int]]:\n        res = []\n        if len(nums) == 1:\n            return [nums[:]]\n\n        for i in range(len(nums)):\n            n = nums.pop(0)\n            perms = self.permute(nums)\n            for perm in perms:\n                perm.append(n)\n            res.extend(perms)\n            nums.append(n)\n        return res\n`,
  rejection: `class Solution:\n    def permute(self, nums):\n        # Returns the input as if there were no choices for each position.\n        return [nums[:]]\n`,
} satisfies AuthoredProblem;
