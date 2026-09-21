/**
 * Independent brute-force answers for small inputs.
 *
 * The Python reference is evidence, not proof. When an oracle can solve a case,
 * its answer must agree with the reference and with any authored `expected`.
 * A disagreement is a review of the testcase, the solution, and the comparator
 * — never a silent rewrite.
 *
 * Oracles return canonical JSON text, or null when the input is too large or
 * the wrong shape (the checker skips them).
 */

import type { ArgValue } from "@/lib/harness/args";

const SMALL = 40;

function jsonText(value: unknown): string {
  return JSON.stringify(value);
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > SMALL) return null;
  if (!value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    return null;
  }
  return value;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > SMALL) return null;
  if (!value.every((entry) => typeof entry === "string" && entry.length <= 40)) {
    return null;
  }
  return value;
}

/** Nested loop; independent of the O(n) hash-map reference. */
function twoSumOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  const target = args[1];
  if (!nums || typeof target !== "number" || nums.length < 2) return null;

  let found: [number, number] | null = null;
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      if (nums[i]! + nums[j]! === target) {
        if (found) return null;
        found = [i, j];
      }
    }
  }
  return found ? jsonText(found) : null;
}

/**
 * Repeatedly strip matched pairs. Independent of the stack reference — it
 * fails the same way on interleaved brackets, but the mechanism is different.
 */
function validParenthesesOracle(args: readonly ArgValue[]): string | null {
  const s = args[0];
  if (typeof s !== "string" || s.length > SMALL) return null;
  let current = s;
  let previous = "";
  while (current !== previous) {
    previous = current;
    current = current.replace("()", "").replace("[]", "").replace("{}", "");
  }
  return jsonText(current.length === 0);
}

/** Count-signature buckets; independent of the sorted-string reference. */
function groupAnagramsOracle(args: readonly ArgValue[]): string | null {
  const strs = asStringArray(args[0]);
  if (!strs) return null;

  const groups = new Map<string, string[]>();
  for (const word of strs) {
    const counts = Array.from({ length: 26 }, () => 0);
    for (const char of word) {
      const offset = char.charCodeAt(0) - 97;
      if (offset < 0 || offset > 25) return null;
      counts[offset]! += 1;
    }
    const key = counts.join(",");
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return jsonText([...groups.values()]);
}

/** Nested scan; independent of the hash-set reference. */
function containsDuplicateOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      if (nums[i] === nums[j]) return jsonText(true);
    }
  }
  return jsonText(false);
}

/** Every buy/sell pair; independent of the one-pass floor. */
function maxProfitOracle(args: readonly ArgValue[]): string | null {
  const prices = asNumberArray(args[0]);
  if (!prices || prices.length === 0) return null;
  let best = 0;
  for (let i = 0; i < prices.length; i += 1) {
    for (let j = i + 1; j < prices.length; j += 1) {
      best = Math.max(best, prices[j]! - prices[i]!);
    }
  }
  return jsonText(best);
}

/** Every subarray sum; independent of Kadane. */
function maxSubArrayOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  let best = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < nums.length; i += 1) {
    let sum = 0;
    for (let j = i; j < nums.length; j += 1) {
      sum += nums[j]!;
      best = Math.max(best, sum);
    }
  }
  return jsonText(best);
}

/** Multiply the others; independent of the prefix/suffix passes. */
function productExceptSelfOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length < 2) return null;
  const answer = nums.map((_, index) => {
    let product = 1;
    for (let i = 0; i < nums.length; i += 1) {
      if (i !== index) product *= nums[i]!;
    }
    return product;
  });
  return jsonText(answer);
}

/** Every substring; independent of the sliding window. */
function longestSubstringOracle(args: readonly ArgValue[]): string | null {
  const s = args[0];
  if (typeof s !== "string" || s.length > SMALL) return null;
  let best = 0;
  for (let i = 0; i < s.length; i += 1) {
    const seen = new Set<string>();
    for (let j = i; j < s.length; j += 1) {
      const char = s[j]!;
      if (seen.has(char)) break;
      seen.add(char);
      best = Math.max(best, j - i + 1);
    }
  }
  return jsonText(best);
}

function asIntervalList(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > SMALL) {
    return null;
  }
  const intervals: [number, number][] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const start = entry[0];
    const end = entry[1];
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isFinite(start) ||
      !Number.isFinite(end)
    ) {
      return null;
    }
    intervals.push([start, end]);
  }
  return intervals;
}

/** Pairwise merge until stable; independent of sort-then-scan. */
function mergeIntervalsOracle(args: readonly ArgValue[]): string | null {
  const intervals = asIntervalList(args[0]);
  if (!intervals) return null;
  const remaining = intervals.map(([start, end]) => [start, end] as [number, number]);
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < remaining.length; i += 1) {
      for (let j = i + 1; j < remaining.length; j += 1) {
        const [leftStart, leftEnd] = remaining[i]!;
        const [rightStart, rightEnd] = remaining[j]!;
        if (leftStart <= rightEnd && rightStart <= leftEnd) {
          remaining[i] = [
            Math.min(leftStart, rightStart),
            Math.max(leftEnd, rightEnd),
          ];
          remaining.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  remaining.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  return jsonText(remaining);
}

/** Linear scan; independent of the binary-search reference. */
function binarySearchOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  const target = args[1];
  if (!nums || nums.length === 0 || typeof target !== "number") return null;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === target) return jsonText(i);
  }
  return jsonText(-1);
}

/** First index with value >= target; independent of the binary-search reference. */
function searchInsertOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  const target = args[1];
  if (!nums || nums.length === 0 || typeof target !== "number") return null;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i]! >= target) return jsonText(i);
  }
  return jsonText(nums.length);
}

/** Sorted-letter equality; independent of the count-array reference. */
function validAnagramOracle(args: readonly ArgValue[]): string | null {
  const s = args[0];
  const t = args[1];
  if (typeof s !== "string" || typeof t !== "string") return null;
  if (s.length > SMALL || t.length > SMALL) return null;
  const letters = `${s}${t}`;
  for (const char of letters) {
    if (char < "a" || char > "z") return null;
  }
  const sorted = (value: string) => [...value].sort().join("");
  return jsonText(sorted(s) === sorted(t));
}

/** Sort unique values and scan runs; independent of the hash-set reference. */
function longestConsecutiveOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums) return null;
  const unique = [...new Set(nums)].sort((left, right) => left - right);
  if (unique.length === 0) return jsonText(0);
  let best = 1;
  let current = 1;
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] === unique[i - 1]! + 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return jsonText(best);
}

/** Nested next-warmer scan; independent of the monotonic stack. */
function dailyTemperaturesOracle(args: readonly ArgValue[]): string | null {
  const temperatures = asNumberArray(args[0]);
  if (!temperatures || temperatures.length === 0) return null;
  const answer = temperatures.map((temp, index) => {
    for (let j = index + 1; j < temperatures.length; j += 1) {
      if (temperatures[j]! > temp) return j - index;
    }
    return 0;
  });
  return jsonText(answer);
}

/** Every pair; independent of the two-pointer reference. */
function containerOracle(args: readonly ArgValue[]): string | null {
  const height = asNumberArray(args[0]);
  if (!height || height.length < 2) return null;
  let best = 0;
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) {
      best = Math.max(best, Math.min(height[i]!, height[j]!) * (j - i));
    }
  }
  return jsonText(best);
}

/** Per-index min of prefix/suffix maxima. Independent of the two-pointer reference. */
function trappingRainWaterOracle(args: readonly ArgValue[]): string | null {
  const height = asNumberArray(args[0]);
  if (!height || height.length === 0) return null;

  let total = 0;
  for (let i = 0; i < height.length; i += 1) {
    let left = 0;
    let right = 0;
    for (let j = 0; j <= i; j += 1) left = Math.max(left, height[j]!);
    for (let j = i; j < height.length; j += 1) right = Math.max(right, height[j]!);
    total += Math.min(left, right) - height[i]!;
  }
  return jsonText(total);
}

export function oracleAnswer(
  slug: string,
  args: readonly ArgValue[],
): string | null {
  switch (slug) {
    case "two-sum":
      return twoSumOracle(args);
    case "valid-parentheses":
      return validParenthesesOracle(args);
    case "group-anagrams":
      return groupAnagramsOracle(args);
    case "trapping-rain-water":
      return trappingRainWaterOracle(args);
    case "contains-duplicate":
      return containsDuplicateOracle(args);
    case "best-time-to-buy-and-sell-stock":
      return maxProfitOracle(args);
    case "maximum-subarray":
      return maxSubArrayOracle(args);
    case "product-of-array-except-self":
      return productExceptSelfOracle(args);
    case "longest-substring-without-repeating-characters":
      return longestSubstringOracle(args);
    case "merge-intervals":
      return mergeIntervalsOracle(args);
    case "binary-search":
      return binarySearchOracle(args);
    case "search-insert-position":
      return searchInsertOracle(args);
    case "valid-anagram":
      return validAnagramOracle(args);
    case "longest-consecutive-sequence":
      return longestConsecutiveOracle(args);
    case "daily-temperatures":
      return dailyTemperaturesOracle(args);
    case "container-with-most-water":
      return containerOracle(args);
    default:
      return null;
  }
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GeneratedCase = {
  args: ArgValue[];
  label: string;
};

/** Extra small inputs that are not in the catalog; reference and oracle must agree. */
export function generatedOracleCases(slug: string): GeneratedCase[] {
  const random = mulberry32(slug.length * 97 + 11);
  const cases: GeneratedCase[] = [];

  if (slug === "two-sum") {
    for (let n = 2; n <= 6; n += 1) {
      let added = 0;
      for (let attempt = 0; attempt < 20 && added < 1; attempt += 1) {
        const nums = Array.from({ length: n }, () =>
          Math.floor(random() * 21) - 10,
        );
        const i = Math.floor(random() * n);
        let j = Math.floor(random() * n);
        if (j === i) j = (j + 1) % n;
        const target = nums[i]! + nums[j]!;
        if (oracleAnswer(slug, [nums, target]) === null) continue;
        cases.push({
          args: [nums, target],
          label: `generated n=${n}`,
        });
        added += 1;
      }
    }
  }

  if (slug === "valid-parentheses") {
    const chars = ["(", ")", "[", "]", "{", "}"];
    for (let length = 1; length <= 8; length += 1) {
      const s = Array.from(
        { length },
        () => chars[Math.floor(random() * chars.length)]!,
      ).join("");
      cases.push({ args: [s], label: `generated length=${length}` });
    }
    cases.push({ args: ["(((())))"], label: "generated nested opens" });
    cases.push({ args: ["([)]"], label: "generated interleaved" });
  }

  if (slug === "group-anagrams") {
    const words = ["ab", "ba", "abc", "cab", "bca", "z", "", "aa", "aa"];
    cases.push({ args: [words.slice(0, 3)], label: "generated three words" });
    cases.push({ args: [words.slice(0, 6)], label: "generated mixed groups" });
    cases.push({ args: [[""]], label: "generated empty string" });
    cases.push({ args: [["z", "z"]], label: "generated duplicates" });
  }

  if (slug === "trapping-rain-water") {
    for (let n = 1; n <= 8; n += 1) {
      const height = Array.from({ length: n }, () => Math.floor(random() * 6));
      cases.push({ args: [height], label: `generated n=${n}` });
    }
    cases.push({ args: [[3, 0, 3]], label: "generated pit" });
  }

  if (slug === "contains-duplicate") {
    for (let n = 1; n <= 8; n += 1) {
      const nums = Array.from({ length: n }, () => Math.floor(random() * 6) - 2);
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
    cases.push({ args: [[7, 1, 7]], label: "generated non-adjacent" });
  }

  if (slug === "best-time-to-buy-and-sell-stock") {
    for (let n = 1; n <= 8; n += 1) {
      const prices = Array.from({ length: n }, () => Math.floor(random() * 11));
      cases.push({ args: [prices], label: `generated n=${n}` });
    }
    cases.push({ args: [[9, 0, 8]], label: "generated late peak" });
  }

  if (slug === "maximum-subarray") {
    for (let n = 1; n <= 8; n += 1) {
      const nums = Array.from({ length: n }, () => Math.floor(random() * 11) - 5);
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
    cases.push({ args: [[-4, -1, -3]], label: "generated all negative" });
  }

  if (slug === "product-of-array-except-self") {
    for (let n = 2; n <= 6; n += 1) {
      const nums = Array.from({ length: n }, () => Math.floor(random() * 5) - 2);
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
    cases.push({ args: [[0, 2, 0]], label: "generated two zeros" });
  }

  if (slug === "longest-substring-without-repeating-characters") {
    const alphabet = "abca bc!";
    for (let length = 0; length <= 8; length += 1) {
      const s = Array.from(
        { length },
        () => alphabet[Math.floor(random() * alphabet.length)]!,
      ).join("");
      cases.push({ args: [s], label: `generated length=${length}` });
    }
    cases.push({ args: ["abba"], label: "generated jump-back" });
  }

  if (slug === "merge-intervals") {
    for (let n = 1; n <= 6; n += 1) {
      const intervals = Array.from({ length: n }, () => {
        const start = Math.floor(random() * 8);
        const end = start + Math.floor(random() * 5);
        return [start, end];
      });
      cases.push({ args: [intervals], label: `generated n=${n}` });
    }
    cases.push({
      args: [
        [
          [5, 6],
          [1, 2],
          [2, 5],
        ],
      ],
      label: "generated unsorted chain",
    });
  }

  if (slug === "binary-search") {
    for (let n = 1; n <= 8; n += 1) {
      const unique = new Set<number>();
      while (unique.size < n) {
        unique.add(Math.floor(random() * 21) - 10);
      }
      const nums = [...unique].sort((left, right) => left - right);
      const target = Math.floor(random() * 21) - 10;
      cases.push({ args: [nums, target], label: `generated n=${n}` });
    }
    cases.push({ args: [[-2, 0, 3], 1], label: "generated miss in a gap" });
  }

  if (slug === "search-insert-position") {
    for (let n = 1; n <= 8; n += 1) {
      const unique = new Set<number>();
      while (unique.size < n) {
        unique.add(Math.floor(random() * 21) - 10);
      }
      const nums = [...unique].sort((left, right) => left - right);
      const target = Math.floor(random() * 21) - 10;
      cases.push({ args: [nums, target], label: `generated n=${n}` });
    }
    cases.push({ args: [[1, 3, 5], 0], label: "generated insert at front" });
  }

  if (slug === "valid-anagram") {
    const alphabet = "abc";
    for (let length = 1; length <= 6; length += 1) {
      const s = Array.from(
        { length },
        () => alphabet[Math.floor(random() * alphabet.length)]!,
      ).join("");
      const t = Array.from(
        { length },
        () => alphabet[Math.floor(random() * alphabet.length)]!,
      ).join("");
      cases.push({ args: [s, t], label: `generated length=${length}` });
    }
    cases.push({ args: ["ab", "ba"], label: "generated swap" });
    cases.push({ args: ["aa", "a"], label: "generated length mismatch" });
  }

  if (slug === "longest-consecutive-sequence") {
    for (let n = 0; n <= 8; n += 1) {
      const nums = Array.from({ length: n }, () => Math.floor(random() * 11) - 5);
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
    cases.push({ args: [[1, 2, 2, 3]], label: "generated duplicates in a run" });
  }

  if (slug === "daily-temperatures") {
    for (let n = 1; n <= 8; n += 1) {
      const temperatures = Array.from(
        { length: n },
        () => 30 + Math.floor(random() * 8),
      );
      cases.push({ args: [temperatures], label: `generated n=${n}` });
    }
    cases.push({ args: [[70, 70, 71]], label: "generated equal then warmer" });
  }

  if (slug === "container-with-most-water") {
    for (let n = 2; n <= 8; n += 1) {
      const height = Array.from({ length: n }, () => Math.floor(random() * 8));
      cases.push({ args: [height], label: `generated n=${n}` });
    }
    cases.push({ args: [[1, 2, 4, 3]], label: "generated inner pair" });
  }

  return cases;
}
