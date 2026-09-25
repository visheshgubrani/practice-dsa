/** Independent small-input checks for the 1-D dynamic-programming batch. */
import type { ArgValue } from "@/lib/harness/args";

const encode = (value: unknown): string => JSON.stringify(value);

function numbers(value: unknown, limit = 40): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > limit) return null;
  if (!value.every((item) => typeof item === "number" && Number.isInteger(item))) return null;
  return value as number[];
}

function stringValue(value: unknown, limit = 40): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= limit ? value : null;
}

function climbingStairs(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 45) return null;
  const memo = new Map<number, number>([[0, 1], [1, 1]]);
  const count = (remaining: number): number => {
    const cached = memo.get(remaining);
    if (cached !== undefined) return cached;
    const answer = count(remaining - 1) + count(remaining - 2);
    memo.set(remaining, answer);
    return answer;
  };
  return encode(count(n));
}

/** Enumerates possible routes rather than using the reference's in-place DP. */
function minCostStairs(args: readonly ArgValue[]): string | null {
  const cost = numbers(args[0]);
  if (!cost || cost.length < 2) return null;
  const visit = (index: number): number =>
    index >= cost.length ? 0 : cost[index]! + Math.min(visit(index + 1), visit(index + 2));
  return encode(Math.min(visit(0), visit(1)));
}

function robbery(nums: number[], circular: boolean): number {
  let best = 0;
  for (let mask = 0; mask < 2 ** nums.length; mask += 1) {
    let total = 0;
    let valid = true;
    for (let index = 0; index < nums.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      if (index > 0 && (mask & (1 << (index - 1))) !== 0) valid = false;
      total += nums[index]!;
    }
    if (circular && nums.length > 1 && (mask & 1) !== 0 && (mask & (1 << (nums.length - 1))) !== 0) valid = false;
    if (valid) best = Math.max(best, total);
  }
  return best;
}

function houseRobber(args: readonly ArgValue[], circular: boolean): string | null {
  const nums = numbers(args[0], 20);
  return nums ? encode(robbery(nums, circular)) : null;
}

function isPalindrome(value: string): boolean {
  for (let left = 0, right = value.length - 1; left < right; left += 1, right -= 1) {
    if (value[left] !== value[right]) return false;
  }
  return true;
}

/** Checks every candidate substring, independent of center expansion. */
function longestPalindrome(args: readonly ArgValue[]): string | null {
  const s = stringValue(args[0]);
  if (!s) return null;
  let best = "";
  for (let left = 0; left < s.length; left += 1) {
    for (let right = left; right < s.length; right += 1) {
      const candidate = s.slice(left, right + 1);
      if (candidate.length > best.length && isPalindrome(candidate)) best = candidate;
    }
  }
  return encode(best);
}

function palindromeCount(args: readonly ArgValue[]): string | null {
  const s = stringValue(args[0]);
  if (!s) return null;
  let count = 0;
  for (let left = 0; left < s.length; left += 1) {
    for (let right = left; right < s.length; right += 1) {
      if (isPalindrome(s.slice(left, right + 1))) count += 1;
    }
  }
  return encode(count);
}

function decodeWays(args: readonly ArgValue[]): string | null {
  const s = stringValue(args[0], 45);
  if (!s || !/^[0-9]+$/.test(s)) return null;
  const memo = new Map<number, number>();
  const count = (index: number): number => {
    if (index === s.length) return 1;
    if (s[index] === "0") return 0;
    const cached = memo.get(index);
    if (cached !== undefined) return cached;
    let answer = count(index + 1);
    if (index + 1 < s.length) {
      const pair = Number(s.slice(index, index + 2));
      if (pair >= 10 && pair <= 26) answer += count(index + 2);
    }
    memo.set(index, answer);
    return answer;
  };
  return encode(count(0));
}

/** Breadth-first search over amounts instead of the reference's DP table. */
function coinChange(args: readonly ArgValue[]): string | null {
  const coins = args[0];
  const amount = args[1];
  if (
    !Array.isArray(coins) ||
    coins.length === 0 ||
    coins.length > 12 ||
    !coins.every((coin) => typeof coin === "number" && Number.isInteger(coin) && coin > 0) ||
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 0 ||
    amount > 10000
  ) return null;
  if (amount === 0) return encode(0);
  const distance = Array.from({ length: amount + 1 }, () => -1);
  const queue = [0];
  distance[0] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    for (const coin of coins as number[]) {
      const next = current + coin;
      if (next > amount || distance[next] !== -1) continue;
      distance[next] = distance[current]! + 1;
      if (next === amount) return encode(distance[next]);
      queue.push(next);
    }
  }
  return encode(-1);
}

function maximumProduct(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0]);
  if (!nums) return null;
  let best = Number.NEGATIVE_INFINITY;
  for (let left = 0; left < nums.length; left += 1) {
    let product = 1;
    for (let right = left; right < nums.length; right += 1) {
      product *= nums[right]!;
      best = Math.max(best, product);
    }
  }
  return encode(best);
}

function wordBreak(args: readonly ArgValue[]): string | null {
  const s = stringValue(args[0]);
  const words = args[1];
  if (!s || !Array.isArray(words) || !words.every((word) => typeof word === "string")) return null;
  const dictionary = new Set(words as string[]);
  const memo = new Map<number, boolean>();
  const canSplit = (index: number): boolean => {
    if (index === s.length) return true;
    const cached = memo.get(index);
    if (cached !== undefined) return cached;
    for (const word of dictionary) {
      if (s.startsWith(word, index) && canSplit(index + word.length)) {
        memo.set(index, true);
        return true;
      }
    }
    memo.set(index, false);
    return false;
  };
  return encode(canSplit(0));
}

/** Enumerates subsequences by mask, independent of patience sorting. */
function longestIncreasingSubsequence(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0], 20);
  if (!nums) return null;
  let best = 0;
  for (let mask = 1; mask < 2 ** nums.length; mask += 1) {
    let previous = Number.NEGATIVE_INFINITY;
    let length = 0;
    let increasing = true;
    for (let index = 0; index < nums.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      const value = nums[index]!;
      if (value <= previous) {
        increasing = false;
        break;
      }
      previous = value;
      length += 1;
    }
    if (increasing) best = Math.max(best, length);
  }
  return encode(best);
}

function equalPartition(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0], 20);
  if (!nums || nums.some((value) => value < 0)) return null;
  const total = nums.reduce((sum, value) => sum + value, 0);
  if (total % 2 !== 0) return encode(false);
  const target = total / 2;
  for (let mask = 0; mask < 2 ** nums.length; mask += 1) {
    let sum = 0;
    for (let index = 0; index < nums.length; index += 1) {
      if ((mask & (1 << index)) !== 0) sum += nums[index]!;
    }
    if (sum === target) return encode(true);
  }
  return encode(false);
}


// ---------------------------------------------------------------------------
// 2-D Dynamic Programming batch
// Small, independent enumerators used as a second check alongside references.
// ---------------------------------------------------------------------------

function uniquePathsOracle(args: readonly ArgValue[]): string | null {
  const [m, n] = args;
  if (typeof m !== "number" || typeof n !== "number" || m < 1 || n < 1 || m > 8 || n > 8) return null;
  const visit = (row: number, col: number): number => {
    if (row === m - 1 && col === n - 1) return 1;
    return (row + 1 < m ? visit(row + 1, col) : 0) + (col + 1 < n ? visit(row, col + 1) : 0);
  };
  return encode(visit(0, 0));
}

/** Enumerates subsequences of the shorter input rather than filling a DP table. */
function longestCommonSubsequenceOracle(args: readonly ArgValue[]): string | null {
  const first = stringValue(args[0], 12);
  const second = stringValue(args[1], 12);
  if (!first || !second) return null;
  const [shorter, longer] = first.length <= second.length ? [first, second] : [second, first];
  let best = 0;
  for (let mask = 0; mask < 2 ** shorter.length; mask += 1) {
    let candidate = "";
    for (let i = 0; i < shorter.length; i += 1) {
      if ((mask & (1 << i)) !== 0) candidate += shorter[i];
    }
    if (candidate.length <= best) continue;
    let cursor = 0;
    for (const char of longer) if (char === candidate[cursor]) cursor += 1;
    if (cursor === candidate.length) best = candidate.length;
  }
  return encode(best);
}

/** Enumerates buy, wait, and sell decisions directly for short price sequences. */
function stockCooldownOracle(args: readonly ArgValue[]): string | null {
  const prices = numbers(args[0], 10);
  if (!prices || prices.some((price) => price < 0)) return null;
  const visit = (day: number, holding: boolean): number => {
    if (day >= prices.length) return 0;
    if (holding) return Math.max(visit(day + 1, true), prices[day]! + visit(day + 2, false));
    return Math.max(visit(day + 1, false), -prices[day]! + visit(day + 1, true));
  };
  return encode(visit(0, false));
}

/** Enumerates how many of each denomination is used, so coin order is irrelevant. */
function coinChangeIiOracle(args: readonly ArgValue[]): string | null {
  const amount = args[0];
  const coins = numbers(args[1], 12);
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > 50 || !coins || coins.some((coin) => coin <= 0)) return null;
  const count = (index: number, remaining: number): number => {
    if (remaining === 0) return 1;
    if (index === coins.length) return 0;
    let ways = 0;
    for (let next = remaining; next >= 0; next -= coins[index]!) ways += count(index + 1, next);
    return ways;
  };
  return encode(count(0, amount));
}

function targetSumOracle(args: readonly ArgValue[]): string | null {
  const values = numbers(args[0], 18);
  const target = args[1];
  if (!values || values.length === 0 || values.some((value) => value < 0) || typeof target !== "number") return null;
  const visit = (index: number, total: number): number => {
    if (index === values.length) return total === target ? 1 : 0;
    return visit(index + 1, total + values[index]!) + visit(index + 1, total - values[index]!);
  };
  return encode(visit(0, 0));
}

/** Tries every legal next source character, without memoizing prefix states. */
function interleavingStringOracle(args: readonly ArgValue[]): string | null {
  const [s1, s2, s3] = args;
  if (typeof s1 !== "string" || typeof s2 !== "string" || typeof s3 !== "string" || s1.length + s2.length > 16) return null;
  if (s1.length + s2.length !== s3.length) return encode(false);
  const visit = (i: number, j: number): boolean => {
    const next = i + j;
    if (next === s3.length) return true;
    return (i < s1.length && s1[i] === s3[next] && visit(i + 1, j)) ||
      (j < s2.length && s2[j] === s3[next] && visit(i, j + 1));
  };
  return encode(visit(0, 0));
}

function matrixForOracle(value: unknown, maxCells: number): number[][] | null {
  if (!Array.isArray(value) || value.length === 0 || !Array.isArray(value[0]) || value[0].length === 0) return null;
  const width = value[0].length;
  if (value.length * width > maxCells) return null;
  if (!value.every((row) => Array.isArray(row) && row.length === width && row.every((cell) => typeof cell === "number" && Number.isInteger(cell)))) return null;
  return value as number[][];
}

/** Enumerates increasing paths in the tiny DAG directly, with no path cache. */
function longestIncreasingPathOracle(args: readonly ArgValue[]): string | null {
  const matrix = matrixForOracle(args[0], 16);
  if (!matrix) return null;
  const rows = matrix.length;
  const cols = matrix[0]!.length;
  const visit = (r: number, c: number): number => {
    let best = 1;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && matrix[nr]![nc]! > matrix[r]![c]!) {
        best = Math.max(best, 1 + visit(nr, nc));
      }
    }
    return best;
  };
  let best = 0;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) best = Math.max(best, visit(r, c));
  return encode(best);
}

/** Counts position masks; equal-character choices at different indices remain distinct. */
function distinctSubsequencesOracle(args: readonly ArgValue[]): string | null {
  const source = stringValue(args[0], 14);
  const target = typeof args[1] === "string" && args[1].length <= 14 ? args[1] : null;
  if (!source || target === null) return null;
  let count = 0;
  for (let mask = 0; mask < 2 ** source.length; mask += 1) {
    let candidate = "";
    for (let i = 0; i < source.length; i += 1) if ((mask & (1 << i)) !== 0) candidate += source[i];
    if (candidate === target) count += 1;
  }
  return encode(count);
}

/** BFS over actual edit operations rather than the edit-distance recurrence. */
function editDistanceOracle(args: readonly ArgValue[]): string | null {
  const [start, target] = args;
  if (typeof start !== "string" || typeof target !== "string" || start.length > 6 || target.length > 6) return null;
  const alphabet = [...new Set(target)];
  const queue: Array<[string, number]> = [[start, 0]];
  const seen = new Set([start]);
  for (let head = 0; head < queue.length; head += 1) {
    const [current, distance] = queue[head]!;
    if (current === target) return encode(distance);
    const nextValues = new Set<string>();
    for (let i = 0; i < current.length; i += 1) nextValues.add(current.slice(0, i) + current.slice(i + 1));
    for (let i = 0; i < current.length; i += 1) {
      for (const char of alphabet) if (current[i] !== char) nextValues.add(current.slice(0, i) + char + current.slice(i + 1));
    }
    if (current.length < Math.max(start.length, target.length)) {
      for (let i = 0; i <= current.length; i += 1) {
        for (const char of alphabet) nextValues.add(current.slice(0, i) + char + current.slice(i));
      }
    }
    for (const next of nextValues) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([next, distance + 1]);
    }
  }
  return null;
}

/** Tries every burst order for small balloon sets; state is the set still present. */
function burstBalloonsOracle(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0], 9);
  if (!nums || nums.length === 0 || nums.some((value) => value < 0)) return null;
  const full = (1 << nums.length) - 1;
  const memo = new Map<number, number>();
  const best = (mask: number): number => {
    if (mask === full) return 0;
    const cached = memo.get(mask);
    if (cached !== undefined) return cached;
    let answer = 0;
    for (let i = 0; i < nums.length; i += 1) {
      if ((mask & (1 << i)) !== 0) continue;
      let left = 1;
      let right = 1;
      for (let j = i - 1; j >= 0; j -= 1) if ((mask & (1 << j)) === 0) { left = nums[j]!; break; }
      for (let j = i + 1; j < nums.length; j += 1) if ((mask & (1 << j)) === 0) { right = nums[j]!; break; }
      answer = Math.max(answer, left * nums[i]! * right + best(mask | (1 << i)));
    }
    memo.set(mask, answer);
    return answer;
  };
  return encode(best(0));
}

/** Exhaustively tries the zero-use or consume choices for each starred atom. */
function regexMatchingOracle(args: readonly ArgValue[]): string | null {
  const [s, p] = args;
  if (typeof s !== "string" || typeof p !== "string" || s.length > 12 || p.length > 12) return null;
  const visit = (i: number, j: number): boolean => {
    if (j === p.length) return i === s.length;
    const matches = i < s.length && (p[j] === "." || p[j] === s[i]);
    if (j + 1 < p.length && p[j + 1] === "*") {
      return visit(i, j + 2) || (matches && visit(i + 1, j));
    }
    return matches && visit(i + 1, j + 1);
  };
  return encode(visit(0, 0));
}

export function dynamicProgrammingOracleAnswer(
  slug: string,
  args: readonly ArgValue[],
): string | null {
  switch (slug) {
    case "climbing-stairs": return climbingStairs(args);
    case "min-cost-climbing-stairs": return minCostStairs(args);
    case "house-robber": return houseRobber(args, false);
    case "house-robber-ii": return houseRobber(args, true);
    case "longest-palindromic-substring": return longestPalindrome(args);
    case "palindromic-substrings": return palindromeCount(args);
    case "decode-ways": return decodeWays(args);
    case "coin-change": return coinChange(args);
    case "maximum-product-subarray": return maximumProduct(args);
    case "word-break": return wordBreak(args);
    case "longest-increasing-subsequence": return longestIncreasingSubsequence(args);
    case "partition-equal-subset-sum": return equalPartition(args);
    case "unique-paths": return uniquePathsOracle(args);
    case "longest-common-subsequence": return longestCommonSubsequenceOracle(args);
    case "best-time-to-buy-and-sell-stock-with-cooldown": return stockCooldownOracle(args);
    case "coin-change-ii": return coinChangeIiOracle(args);
    case "target-sum": return targetSumOracle(args);
    case "interleaving-string": return interleavingStringOracle(args);
    case "longest-increasing-path-in-a-matrix": return longestIncreasingPathOracle(args);
    case "distinct-subsequences": return distinctSubsequencesOracle(args);
    case "edit-distance": return editDistanceOracle(args);
    case "burst-balloons": return burstBalloonsOracle(args);
    case "regular-expression-matching": return regexMatchingOracle(args);
    default: return null;
  }
}
