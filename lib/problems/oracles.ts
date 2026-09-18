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

  return cases;
}
