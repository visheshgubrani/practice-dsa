/**
 * Deliberately broken implementations and extra accepted variants for
 * `pnpm piston:check`.
 *
 * Reference solutions live on the problem modules (`AuthoredProblem.reference`)
 * and are not duplicated here. Broken programs stay: they are the regression
 * that a generated harness still maps syntax errors, timeouts, and wrong
 * answers the way the console will.
 */

import { groupAnagrams } from "@/lib/problems/group-anagrams";
import { trappingRainWater } from "@/lib/problems/trapping-rain-water";
import { twoSum } from "@/lib/problems/two-sum";
import { validParentheses } from "@/lib/problems/valid-parentheses";

export type BrokenCase = {
  /** What this run is meant to prove. */
  label: string;
  /** The verdict that proves it. */
  expect: "wrong_answer" | "runtime_error" | "compile_error" | "time_limit_exceeded";
  /** A solution that must fail this way. */
  source: string;
};

export type AcceptedVariant = {
  label: string;
  source: string;
};

export type ProblemFixtures = {
  slug: string;
  /** Runs against the full suite (visible then hidden) and must be accepted. */
  accepted: string;
  /** Extra accepted programs (debug prints, equivalent shapes). */
  acceptedVariants?: readonly AcceptedVariant[];
  broken?: readonly BrokenCase[];
};

const BROKEN: Record<string, readonly BrokenCase[]> = {
  "two-sum": [
    {
      label: "uses the same element twice",
      expect: "wrong_answer",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i, value in enumerate(nums):
            if target - value == value:
                return [i, i]
        return [0, 1]
`,
    },
    {
      label: "throws before returning",
      expect: "runtime_error",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        raise ValueError("deliberate failure")`,
    },
    {
      label: "spins forever",
      expect: "time_limit_exceeded",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        while True:
            pass`,
    },
    {
      label: "has a syntax error, which is the whole program's fault",
      expect: "compile_error",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return [0, 1`,
    },
    {
      // The sandbox ships numpy, pandas and scipy, so the missing import has
      // to be something it genuinely does not have.
      label: "imports a module the sandbox does not have",
      expect: "runtime_error",
      source: `import networkx  # deliberately not installed in the sandbox

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return [0, 1]`,
    },
    {
      label: "prints more than the output limit",
      expect: "runtime_error",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        print("x" * 70_000)
        return [0, 1]`,
    },
  ],
  "valid-parentheses": [
    {
      label: "counts openers and closers, ignoring order",
      expect: "wrong_answer",
      source: `class Solution:
    def isValid(self, s: str) -> bool:
        return (
            s.count("(") == s.count(")")
            and s.count("[") == s.count("]")
            and s.count("{") == s.count("}")
        )
`,
    },
  ],
  "group-anagrams": [
    {
      label: "groups by length instead of letter counts",
      expect: "wrong_answer",
      source: `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for word in strs:
            groups[len(word)].append(word)
        return list(groups.values())
`,
    },
  ],
  "trapping-rain-water": [
    {
      label: "returns the sum instead of the trapped water",
      expect: "wrong_answer",
      source: `class Solution:
    def trap(self, height: List[int]) -> int:
        return sum(height)`,
    },
  ],
};

const VARIANTS: Record<string, readonly AcceptedVariant[]> = {
  "two-sum": [
    {
      label: "prints debug text and still accepts",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        print("debugging")
        seen = {}
        for i, value in enumerate(nums):
            if target - value in seen:
                return [seen[target - value], i]
            seen[value] = i
        return []`,
    },
    {
      label: "returns the pair in reverse order",
      source: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, value in enumerate(nums):
            if target - value in seen:
                return [i, seen[target - value]]
            seen[value] = i
        return []`,
    },
  ],
};

const PROBLEMS = [twoSum, validParentheses, groupAnagrams, trappingRainWater];

export const FIXTURES: readonly ProblemFixtures[] = PROBLEMS.map((problem) => ({
  slug: problem.slug,
  accepted: problem.reference,
  acceptedVariants: VARIANTS[problem.slug],
  broken: BROKEN[problem.slug],
}));
