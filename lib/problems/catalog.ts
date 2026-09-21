/**
 * Seed input: the authored catalog, assembled from per-problem modules.
 *
 * Not the app's data source — pages, the runner, and the chat route read
 * Postgres. Editing a module only takes effect after `pnpm db:seed`.
 *
 * A new problem is a module here, then an entry in `PROBLEMS`. Follow the
 * Phase 4 authoring order in `docs/plan/04-catalog.md` (statement → cases →
 * reference → `pnpm problems:check` → a plausible wrong-answer fixture →
 * seed / `pnpm piston:check`). Stay on the return-value harness; do not add
 * linked lists, trees, custom classes, or in-place (`void`) contracts.
 *
 * Do not import this from client code. `@/lib/problems` is the public
 * interface and does not re-export the catalog.
 */

import type { AuthoredProblem } from "./authoring";
import { bestTimeToBuyAndSellStock } from "./best-time-to-buy-and-sell-stock";
import { binarySearch } from "./binary-search";
import { containsDuplicate } from "./contains-duplicate";
import { containerWithMostWater } from "./container-with-most-water";
import { dailyTemperatures } from "./daily-temperatures";
import { groupAnagrams } from "./group-anagrams";
import { longestConsecutiveSequence } from "./longest-consecutive-sequence";
import { longestSubstringWithoutRepeatingCharacters } from "./longest-substring-without-repeating-characters";
import { maximumSubarray } from "./maximum-subarray";
import { mergeIntervals } from "./merge-intervals";
import { productOfArrayExceptSelf } from "./product-of-array-except-self";
import { searchInsertPosition } from "./search-insert-position";
import { trappingRainWater } from "./trapping-rain-water";
import { twoSum } from "./two-sum";
import { validAnagram } from "./valid-anagram";
import { validParentheses } from "./valid-parentheses";

export const PROBLEMS: readonly AuthoredProblem[] = [
  twoSum,
  validParentheses,
  groupAnagrams,
  trappingRainWater,
  containsDuplicate,
  bestTimeToBuyAndSellStock,
  maximumSubarray,
  productOfArrayExceptSelf,
  longestSubstringWithoutRepeatingCharacters,
  mergeIntervals,
  binarySearch,
  searchInsertPosition,
  validAnagram,
  longestConsecutiveSequence,
  dailyTemperatures,
  containerWithMostWater,
];
