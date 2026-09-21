/**
 * Deliberately broken implementations and extra accepted variants for
 * `pnpm piston:check`.
 *
 * Reference solutions live on the problem modules (`AuthoredProblem.reference`)
 * and are not duplicated here. Broken programs stay: they are the regression
 * that a generated harness still maps syntax errors, timeouts, and wrong
 * answers the way the console will.
 *
 * `FIXTURES` is the seeded catalog. Every problem needs at least one
 * plausible `wrong_answer` program — a near-miss the suite must reject —
 * listed in `BROKEN`. Harness-level crashes (syntax, TLE, missing import)
 * belong on one problem, not on every new one.
 */

import { PROBLEMS } from "@/lib/problems/catalog";

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
  "contains-duplicate": [
    {
      label: "only checks adjacent duplicates",
      expect: "wrong_answer",
      source: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return any(nums[i] == nums[i + 1] for i in range(len(nums) - 1))
`,
    },
  ],
  "best-time-to-buy-and-sell-stock": [
    {
      label: "takes global max minus min, ignoring buy-before-sell",
      expect: "wrong_answer",
      source: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        return max(0, max(prices) - min(prices))
`,
    },
  ],
  "maximum-subarray": [
    {
      label: "returns the sum of the whole array",
      expect: "wrong_answer",
      source: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        return sum(nums)
`,
    },
  ],
  "product-of-array-except-self": [
    {
      label: "fills prefix products and forgets the suffix pass",
      expect: "wrong_answer",
      source: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        answer = [1] * n
        prefix = 1
        for i in range(n):
            answer[i] = prefix
            prefix *= nums[i]
        return answer
`,
    },
  ],
  "longest-substring-without-repeating-characters": [
    {
      label: "counts unique characters in the whole string, not a substring",
      expect: "wrong_answer",
      source: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        return len(set(s))
`,
    },
  ],
  "merge-intervals": [
    {
      label: "merges in given order without sorting",
      expect: "wrong_answer",
      source: `class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = [intervals[0][:]]
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        return merged
`,
    },
  ],
  "binary-search": [
    {
      label: "returns the insertion point instead of -1 on a miss",
      expect: "wrong_answer",
      source: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums)
        while left < right:
            mid = (left + right) // 2
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid
        return left if left < len(nums) else -1
`,
    },
  ],
  "search-insert-position": [
    {
      label: "returns -1 on a miss instead of the insertion index",
      expect: "wrong_answer",
      source: `class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
`,
    },
  ],
  "valid-anagram": [
    {
      label: "compares letter sets and drops multiplicity",
      expect: "wrong_answer",
      source: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return set(s) == set(t)
`,
    },
  ],
  "longest-consecutive-sequence": [
    {
      label: "sorts then resets the run on duplicates",
      expect: "wrong_answer",
      source: `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        if not nums:
            return 0
        ordered = sorted(nums)
        best = current = 1
        for i in range(1, len(ordered)):
            if ordered[i] == ordered[i - 1] + 1:
                current += 1
                best = max(best, current)
            else:
                current = 1
        return best
`,
    },
  ],
  "daily-temperatures": [
    {
      label: "only looks at the next adjacent day",
      expect: "wrong_answer",
      source: `class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        for i in range(n - 1):
            if temperatures[i + 1] > temperatures[i]:
                answer[i] = 1
        return answer
`,
    },
  ],
  "container-with-most-water": [
    {
      label: "moves the taller pointer instead of the shorter",
      expect: "wrong_answer",
      source: `class Solution:
    def maxArea(self, height: List[int]) -> int:
        left, right = 0, len(height) - 1
        best = 0
        while left < right:
            best = max(best, min(height[left], height[right]) * (right - left))
            if height[left] > height[right]:
                left += 1
            else:
                right -= 1
        return best
`,
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

export const FIXTURES: readonly ProblemFixtures[] = PROBLEMS.map((problem) => ({
  slug: problem.slug,
  accepted: problem.reference,
  acceptedVariants: VARIANTS[problem.slug],
  broken: BROKEN[problem.slug],
}));

export function hasPlausibleWrongAnswer(
  fixture: ProblemFixtures,
): boolean {
  return (fixture.broken ?? []).some((entry) => entry.expect === "wrong_answer");
}
