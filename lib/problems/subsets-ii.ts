import type { AuthoredProblem } from "./authoring";

export const subsetsIi = {
  slug: "subsets-ii",
  number: 90,
  title: "Subsets II",
  difficulty: "medium",
  tags: ["array", "backtracking", "bit-manipulation", "neetcode-150"],
  statement: [
    "Return every distinct subset of `nums`, where `nums` may contain duplicate values.",
    "",
    "The subsets may be returned in any order, and duplicate subsets must appear only once.",
  ].join("\\n"),
  examples: [
    { args: [[1, 2, 2]], output: "[[],[1],[1,2],[1,2,2],[2],[2,2]]", explanation: "The two equal 2s create only one subset for each possible count of 2." },
    { args: [[0]], output: "[[],[0]]", explanation: "A single value has the empty and one-element subsets." },
  ],
  constraints: ["`1 <= nums.length <= 10`", "`-10 <= nums[i] <= 10`", "`nums` may contain duplicates."],
  testcases: [
    { args: [[1, 2, 2]], expected: "[[],[1],[1,2],[1,2,2],[2],[2,2]]", note: "Duplicate 2s do not duplicate the returned subsets." },
    { args: [[0]], expected: "[[],[0]]", note: "The smallest legal input." },
    { args: [[1, 1]], expected: "[[],[1],[1,1]]", hidden: true, note: "Two equal values have three distinct subset values." },
    { args: [[1, 2, 3]], expected: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]", hidden: true, note: "With no duplicates this matches ordinary subsets." },
    { args: [[-1, 0, 1]], expected: "[[],[-1],[0],[-1,0],[1],[-1,1],[0,1],[-1,0,1]]", hidden: true, note: "Distinct negative, zero, and positive values." },
    { args: [[2, 2, 2]], expected: "[[],[2],[2,2],[2,2,2]]", hidden: true, note: "Three equal values allow four multiplicities." },
    { args: [[1, 3, 3]], expected: "[[],[1],[3],[1,3],[3,3],[1,3,3]]", hidden: true, note: "Only the multiplicity of 3 needs deduplication." },
    { args: [[0, 0, 1]], expected: "[[],[0],[0,0],[1],[0,1],[0,0,1]]", hidden: true, note: "Zero duplicates combine with one distinct value." },
    { args: [[-2, -1, -1]], expected: "[[],[-2],[-1],[-2,-1],[-1,-1],[-2,-1,-1]]", hidden: true, note: "Duplicate negative values are handled the same way." },
    { args: [[2, 2, 3]], expected: "[[],[2],[2,2],[3],[2,3],[2,2,3]]", hidden: true, note: "A duplicated pair plus one different value." },
  ],
  starterCode: { python: `class Solution:\n    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:\n        ` },
  notes: { approach: "Sort the values so equal entries are adjacent. At each recursion level, after exploring the branch that includes the current value, skip the remaining equal values before exploring the exclusion branch.", timeComplexity: "O(n · 2ⁿ) in the worst case", spaceComplexity: "O(n) recursion depth, excluding the returned subsets" },
  signature: { name: "subsetsWithDup", params: [{ name: "nums", kind: "int[]" }], returns: "int[][]" },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/subsets-ii/",
  reference: `class Solution:\n    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:\n        res = []\n        nums.sort()\n\n        def backtrack(i, subset):\n            if i == len(nums):\n                res.append(subset[::])\n                return\n            subset.append(nums[i])\n            backtrack(i + 1, subset)\n            subset.pop()\n            while i + 1 < len(nums) and nums[i] == nums[i + 1]:\n                i += 1\n            backtrack(i + 1, subset)\n\n        backtrack(0, [])\n        return res\n`,
  rejection: `class Solution:\n    def subsetsWithDup(self, nums):\n        # Treats equal values as separate choices, producing duplicate subsets.\n        res = []\n        def dfs(i, current):\n            if i == len(nums):\n                res.append(current.copy())\n                return\n            current.append(nums[i])\n            dfs(i + 1, current)\n            current.pop()\n            dfs(i + 1, current)\n        dfs(0, [])\n        return res\n`,
} satisfies AuthoredProblem;
