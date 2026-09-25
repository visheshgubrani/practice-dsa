import type { AuthoredProblem } from "./authoring";

export const combinationSumIi = {
  slug: "combination-sum-ii",
  number: 40,
  title: "Combination Sum II",
  difficulty: "medium",
  tags: ["array", "backtracking", "neetcode-150"],
  statement: [
    "Return every distinct combination of values from `candidates` that sums to `target`.",
    "",
    "Each candidate position may be used at most once. The input can contain duplicates, but duplicate combinations are not allowed; the result may be in any order.",
  ].join("\\n"),
  examples: [
    { args: [[10, 1, 2, 7, 6, 1, 5], 8], output: "[[1,1,6],[1,2,5],[1,7],[2,6]]", explanation: "Each combination uses positions once, while the two 1s may both be used together." },
    { args: [[2, 5, 2, 1, 2], 5], output: "[[1,2,2],[5]]", explanation: "Repeated 2s still produce one combination for taking two of them." },
  ],
  constraints: ["`1 <= candidates.length <= 100`", "`1 <= candidates[i] <= 50`", "`1 <= target <= 30`"],
  testcases: [
    { args: [[10, 1, 2, 7, 6, 1, 5], 8], expected: "[[1,1,6],[1,2,5],[1,7],[2,6]]", note: "The standard case exercises duplicate 1s and several combinations." },
    { args: [[2, 5, 2, 1, 2], 5], expected: "[[1,2,2],[5]]", note: "The three 2s cannot create duplicate result rows." },
    { args: [[1], 1], expected: "[[1]]", hidden: true, note: "The sole candidate exactly reaches the target." },
    { args: [[1], 2], expected: "[]", hidden: true, note: "A candidate cannot be reused in this problem." },
    { args: [[1, 1, 1], 2], expected: "[[1,1]]", hidden: true, note: "Three equal positions still yield one pair." },
    { args: [[2, 3, 5], 5], expected: "[[2,3],[5]]", hidden: true, note: "A pair and a single candidate both reach five." },
    { args: [[1, 2, 3, 4], 6], expected: "[[1,2,3],[2,4]]", hidden: true, note: "Two distinct combinations reach six." },
    { args: [[2, 2, 2], 4], expected: "[[2,2]]", hidden: true, note: "Only two of the three identical positions are needed." },
    { args: [[1, 1, 2, 2], 3], expected: "[[1,2]]", hidden: true, note: "Duplicate choices must not duplicate the same value combination." },
    { args: [[3, 4, 5], 2], expected: "[]", hidden: true, note: "Every candidate is greater than the target." },
  ],
  starterCode: { python: `class Solution:\n    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:\n        ` },
  notes: { approach: "Sort candidates, recurse only over later positions, and skip equal values at the same recursion depth. This uses each position once while retaining the option to use equal values from later positions in one combination.", timeComplexity: "O(2ⁿ) worst case, plus sorting", spaceComplexity: "O(n) recursion depth, excluding the returned combinations" },
  signature: { name: "combinationSum2", params: [{ name: "candidates", kind: "int[]" }, { name: "target", kind: "int" }], returns: "int[][]" },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/combination-sum-ii/",
  reference: `class Solution:\n    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:\n        candidates.sort()\n        res = []\n\n        def backtrack(cur, pos, target):\n            if target == 0:\n                res.append(cur.copy())\n                return\n            if target <= 0:\n                return\n\n            prev = -1\n            for i in range(pos, len(candidates)):\n                if candidates[i] == prev:\n                    continue\n                cur.append(candidates[i])\n                backtrack(cur, i + 1, target - candidates[i])\n                cur.pop()\n                prev = candidates[i]\n\n        backtrack([], 0, target)\n        return res\n`,
  rejection: `class Solution:\n    def combinationSum2(self, candidates, target):\n        # Uses each position once but never skips equal values at a depth.\n        candidates.sort()\n        res = []\n        def dfs(start, current, remaining):\n            if remaining == 0:\n                res.append(current.copy())\n                return\n            for i in range(start, len(candidates)):\n                if candidates[i] > remaining:\n                    break\n                current.append(candidates[i])\n                dfs(i + 1, current, remaining - candidates[i])\n                current.pop()\n        dfs(0, [], target)\n        return res\n`,
} satisfies AuthoredProblem;
