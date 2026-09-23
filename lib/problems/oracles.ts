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
import { graphOracleAnswer } from "@/lib/problems/graph-oracles";

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

function asPoints(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > SMALL) return null;
  const points: [number, number][] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const x = entry[0];
    const y = entry[1];
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    points.push([x, y]);
  }
  return points;
}

function asIntervals(value: unknown, allowEmpty: boolean): [number, number][] | null {
  if (!Array.isArray(value) || value.length > SMALL) return null;
  if (value.length === 0) return allowEmpty ? [] : null;
  return asIntervalList(value);
}

/** Insert, then merge by repeated overlap. Independent of the one-pass reference. */
function insertIntervalOracle(args: readonly ArgValue[]): string | null {
  const intervals = asIntervals(args[0], true);
  const added = asIntervalList([args[1]]);
  if (!intervals || !added || added.length !== 1) return null;
  return mergeIntervalsOracle([[...intervals, added[0]!]]);
}

/** Sort by end and keep the earliest finish. Independent of the sort-by-start reference. */
function eraseOverlapOracle(args: readonly ArgValue[]): string | null {
  const intervals = asIntervalList(args[0]);
  if (!intervals) return null;
  const byEnd = [...intervals].sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  let kept = 0;
  let prevEnd = -Infinity;
  for (const [start, end] of byEnd) {
    if (start >= prevEnd) {
      kept += 1;
      prevEnd = end;
    }
  }
  return jsonText(intervals.length - kept);
}

/** Scan every interval per query. Independent of the sweep-line heap. */
function minIntervalOracle(args: readonly ArgValue[]): string | null {
  const intervals = asIntervalList(args[0]);
  const queries = asNumberArray(args[1]);
  if (!intervals || !queries) return null;
  const answers = queries.map((query) => {
    let best: number | null = null;
    for (const [left, right] of intervals) {
      if (left <= query && query <= right) {
        const length = right - left + 1;
        if (best === null || length < best) best = length;
      }
    }
    return best ?? -1;
  });
  return jsonText(answers);
}

/** Reachability flags. Independent of the backward-goal reference. */
function jumpGameOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  const reach = Array.from({ length: nums.length }, () => false);
  reach[0] = true;
  for (let index = 0; index < nums.length; index += 1) {
    if (!reach[index]) continue;
    const jump = nums[index]!;
    for (let step = 1; step <= jump && index + step < nums.length; step += 1) {
      reach[index + step] = true;
    }
  }
  return jsonText(reach[nums.length - 1] === true);
}

/** Minimum jumps by relaxation. Independent of the window reference. */
function jumpGameIiOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  const jumps = Array.from({ length: nums.length }, () => Number.POSITIVE_INFINITY);
  jumps[0] = 0;
  for (let index = 0; index < nums.length; index += 1) {
    const jump = nums[index]!;
    for (let step = 1; step <= jump && index + step < nums.length; step += 1) {
      jumps[index + step] = Math.min(jumps[index + step]!, jumps[index]! + 1);
    }
  }
  const answer = jumps[nums.length - 1]!;
  return Number.isFinite(answer) ? jsonText(answer) : null;
}

/**
 * Try every station as the start. Returns null when more than one start works,
 * because the authored cases are the ones with a unique index.
 */
function gasStationOracle(args: readonly ArgValue[]): string | null {
  const gas = asNumberArray(args[0]);
  const cost = asNumberArray(args[1]);
  if (!gas || !cost || gas.length !== cost.length || gas.length === 0) return null;
  const starts: number[] = [];
  for (let start = 0; start < gas.length; start += 1) {
    let tank = 0;
    let ok = true;
    for (let step = 0; step < gas.length; step += 1) {
      const index = (start + step) % gas.length;
      tank += gas[index]! - cost[index]!;
      if (tank < 0) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(start);
  }
  if (starts.length > 1) return null;
  return jsonText(starts.length === 1 ? starts[0] : -1);
}

/** Count map, consuming every copy of the smallest card at once. Independent of the heap. */
function handOfStraightsOracle(args: readonly ArgValue[]): string | null {
  const hand = asNumberArray(args[0]);
  const groupSize = args[1];
  if (!hand || hand.length === 0 || typeof groupSize !== "number" || groupSize < 1) return null;
  if (hand.length % groupSize !== 0) return jsonText(false);
  const count = new Map<number, number>();
  for (const value of hand) count.set(value, (count.get(value) ?? 0) + 1);
  const starts = [...count.keys()].sort((left, right) => left - right);
  for (const start of starts) {
    const need = count.get(start) ?? 0;
    if (need === 0) continue;
    for (let value = start; value < start + groupSize; value += 1) {
      const have = count.get(value) ?? 0;
      if (have < need) return jsonText(false);
      count.set(value, have - need);
    }
  }
  return jsonText(true);
}

/** Every subset of the triplets that do not exceed the target. */
function mergeTripletsOracle(args: readonly ArgValue[]): string | null {
  const triplets = args[0];
  const target = asNumberArray(args[1]);
  if (!Array.isArray(triplets) || triplets.length === 0 || triplets.length > 16) return null;
  if (!target || target.length !== 3) return null;
  const usable: [number, number, number][] = [];
  for (const triplet of triplets) {
    if (!Array.isArray(triplet) || triplet.length !== 3) return null;
    const values = triplet as unknown[];
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
    const [a, b, c] = values as [number, number, number];
    if (a <= target[0]! && b <= target[1]! && c <= target[2]!) usable.push([a, b, c]);
  }
  for (let mask = 1; mask < 2 ** usable.length; mask += 1) {
    const merged = [0, 0, 0];
    for (let index = 0; index < usable.length; index += 1) {
      if ((mask & (2 ** index)) === 0) continue;
      const triplet = usable[index]!;
      for (let coordinate = 0; coordinate < 3; coordinate += 1) {
        merged[coordinate] = Math.max(merged[coordinate]!, triplet[coordinate]);
      }
    }
    if (merged[0] === target[0] && merged[1] === target[1] && merged[2] === target[2]) {
      return jsonText(true);
    }
  }
  return jsonText(false);
}

/** Last-index expansion written as a fresh loop. Catches a mistyped length. */
function partitionLabelsOracle(args: readonly ArgValue[]): string | null {
  const text = args[0];
  if (typeof text !== "string" || text.length === 0 || text.length > SMALL) return null;
  const last = new Map<string, number>();
  for (let index = 0; index < text.length; index += 1) last.set(text[index]!, index);
  const parts: number[] = [];
  let start = 0;
  while (start < text.length) {
    let end = last.get(text[start]!)!;
    for (let index = start; index <= end; index += 1) {
      end = Math.max(end, last.get(text[index]!)!);
    }
    parts.push(end - start + 1);
    start = end + 1;
  }
  return jsonText(parts);
}

/** Recursion over the three readings of a star. Independent of the greedy range. */
function validParenthesisStringOracle(args: readonly ArgValue[]): string | null {
  const text = args[0];
  if (typeof text !== "string" || text.length === 0 || text.length > 12) return null;

  const visit = (index: number, balance: number): boolean => {
    if (balance < 0) return false;
    if (index === text.length) return balance === 0;
    const char = text[index];
    if (char === "(") return visit(index + 1, balance + 1);
    if (char === ")") return visit(index + 1, balance - 1);
    return visit(index + 1, balance + 1) || visit(index + 1, balance - 1) || visit(index + 1, balance);
  };
  return jsonText(visit(0, 0));
}

/** Sorted multiset. Independent of the heap reference. */
function lastStoneOracle(args: readonly ArgValue[]): string | null {
  const stones = asNumberArray(args[0]);
  if (!stones || stones.length === 0) return null;
  const pile = [...stones].sort((left, right) => left - right);
  while (pile.length > 1) {
    const heavy = pile.pop()!;
    const next = pile.pop()!;
    if (heavy === next) continue;
    const difference = heavy - next;
    let index = 0;
    while (index < pile.length && pile[index]! < difference) index += 1;
    pile.splice(index, 0, difference);
  }
  return jsonText(pile[0] ?? 0);
}

/** Sort. Independent of the heap reference. */
function kthLargestOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  const k = args[1];
  if (!nums || nums.length === 0 || typeof k !== "number" || k < 1 || k > nums.length) return null;
  const ordered = [...nums].sort((left, right) => right - left);
  return jsonText(ordered[k - 1]);
}

/** Schedule the busiest available letter each frame. Independent of the closed formula. */
function taskSchedulerOracle(args: readonly ArgValue[]): string | null {
  const tasks = asStringArray(args[0]);
  const cooldown = args[1];
  if (!tasks || tasks.length === 0 || typeof cooldown !== "number" || cooldown < 0) return null;
  const count = new Map<string, number>();
  for (const task of tasks) count.set(task, (count.get(task) ?? 0) + 1);
  const remaining = (): number => [...count.values()].reduce((sum, value) => sum + value, 0);
  let time = 0;
  while (remaining() > 0) {
    const ranked = [...count.entries()].sort(
      (left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : 1),
    );
    let used = 0;
    for (const [letter, copies] of ranked) {
      if (used === cooldown + 1) break;
      if (copies <= 0) continue;
      count.set(letter, copies - 1);
      used += 1;
      time += 1;
    }
    if (remaining() === 0) return jsonText(time);
    time += cooldown + 1 - used;
  }
  return jsonText(time);
}

/**
 * Sort by squared distance. Returns null when the kth place is a tie, so a
 * case with two legal sets is not judged as one of them.
 */
function kClosestOracle(args: readonly ArgValue[]): string | null {
  const points = asPoints(args[0]);
  const k = args[1];
  if (!points || typeof k !== "number" || k < 1 || k > points.length) return null;
  const ranked = points
    .map((point) => ({ point, distance: point[0] ** 2 + point[1] ** 2 }))
    .sort(
      (left, right) =>
        left.distance - right.distance || left.point[0] - right.point[0] || left.point[1] - right.point[1],
    );
  if (k < points.length && ranked[k - 1]!.distance === ranked[k]!.distance) return null;
  return jsonText(ranked.slice(0, k).map((entry) => entry.point));
}

const INT32_MIN_VALUE = -2_147_483_648;
const INT32_MAX_VALUE = 2_147_483_647;

/** Set-bits by shifting; independent of the `n &= n - 1` fold. */
function popcount(value: number): number {
  let remaining = value;
  let bits = 0;
  while (remaining > 0) {
    bits += remaining & 1;
    remaining >>>= 1;
  }
  return bits;
}

/** Occurrence counting; independent of the XOR fold. */
function singleNumberOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  const counts = new Map<number, number>();
  for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
  const singletons = [...counts].filter(([, count]) => count === 1);
  return singletons.length === 1 ? jsonText(singletons[0]![0]) : null;
}

/** Binary-string counting; independent of the clearing-lowest-bit loop. */
function hammingWeightOracle(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > INT32_MAX_VALUE
  ) {
    return null;
  }
  return jsonText(popcount(n));
}

/** Naive per-value popcount; independent of the offset DP. */
function countingBitsOracle(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 2048) {
    return null;
  }
  return jsonText(Array.from({ length: n + 1 }, (_, value) => popcount(value)));
}

/** 32-character string reversal; independent of the shift-into-place loop. */
function reverseBitsOracle(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > INT32_MAX_VALUE - 1 ||
    n % 2 !== 0
  ) {
    return null;
  }
  const bits = n.toString(2).padStart(32, "0");
  return jsonText(Number.parseInt(bits.split("").reverse().join(""), 2));
}

/** Closed-form total; independent of the reference's running sum. */
function missingNumberOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length === 0) return null;
  const n = nums.length;
  if (new Set(nums).size !== n) return null;
  if (nums.some((value) => !Number.isInteger(value) || value < 0 || value > n)) {
    return null;
  }
  const total = (n * (n + 1)) / 2;
  return jsonText(total - nums.reduce((sum, value) => sum + value, 0));
}

/** Plain arithmetic; independent of every bit trick in the reference. */
function sumOfTwoIntegersOracle(args: readonly ArgValue[]): string | null {
  const [a, b] = args;
  if (typeof a !== "number" || typeof b !== "number") return null;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  if (Math.abs(a) > 1000 || Math.abs(b) > 1000) return null;
  return jsonText(a + b);
}

/** String reversal with an explicit clamp; independent of the digit rebuild. */
function reverseIntegerOracle(args: readonly ArgValue[]): string | null {
  const x = args[0];
  if (typeof x !== "number" || !Number.isInteger(x)) return null;
  if (x < INT32_MIN_VALUE || x > INT32_MAX_VALUE) return null;
  const sign = x < 0 ? -1 : 1;
  const digits = Math.abs(x).toString().split("").reverse().join("");
  const reversed = sign * Number.parseInt(digits, 10);
  return jsonText(
    reversed < INT32_MIN_VALUE || reversed > INT32_MAX_VALUE ? 0 : reversed,
  );
}

/** Explicit repeat set; independent of the two-pointer cycle walk. */
function happyNumberOracle(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > INT32_MAX_VALUE
  ) {
    return null;
  }
  const seen = new Set<number>();
  let current = n;
  while (current !== 1 && !seen.has(current)) {
    seen.add(current);
    current = String(current)
      .split("")
      .reduce((sum, digit) => sum + Number(digit) ** 2, 0);
  }
  return jsonText(current === 1);
}

/** BigInt over the printed digits; independent of the carry array. */
function plusOneOracle(args: readonly ArgValue[]): string | null {
  const digits = asNumberArray(args[0]);
  if (!digits || digits.length === 0 || digits.length > 32) return null;
  if (digits.some((digit) => !Number.isInteger(digit) || digit < 0 || digit > 9)) {
    return null;
  }
  const next = BigInt(digits.map(String).join("")) + BigInt(1);
  return jsonText(String(next).split("").map(Number));
}

/** Rectangular integer matrix within the authored bounds, or null. */
function asIntMatrix(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    return null;
  }
  const rows: number[][] = [];
  for (const row of value) {
    const numbers = asNumberArray(row);
    if (!numbers || numbers.length === 0 || numbers.length > 12) return null;
    rows.push(numbers);
  }
  const width = rows[0]!.length;
  return rows.every((row) => row.length === width) ? rows : null;
}

/** Visited-cell walk; independent of the shrinking-boundary reference. */
function spiralMatrixOracle(args: readonly ArgValue[]): string | null {
  const matrix = asIntMatrix(args[0]);
  if (!matrix) return null;
  const rows = matrix.length;
  const columns = matrix[0]!.length;
  const visited = matrix.map((row) => row.map(() => false));
  const steps = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ] as const;
  const order: number[] = [];
  let row = 0;
  let column = 0;
  let direction = 0;

  for (let taken = 0; taken < rows * columns; taken += 1) {
    order.push(matrix[row]![column]!);
    visited[row]![column] = true;
    let [dr, dc] = steps[direction]!;
    if (
      row + dr < 0 ||
      row + dr >= rows ||
      column + dc < 0 ||
      column + dc >= columns ||
      visited[row + dr]![column + dc]
    ) {
      direction = (direction + 1) % 4;
      [dr, dc] = steps[direction]!;
    }
    row += dr;
    column += dc;
  }

  return jsonText(order);
}

/** BigInt product; independent of the positional-carry multiply. */
function multiplyStringsOracle(args: readonly ArgValue[]): string | null {
  const [num1, num2] = args;
  if (typeof num1 !== "string" || typeof num2 !== "string") return null;
  const shape = /^(0|[1-9][0-9]{0,49})$/;
  if (!shape.test(num1) || !shape.test(num2)) return null;
  return jsonText((BigInt(num1) * BigInt(num2)).toString());
}

/** Lowercase rectangular board within the authored bounds, or null. */
function asLetterBoard(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 6) {
    return null;
  }
  const rows: string[][] = [];
  for (const row of value) {
    const letters = asStringArray(row);
    if (!letters || letters.length === 0 || letters.length > 6) return null;
    if (!letters.every((letter) => /^[a-z]$/.test(letter))) return null;
    rows.push(letters);
  }
  const width = rows[0]!.length;
  return rows.every((row) => row.length === width) ? rows : null;
}

/** Can `word` be traced on the board without reusing a cell? Mutates its copy. */
function boardCanSpell(board: string[][], word: string): boolean {
  const rows = board.length;
  const columns = board[0]!.length;

  const walk = (row: number, column: number, index: number): boolean => {
    if (index === word.length) return true;
    if (row < 0 || row >= rows || column < 0 || column >= columns) return false;
    if (board[row]![column] !== word[index]) return false;
    const saved = board[row]![column]!;
    board[row]![column] = "";
    const found =
      walk(row + 1, column, index + 1) ||
      walk(row - 1, column, index + 1) ||
      walk(row, column + 1, index + 1) ||
      walk(row, column - 1, index + 1);
    board[row]![column] = saved;
    return found;
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (walk(row, column, 0)) return true;
    }
  }
  return false;
}

/** One DFS per word; independent of the trie the reference builds. */
function wordSearchIiOracle(args: readonly ArgValue[]): string | null {
  const board = asLetterBoard(args[0]);
  const words = asStringArray(args[1]);
  if (!board || !words) return null;
  const found = words.filter((word) => {
    if (word.length === 0 || word.length > 8) return false;
    const copy = board.map((row) => [...row]);
    return boardCanSpell(copy, word);
  });
  return jsonText(found);
}

/** Counting binary search; independent of Floyd's cycle walk. */
function findDuplicateOracle(args: readonly ArgValue[]): string | null {
  const nums = asNumberArray(args[0]);
  if (!nums || nums.length < 2) return null;
  const n = nums.length - 1;
  if (nums.some((value) => !Number.isInteger(value) || value < 1 || value > n)) {
    return null;
  }
  const counts = new Map<number, number>();
  for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
  const repeated = [...counts].filter(([, count]) => count > 1);
  if (repeated.length !== 1) return null;

  let low = 1;
  let high = n;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const atOrBelow = nums.filter((value) => value <= mid).length;
    if (atOrBelow > mid) high = mid;
    else low = mid + 1;
  }
  return low === repeated[0]![0] ? jsonText(low) : null;
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
    case "insert-interval":
      return insertIntervalOracle(args);
    case "non-overlapping-intervals":
      return eraseOverlapOracle(args);
    case "minimum-interval-to-include-each-query":
      return minIntervalOracle(args);
    case "jump-game":
      return jumpGameOracle(args);
    case "jump-game-ii":
      return jumpGameIiOracle(args);
    case "gas-station":
      return gasStationOracle(args);
    case "hand-of-straights":
      return handOfStraightsOracle(args);
    case "merge-triplets-to-form-target-triplet":
      return mergeTripletsOracle(args);
    case "partition-labels":
      return partitionLabelsOracle(args);
    case "valid-parenthesis-string":
      return validParenthesisStringOracle(args);
    case "last-stone-weight":
      return lastStoneOracle(args);
    case "kth-largest-element-in-an-array":
      return kthLargestOracle(args);
    case "task-scheduler":
      return taskSchedulerOracle(args);
    case "k-closest-points-to-origin":
      return kClosestOracle(args);
    case "single-number":
      return singleNumberOracle(args);
    case "number-of-1-bits":
      return hammingWeightOracle(args);
    case "counting-bits":
      return countingBitsOracle(args);
    case "reverse-bits":
      return reverseBitsOracle(args);
    case "missing-number":
      return missingNumberOracle(args);
    case "sum-of-two-integers":
      return sumOfTwoIntegersOracle(args);
    case "reverse-integer":
      return reverseIntegerOracle(args);
    case "happy-number":
      return happyNumberOracle(args);
    case "plus-one":
      return plusOneOracle(args);
    case "spiral-matrix":
      return spiralMatrixOracle(args);
    case "multiply-strings":
      return multiplyStringsOracle(args);
    case "word-search-ii":
      return wordSearchIiOracle(args);
    case "find-the-duplicate-number":
      return findDuplicateOracle(args);
    default:
      return graphOracleAnswer(slug, args);
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

  if (slug === "single-number") {
    // Pairs come from [-10, 10] and the singleton from [20, 30], so the
    // generated input always has exactly one unpaired value.
    for (let pairs = 0; pairs <= 4; pairs += 1) {
      const nums: number[] = [];
      for (let index = 0; index < pairs; index += 1) {
        const value = Math.floor(random() * 21) - 10;
        nums.push(value, value);
      }
      nums.push(20 + Math.floor(random() * 11));
      for (let index = nums.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [nums[index], nums[swap]] = [nums[swap]!, nums[index]!];
      }
      cases.push({ args: [nums], label: `generated ${pairs} pairs` });
    }
  }

  if (slug === "number-of-1-bits") {
    for (let index = 0; index < 6; index += 1) {
      cases.push({
        args: [Math.floor(random() * (INT32_MAX_VALUE + 1))],
        label: `generated random #${index + 1}`,
      });
    }
    cases.push({ args: [1], label: "generated single low bit" });
    cases.push({ args: [INT32_MAX_VALUE], label: "generated all 31 bits" });
  }

  if (slug === "counting-bits") {
    for (let n = 0; n <= 12; n += 1) {
      cases.push({ args: [n], label: `generated n=${n}` });
    }
  }

  if (slug === "reverse-bits") {
    for (let index = 0; index < 6; index += 1) {
      const n = Math.floor(random() * (INT32_MAX_VALUE / 2)) * 2;
      cases.push({ args: [n], label: `generated random even #${index + 1}` });
    }
    cases.push({ args: [0], label: "generated zero" });
    cases.push({
      args: [INT32_MAX_VALUE - 1],
      label: "generated all bits but the last",
    });
  }

  if (slug === "missing-number") {
    for (let n = 1; n <= 8; n += 1) {
      const nums = Array.from({ length: n + 1 }, (_, value) => value);
      nums.splice(Math.floor(random() * (n + 1)), 1);
      for (let index = nums.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [nums[index], nums[swap]] = [nums[swap]!, nums[index]!];
      }
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
  }

  if (slug === "sum-of-two-integers") {
    for (let index = 0; index < 8; index += 1) {
      const a = Math.floor(random() * 2001) - 1000;
      const b = Math.floor(random() * 2001) - 1000;
      cases.push({ args: [a, b], label: `generated random #${index + 1}` });
    }
    cases.push({ args: [-1000, 1000], label: "generated exact cancellation" });
    cases.push({ args: [1000, 1000], label: "generated upper corner" });
  }

  if (slug === "reverse-integer") {
    for (let index = 0; index < 8; index += 1) {
      const x = Math.floor(random() * 2_000_000_001) - 1_000_000_000;
      cases.push({ args: [x], label: `generated random #${index + 1}` });
    }
    cases.push({ args: [INT32_MAX_VALUE], label: "generated int32 maximum" });
    cases.push({ args: [INT32_MIN_VALUE], label: "generated int32 minimum" });
  }

  if (slug === "happy-number") {
    for (let index = 0; index < 10; index += 1) {
      cases.push({
        args: [1 + Math.floor(random() * 999)],
        label: `generated random #${index + 1}`,
      });
    }
  }

  if (slug === "plus-one") {
    for (let length = 1; length <= 8; length += 1) {
      const digits = Array.from({ length }, (_, index) =>
        index === 0 && length > 1
          ? 1 + Math.floor(random() * 9)
          : Math.floor(random() * 10),
      );
      cases.push({ args: [digits], label: `generated length=${length}` });
    }
    cases.push({ args: [[0]], label: "generated zero" });
    cases.push({
      args: [Array.from({ length: 8 }, () => 9)],
      label: "generated all nines",
    });
  }

  if (slug === "spiral-matrix") {
    for (let rows = 1; rows <= 4; rows += 1) {
      for (let columns = 1; columns <= 4; columns += 1) {
        const matrix = Array.from({ length: rows }, () =>
          Array.from({ length: columns }, () => Math.floor(random() * 21) - 10),
        );
        cases.push({
          args: [matrix],
          label: `generated ${rows}x${columns}`,
        });
      }
    }
  }

  if (slug === "multiply-strings") {
    for (let index = 0; index < 8; index += 1) {
      const digits = (length: number): string =>
        String(1 + Math.floor(random() * 9)) +
        Array.from({ length: length - 1 }, () => Math.floor(random() * 10)).join("");
      cases.push({
        args: [digits(1 + Math.floor(random() * 6)), digits(1 + Math.floor(random() * 6))],
        label: `generated random #${index + 1}`,
      });
    }
    cases.push({ args: ["0", "123456"], label: "generated zero operand" });
    cases.push({ args: ["999999", "999999"], label: "generated all nines" });
  }

  if (slug === "word-search-ii") {
    const boards: string[][][] = [
      [["a", "b"], ["c", "a"]],
      [["a", "a"], ["a", "a"]],
      [["x", "y", "z"], ["a", "b", "c"]],
    ];
    for (const [index, board] of boards.entries()) {
      const letters = board.flat();
      const randomWord = (length: number): string =>
        Array.from(
          { length },
          () => letters[Math.floor(random() * letters.length)]!,
        ).join("");
      cases.push({
        args: [board, [randomWord(2), randomWord(3), randomWord(5)]],
        label: `generated board #${index + 1}`,
      });
    }
    cases.push({
      args: [[["a"]], ["a", "aa", "aaa"]],
      label: "generated single cell",
    });
  }

  if (slug === "find-the-duplicate-number") {
    for (let n = 2; n <= 8; n += 1) {
      const nums = Array.from({ length: n }, (_, value) => value + 1);
      const repeated = nums[Math.floor(random() * n)]!;
      nums.push(repeated);
      for (let index = nums.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [nums[index], nums[swap]] = [nums[swap]!, nums[index]!];
      }
      cases.push({ args: [nums], label: `generated n=${n}` });
    }
  }

  return cases;
}
