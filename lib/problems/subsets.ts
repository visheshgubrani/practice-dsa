import type { AuthoredProblem } from "./authoring";

export const subsets = {
  slug: "subsets",
  number: 78,
  title: "Subsets",
  difficulty: "medium",
  tags: ["array", "backtracking", "bit-manipulation", "neetcode-150"],
  statement: [
    "Return every subset of the distinct integers in `nums`.",
    "",
    "The subsets may be returned in any order; a subset is identified by the values it contains.",
  ].join("\\n"),
  examples: [
    { args: [[1]], output: "[[],[1]]", explanation: "The empty subset and the one-element subset are both included." },
    { args: [[1, 2, 3]], output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]", explanation: "Each number is independently included or skipped." },
  ],
  constraints: ["`1 <= nums.length <= 10`", "`-10 <= nums[i] <= 10`", "All values in `nums` are distinct."],
  testcases: [
    { args: [[1]], expected: "[[],[1]]", note: "The smallest legal input has two subsets." },
    { args: [[1, 2, 3]], expected: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]", note: "All eight subsets of three values." },
    { args: [[0]], expected: "[[],[0]]", hidden: true, note: "Zero is still a normal selectable value." },
    { args: [[1, 2]], expected: "[[],[1],[2],[1,2]]", hidden: true, note: "Two values produce four subsets." },
    { args: [[-1, 0, 1]], expected: "[[],[-1],[0],[-1,0],[1],[-1,1],[0,1],[-1,0,1]]", hidden: true, note: "Negative, zero, and positive values remain distinct choices." },
    { args: [[2, 4, 6]], expected: "[[],[2],[4],[2,4],[6],[2,6],[4,6],[2,4,6]]", hidden: true, note: "An ascending input keeps each subset's member order." },
    { args: [[3, 1, 2]], expected: "[[],[3],[1],[3,1],[2],[3,2],[1,2],[3,1,2]]", hidden: true, note: "The input need not be sorted." },
    { args: [[-3, -2]], expected: "[[],[-3],[-2],[-3,-2]]", hidden: true, note: "Both values are negative." },
    { args: [[4, 0, -4]], expected: "[[],[4],[0],[4,0],[-4],[4,-4],[0,-4],[4,0,-4]]", hidden: true, note: "Mixed signs do not change the include-or-skip rule." },
    { args: [[1, 3, 5, 7]], expected: "[[],[1],[3],[1,3],[5],[1,5],[3,5],[1,3,5],[7],[1,7],[3,7],[1,3,7],[5,7],[1,5,7],[3,5,7],[1,3,5,7]]", hidden: true, note: "Four distinct values yield sixteen subsets." },
  ],
  starterCode: { python: `class Solution:\n    def subsets(self, nums: List[int]) -> List[List[int]]:\n        ` },
  notes: { approach: "At each index, branch once with the value included and once with it omitted. Record a copy when the branch reaches the end.", timeComplexity: "O(n · 2ⁿ)", spaceComplexity: "O(n) recursion depth, excluding the returned subsets" },
  signature: { name: "subsets", params: [{ name: "nums", kind: "int[]" }], returns: "int[][]" },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/subsets/",
  reference: `class Solution:\n    def subsets(self, nums: List[int]) -> List[List[int]]:\n        res = []\n        subset = []\n\n        def dfs(i):\n            if i >= len(nums):\n                res.append(subset.copy())\n                return\n            subset.append(nums[i])\n            dfs(i + 1)\n            subset.pop()\n            dfs(i + 1)\n\n        dfs(0)\n        return res\n`,
  rejection: `class Solution:\n    def subsets(self, nums):\n        # Only follows the include branch, so it loses every subset that skips a value.\n        res = []\n        current = []\n        def dfs(i):\n            if i == len(nums):\n                res.append(current.copy())\n                return\n            current.append(nums[i])\n            dfs(i + 1)\n        dfs(0)\n        return res\n`,
} satisfies AuthoredProblem;
