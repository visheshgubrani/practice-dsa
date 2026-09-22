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
 * The order is the NeetCode 150 roadmap order (`docs/catalog/neetcode-150.json`),
 * group by group, because `PROBLEMS` order is the `position` the list page and
 * the previous/next arrows follow. `search-insert-position` is the one problem
 * here that is not on the sheet; it sits with the binary-search family.
 *
 * Do not import this from client code. `@/lib/problems` is the public
 * interface and does not re-export the catalog.
 */

import type { AuthoredProblem } from "./authoring";
import { threeSum } from "./3sum";
import { bestTimeToBuyAndSellStock } from "./best-time-to-buy-and-sell-stock";
import { binarySearch } from "./binary-search";
import { carFleet } from "./car-fleet";
import { containsDuplicate } from "./contains-duplicate";
import { containerWithMostWater } from "./container-with-most-water";
import { countingBits } from "./counting-bits";
import { dailyTemperatures } from "./daily-temperatures";
import { evaluateReversePolishNotation } from "./evaluate-reverse-polish-notation";
import { findMinimumInRotatedSortedArray } from "./find-minimum-in-rotated-sorted-array";
import { findTheDuplicateNumber } from "./find-the-duplicate-number";
import { gasStation } from "./gas-station";
import { generateParentheses } from "./generate-parentheses";
import { groupAnagrams } from "./group-anagrams";
import { handOfStraights } from "./hand-of-straights";
import { happyNumber } from "./happy-number";
import { insertInterval } from "./insert-interval";
import { jumpGame } from "./jump-game";
import { jumpGameIi } from "./jump-game-ii";
import { kClosestPointsToOrigin } from "./k-closest-points-to-origin";
import { kokoEatingBananas } from "./koko-eating-bananas";
import { kthLargestElementInAnArray } from "./kth-largest-element-in-an-array";
import { largestRectangleInHistogram } from "./largest-rectangle-in-histogram";
import { lastStoneWeight } from "./last-stone-weight";
import { longestConsecutiveSequence } from "./longest-consecutive-sequence";
import { longestRepeatingCharacterReplacement } from "./longest-repeating-character-replacement";
import { longestSubstringWithoutRepeatingCharacters } from "./longest-substring-without-repeating-characters";
import { maximumSubarray } from "./maximum-subarray";
import { mergeIntervals } from "./merge-intervals";
import { mergeTripletsToFormTargetTriplet } from "./merge-triplets-to-form-target-triplet";
import { minimumIntervalToIncludeEachQuery } from "./minimum-interval-to-include-each-query";
import { minimumWindowSubstring } from "./minimum-window-substring";
import { missingNumber } from "./missing-number";
import { multiplyStrings } from "./multiply-strings";
import { nonOverlappingIntervals } from "./non-overlapping-intervals";
import { numberOf1Bits } from "./number-of-1-bits";
import { partitionLabels } from "./partition-labels";
import { permutationInString } from "./permutation-in-string";
import { plusOne } from "./plus-one";
import { productOfArrayExceptSelf } from "./product-of-array-except-self";
import { reverseBits } from "./reverse-bits";
import { reverseInteger } from "./reverse-integer";
import { searchA2dMatrix } from "./search-a-2d-matrix";
import { searchInRotatedSortedArray } from "./search-in-rotated-sorted-array";
import { searchInsertPosition } from "./search-insert-position";
import { singleNumber } from "./single-number";
import { slidingWindowMaximum } from "./sliding-window-maximum";
import { spiralMatrix } from "./spiral-matrix";
import { sumOfTwoIntegers } from "./sum-of-two-integers";
import { taskScheduler } from "./task-scheduler";
import { topKFrequentElements } from "./top-k-frequent-elements";
import { trappingRainWater } from "./trapping-rain-water";
import { twoSum } from "./two-sum";
import { twoSumIi } from "./two-sum-ii-input-array-is-sorted";
import { validAnagram } from "./valid-anagram";
import { validPalindrome } from "./valid-palindrome";
import { validParentheses } from "./valid-parentheses";
import { validParenthesisString } from "./valid-parenthesis-string";
import { validSudoku } from "./valid-sudoku";
import { wordSearchIi } from "./word-search-ii";

export const PROBLEMS: readonly AuthoredProblem[] = [
  // Arrays & Hashing
  containsDuplicate,
  validAnagram,
  twoSum,
  groupAnagrams,
  topKFrequentElements,
  productOfArrayExceptSelf,
  validSudoku,
  longestConsecutiveSequence,
  // Two Pointers
  validPalindrome,
  twoSumIi,
  threeSum,
  containerWithMostWater,
  trappingRainWater,
  // Sliding Window
  bestTimeToBuyAndSellStock,
  longestSubstringWithoutRepeatingCharacters,
  longestRepeatingCharacterReplacement,
  permutationInString,
  minimumWindowSubstring,
  slidingWindowMaximum,
  // Stack
  validParentheses,
  generateParentheses,
  largestRectangleInHistogram,
  evaluateReversePolishNotation,
  dailyTemperatures,
  carFleet,
  // Binary Search
  searchInRotatedSortedArray,
  searchA2dMatrix,
  findMinimumInRotatedSortedArray,
  binarySearch,
  kokoEatingBananas,
  searchInsertPosition,
  // Linked List
  findTheDuplicateNumber,
  // Tries
  wordSearchIi,
  // Heap / Priority Queue
  kthLargestElementInAnArray,
  taskScheduler,
  kClosestPointsToOrigin,
  lastStoneWeight,
  // Greedy
  jumpGameIi,
  maximumSubarray,
  jumpGame,
  gasStation,
  validParenthesisString,
  partitionLabels,
  handOfStraights,
  mergeTripletsToFormTargetTriplet,
  // Intervals
  mergeIntervals,
  insertInterval,
  nonOverlappingIntervals,
  minimumIntervalToIncludeEachQuery,
  // Math & Geometry
  multiplyStrings,
  spiralMatrix,
  plusOne,
  happyNumber,
  // Bit Manipulation
  reverseInteger,
  singleNumber,
  reverseBits,
  numberOf1Bits,
  missingNumber,
  countingBits,
  sumOfTwoIntegers,
];
