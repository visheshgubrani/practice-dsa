import { COMPARE_MODES, type CompareMode } from "@/lib/problems";

/**
 * How a program's stdout becomes a verdict.
 *
 * Comparison happens on the server against the harness's serialized return, so
 * it has to be tolerant of a trailing newline and strict about everything else.
 * Debug prints are stripped first (`splitHarnessOutput`); they never enter
 * these functions.
 */

export { COMPARE_MODES };
export type { CompareMode };

/** `exact` unless the testcase or its problem says otherwise. */
export function resolveCompare(
  testcaseCompare: CompareMode | undefined,
  problemCompare: CompareMode | undefined,
): CompareMode {
  return testcaseCompare ?? problemCompare ?? "exact";
}

export type Comparison = {
  matches: boolean;
  /** How the two sides were compared, for the console's account of a failure. */
  detail: string;
};

/**
 * Recursively sorts every array so two results that differ only in order
 * canonicalize to the same string.
 *
 * Inner arrays are sorted first, so a list of groups is compared as a *set of
 * sets* — which is exactly what "in any order" means for `group-anagrams`.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize).sort(compareEntries);
  }
  return value;
}

function compareEntries(left: unknown, right: unknown): number {
  const a = JSON.stringify(left) ?? "";
  const b = JSON.stringify(right) ?? "";
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Both sides as comparable JSON, or null when either is not JSON. */
function asJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function compareOutput(
  stdout: string,
  expected: string,
  mode: CompareMode,
): Comparison {
  switch (mode) {
    case "index_pair":
      return compareIndexPair(stdout, expected);
    case "intervals":
      return compareIntervals(stdout, expected);
    case "exact": {
      const actual = stdout.trim();
      const wanted = expected.trim();
      return {
        matches: actual === wanted,
        detail: "exact text",
      };
    }
    case "unordered": {
      const actual = stdout.trim();
      const wanted = expected.trim();
      const actualValue = asJson(actual);
      const wantedValue = asJson(wanted);

      if (actualValue === undefined || wantedValue === undefined) {
        return {
          matches: actual === wanted,
          detail: "unordered (fell back to exact: a side was not JSON)",
        };
      }

      return {
        matches:
          JSON.stringify(canonicalize(actualValue)) ===
          JSON.stringify(canonicalize(wantedValue)),
        detail: "unordered",
      };
    }
  }
}

/**
 * Unique-answer index pair: the two values may appear in either order.
 *
 * Two Sum's statement allows `[0,1]` or `[1,0]`. Recursive `unordered` would
 * also accept longer permutations, so this stays a dedicated mode.
 */
export function compareIndexPair(stdout: string, expected: string): Comparison {
  const actualValue = asJson(stdout.trim());
  const wantedValue = asJson(expected.trim());

  if (!isIndexPair(actualValue) || !isIndexPair(wantedValue)) {
    return {
      matches: stdout.trim() === expected.trim(),
      detail: "index pair (fell back to exact: a side was not a two-element array)",
    };
  }

  const matches =
    JSON.stringify([...actualValue].sort(compareEntries)) ===
    JSON.stringify([...wantedValue].sort(compareEntries));

  return { matches, detail: "index pair" };
}

function isIndexPair(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2;
}

/**
 * Merge Intervals: a list of `[start, end]` pairs in ascending order, with
 * endpoints already ordered. Neither the pairs nor the endpoints are sorted
 * before comparison — reversed endpoints and a shuffled list both fail.
 */
export function compareIntervals(stdout: string, expected: string): Comparison {
  const actualValue = asJson(stdout.trim());
  const wantedValue = asJson(expected.trim());

  if (!isIntervalList(actualValue) || !isIntervalList(wantedValue)) {
    return {
      matches: stdout.trim() === expected.trim(),
      detail:
        "intervals (fell back to exact: a side was not a list of [start, end] pairs)",
    };
  }

  return {
    matches: JSON.stringify(actualValue) === JSON.stringify(wantedValue),
    detail: "intervals (ordered endpoints, ascending order)",
  };
}

function isIntervalList(value: unknown): value is [unknown, unknown][] {
  return (
    Array.isArray(value) &&
    value.every((entry) => Array.isArray(entry) && entry.length === 2)
  );
}

/**
 * Harness stdout protocol: debug prints may precede the serialized return.
 *
 * The last non-empty line is the answer; everything above it is debug. The
 * Python harness captures `print()` during the solution call and emits this
 * shape: debug text (if any), then one JSON line.
 */
export function splitHarnessOutput(stdout: string): {
  debug: string;
  encoded: string;
} {
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return { debug: "", encoded: "" };
  }

  return {
    debug: lines.slice(0, -1).join("\n"),
    encoded: lines[lines.length - 1] ?? "",
  };
}

/**
 * Whether a program's stdout is a value the runner can compare at all.
 *
 * After the harness split, this is the last line — a stray `print` no longer
 * lives here. A malformed return still fails closed.
 */
export function looksLikeJsonValue(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  return asJson(trimmed) !== undefined;
}
