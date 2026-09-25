import type { AuthoredProblem } from "./authoring";

export const combinationSum = {
  slug: "combination-sum",
  number: 39,
  title: "Combination Sum",
  difficulty: "medium",
  tags: ["array", "backtracking", "neetcode-150"],
  statement: [
    "Given distinct positive integers `candidates` and a positive `target`, return every combination whose values sum to `target`.",
    "",
    "A candidate may be used any number of times. The combinations may be returned in any order.",
  ].join("\\n"),
  examples: [
    { args: [[2, 3, 6, 7], 7], output: "[[2,2,3],[7]]", explanation: "Seven is reached either by one 7 or by two 2s and a 3." },
    { args: [[2, 3, 5], 8], output: "[[2,2,2,2],[2,3,3],[3,5]]", explanation: "The three combinations reuse candidates only when the sum stays within eight." },
  ],
  constraints: ["`1 <= candidates.length <= 30`", "`2 <= candidates[i] <= 40` and all candidates are distinct.", "`1 <= target <= 40`", "All returned combinations are unique."],
  testcases: [
    { args: [[2, 3, 6, 7], 7], expected: "[[2,2,3],[7]]", note: "The two standard combinations for target seven." },
    { args: [[2, 3, 5], 8], expected: "[[2,2,2,2],[2,3,3],[3,5]]", note: "Reuse of 2 and 3 is allowed." },
    { args: [[2], 1], expected: "[]", hidden: true, note: "No candidate can reach a smaller target." },
    { args: [[2], 4], expected: "[[2,2]]", hidden: true, note: "The only candidate is used twice." },
    { args: [[3, 5, 7], 10], expected: "[[3,7],[5,5]]", hidden: true, note: "One combination mixes values and one repeats 5." },
    { args: [[2, 4, 6], 8], expected: "[[2,2,2,2],[2,2,4],[2,6],[4,4]]", hidden: true, note: "Several repeated and mixed combinations share the target." },
    { args: [[2, 3], 7], expected: "[[2,2,3]]", hidden: true, note: "The target requires both candidates and repeats 2." },
    { args: [[5, 6, 7], 4], expected: "[]", hidden: true, note: "Every candidate is larger than the target." },
    { args: [[1, 2], 5], expected: "[[1,1,1,1,1],[1,1,1,2],[1,2,2]]", hidden: true, note: "A candidate of one exposes all repetition counts." },
    { args: [[2, 4, 5], 10], expected: "[[2,2,2,2,2],[2,2,2,4],[2,4,4],[5,5]]", hidden: true, note: "The target has four distinct combination shapes." },
  ],
  starterCode: { python: `class Solution:\n    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n        ` },
  notes: { approach: "Traverse candidates in a fixed order and branch by taking the current candidate again or advancing past it. Stop when the remaining target is zero or negative.", timeComplexity: "Exponential in the target and candidate count; O(number of explored combinations)", spaceComplexity: "O(target / min(candidates)) recursion depth, excluding the returned combinations" },
  signature: { name: "combinationSum", params: [{ name: "candidates", kind: "int[]" }, { name: "target", kind: "int" }], returns: "int[][]" },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/combination-sum/",
  reference: `class Solution:\n    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n        res = []\n\n        def dfs(i, cur, total):\n            if total == target:\n                res.append(cur.copy())\n                return\n            if i >= len(candidates) or total > target:\n                return\n\n            cur.append(candidates[i])\n            dfs(i, cur, total + candidates[i])\n            cur.pop()\n            dfs(i + 1, cur, total)\n\n        dfs(0, [], 0)\n        return res\n`,
  rejection: `class Solution:\n    def combinationSum(self, candidates, target):\n        # Advances after taking a value, incorrectly allowing each candidate once.\n        res = []\n        def dfs(i, current, total):\n            if total == target:\n                res.append(current.copy())\n                return\n            if i == len(candidates) or total > target:\n                return\n            current.append(candidates[i])\n            dfs(i + 1, current, total + candidates[i])\n            current.pop()\n            dfs(i + 1, current, total)\n        dfs(0, [], 0)\n        return res\n`,
} satisfies AuthoredProblem;
