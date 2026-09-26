import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareIndexPair,
  compareIntervals,
  compareOutput,
  looksLikeJsonValue,
  splitHarnessOutput,
} from "@/lib/harness/compare";

describe("compareOutput", () => {
  it("accepts reversed Two Sum indices under index_pair", () => {
    const comparison = compareOutput("[1,0]", "[0,1]", "index_pair");

    assert.equal(comparison.matches, true);
    assert.equal(comparison.detail, "index pair");
  });

  it("rejects incorrect Two Sum values under index_pair", () => {
    assert.equal(compareOutput("[0,2]", "[0,1]", "index_pair").matches, false);
    assert.equal(compareOutput("[0,1,2]", "[0,1]", "index_pair").matches, false);
  });

  it("does not treat index_pair as recursive unordered", () => {
    assert.equal(compareOutput("[2,0,1]", "[0,1,2]", "unordered").matches, true);
    assert.equal(compareOutput("[2,0,1]", "[0,1,2]", "index_pair").matches, false);
  });

  it("accepts Group Anagrams group and member permutations", () => {
    const expected = '[["bat"],["nat","tan"],["ate","eat","tea"]]';
    const actual = '[["eat","tea","ate"],["tan","nat"],["bat"]]';

    const comparison = compareOutput(actual, expected, "unordered");

    assert.equal(comparison.matches, true);
    assert.equal(comparison.detail, "unordered");
  });

  it("rejects an incorrect Group Anagrams grouping", () => {
    const expected = '[["bat"],["nat","tan"],["ate","eat","tea"]]';
    const actual = '[["eat","tea","ate","tan","nat","bat"]]';

    assert.equal(compareOutput(actual, expected, "unordered").matches, false);
  });

  it("rejects reversed Merge Intervals endpoints under intervals", () => {
    const expected = "[[1,3],[2,6],[8,10],[15,18]]";
    const reversedEndpoints = "[[3,1],[6,2],[10,8],[18,15]]";
    const reversedOrder = "[[15,18],[8,10],[2,6],[1,3]]";

    assert.equal(compareOutput(expected, expected, "intervals").matches, true);
    assert.equal(
      compareOutput(reversedEndpoints, expected, "intervals").matches,
      false,
    );
    assert.equal(
      compareOutput(reversedOrder, expected, "intervals").matches,
      false,
    );
  });

  it("does not treat intervals as recursive unordered", () => {
    const expected = "[[1,3],[2,6]]";
    const reversedEndpoints = "[[3,1],[6,2]]";

    assert.equal(
      compareOutput(reversedEndpoints, expected, "unordered").matches,
      true,
    );
    assert.equal(
      compareOutput(reversedEndpoints, expected, "intervals").matches,
      false,
    );
  });

  it("keeps ordered results ordered", () => {
    assert.equal(compareOutput("true", "true", "exact").matches, true);
    assert.equal(compareOutput("false", "true", "exact").matches, false);
    assert.equal(compareOutput("6", "9", "exact").matches, false);
  });

  it("accepts an integer against the same double", () => {
    const comparison = compareOutput("2", "2.0", "tolerance");

    assert.equal(comparison.matches, true);
    assert.equal(comparison.detail, "within 1e-5");
  });

  it("accepts an exact half", () => {
    assert.equal(compareOutput("2.5", "2.5", "tolerance").matches, true);
  });

  it("accepts a difference of 1e-5", () => {
    // "1.00001" parses a hair above the band. "0.00001" is 1e-5 itself.
    assert.equal(compareOutput("0.00001", "0", "tolerance").matches, true);
  });

  it("rejects a difference of 0.5", () => {
    const comparison = compareOutput("2", "2.5", "tolerance");

    assert.equal(comparison.matches, false);
    assert.equal(comparison.detail, "outside 1e-5");
  });
});

/**
 * A set of ordered sequences: the outer order is free, the inner order is the
 * answer. Recursive `unordered` sorts the inner arrays too, which is what these
 * three cases pin down.
 */
describe("unordered_outer", () => {
  it("accepts the pieces in any order", () => {
    const expected = "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]";
    const shuffled = "[[3,2,1],[2,3,1],[1,3,2],[3,1,2],[2,1,3],[1,2,3]]";

    const comparison = compareOutput(shuffled, expected, "unordered_outer");

    assert.equal(comparison.matches, true);
    assert.equal(comparison.detail, "unordered outer (inner order significant)");
  });

  it("rejects a permuted permutation that recursive unordered accepts", () => {
    const expected = "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]";
    const allTheSame = "[[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]]";

    assert.equal(compareOutput(allTheSame, expected, "unordered").matches, true);
    assert.equal(compareOutput(allTheSame, expected, "unordered_outer").matches, false);
    assert.equal(compareOutput(allTheSame, expected, "exact").matches, false);
  });

  it("rejects a swapped point coordinate", () => {
    assert.equal(compareOutput("[[2,1],[4,3]]", "[[1,2],[3,4]]", "unordered").matches, true);
    assert.equal(
      compareOutput("[[2,1],[4,3]]", "[[1,2],[3,4]]", "unordered_outer").matches,
      false,
    );
  });

  it("rejects a permuted palindrome partition", () => {
    assert.equal(compareOutput('[["a","ab"]]', '[["ab","a"]]', "unordered").matches, true);
    assert.equal(
      compareOutput('[["a","ab"]]', '[["ab","a"]]', "unordered_outer").matches,
      false,
    );
  });

  it("still accepts a legitimate outer-order permutation", () => {
    assert.equal(
      compareOutput("[[-1,1,0],[-1,0,1]]", "[[-1,0,1],[-1,1,0]]", "unordered_outer")
        .matches,
      true,
    );
  });

  it("falls back to exact text when a side is not JSON", () => {
    const comparison = compareOutput("not json", "[[1,2]]", "unordered_outer");

    assert.equal(comparison.matches, false);
    assert.equal(
      comparison.detail,
      "unordered outer (fell back to exact: a side was not JSON)",
    );
    assert.equal(compareOutput("[1,2]", "[1,2]", "unordered_outer").matches, true);
  });
});

describe("compareIndexPair", () => {
  it("accepts the authored Two Sum order", () => {
    assert.equal(compareIndexPair("[0,1]", "[0,1]").matches, true);
  });
});

describe("compareIntervals", () => {
  it("requires ordered endpoints", () => {
    assert.equal(
      compareIntervals("[[1,3],[8,10]]", "[[1,3],[8,10]]").matches,
      true,
    );
    assert.equal(
      compareIntervals("[[3,1],[8,10]]", "[[1,3],[8,10]]").matches,
      false,
    );
  });
});

describe("harness stdout protocol", () => {
  it("does not let debug prints corrupt comparison", () => {
    const { debug, encoded } = splitHarnessOutput("debugging\n[0,1]\n");

    assert.equal(debug, "debugging");
    assert.equal(encoded, "[0,1]");
    assert.equal(compareOutput(encoded, "[0,1]", "index_pair").matches, true);
    assert.equal(compareOutput("debugging\n[0,1]", "[0,1]", "exact").matches, false);
  });

  it("treats a trailing-only JSON line as the return value", () => {
    const { debug, encoded } = splitHarnessOutput("[0,1]\n");

    assert.equal(debug, "");
    assert.equal(encoded, "[0,1]");
  });

  it("fails closed on malformed returns", () => {
    assert.equal(looksLikeJsonValue(""), false);
    assert.equal(looksLikeJsonValue("not json"), false);
    assert.equal(looksLikeJsonValue("[0,1"), false);
    assert.equal(looksLikeJsonValue("[0,1]"), true);

    const { encoded } = splitHarnessOutput("still running\n");
    assert.equal(looksLikeJsonValue(encoded), false);
    assert.equal(compareOutput(encoded, "[0,1]", "exact").matches, false);
  });
});
