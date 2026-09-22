import type { AuthoredProblem } from "./authoring";

export const kokoEatingBananas = {
  slug: "koko-eating-bananas",
  number: 875,
  title: "Koko Eating Bananas",
  difficulty: "medium",
  tags: ["array", "binary-search", "neetcode-150"],
  statement: [
    "`piles[i]` bananas sit in pile `i`, and the guards return in `h` hours. Each hour Koko picks one pile and eats `k` bananas from it; if the pile has fewer than `k` left, she finishes it and stops eating for that hour.",
    "",
    "Return the smallest eating speed `k` that clears every pile within `h` hours.",
  ].join("\n"),
  examples: [
    {
      args: [[3, 6, 7, 11], 8],
      output: "4",
      explanation:
        "At `k = 4` the piles take 1, 2, 2, and 3 hours — exactly 8; at `k = 3` they would need 10.",
    },
    {
      args: [[30, 11, 23, 4, 20], 5],
      output: "30",
      explanation: "Only one hour per pile is available, so `k` must clear the largest pile at once.",
    },
    {
      args: [[30, 11, 23, 4, 20], 6],
      output: "23",
      explanation: "One spare hour lets a smaller speed work, but not one below `23`.",
    },
  ],
  constraints: [
    "`1 <= piles.length <= 10⁴`",
    "`piles.length <= h <= 10⁹`",
    "`1 <= piles[i] <= 10⁹`",
  ],
  testcases: [
    {
      args: [[3, 6, 7, 11], 8],
      expected: "4",
      note: "The hours add up exactly, so one less would not fit.",
    },
    {
      args: [[30, 11, 23, 4, 20], 5],
      expected: "30",
      note: "One hour per pile forces the speed up to the largest pile.",
    },
    {
      args: [[30, 11, 23, 4, 20], 6],
      expected: "23",
      note: "A single extra hour allows a slower speed.",
    },
    { args: [[1], 1], expected: "1", hidden: true, note: "minimum pile and one hour" },
    {
      args: [[1000000000], 1000000000],
      expected: "1",
      hidden: true,
      note: "constraint-maximum pile with an hour per banana",
    },
    { args: [[1, 1, 1], 3], expected: "1", hidden: true, note: "three piles, three hours" },
    { args: [[2], 1], expected: "2", hidden: true, note: "one pile that must be cleared in one hour" },
    {
      args: [[3, 6, 7, 11], 10],
      expected: "3",
      hidden: true,
      note: "a looser deadline lowers the speed",
    },
    {
      args: [[1000000000], 2],
      expected: "500000000",
      hidden: true,
      note: "a huge pile split across two hours",
    },
    {
      args: [[312884470], 968709470],
      expected: "1",
      hidden: true,
      note: "far more hours than bananas",
    },
    { args: [[1, 2, 3, 4, 5], 5], expected: "5", hidden: true, note: "an increasing pile set with one hour each" },
    { args: [[10, 10], 3], expected: "10", hidden: true, note: "two piles that cannot share a fractional hour" },
  ],
  starterCode: {
    python: `class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        `,
  },
  notes: {
    approach:
      "The hours needed fall as the speed rises, so the answer can be binary searched over the speeds `1 .. max(piles)`. For a candidate speed, each pile costs `ceil(pile / k)` hours and every pile costs at least one; keep the smallest speed whose total fits in `h`.",
    timeComplexity: "O(n log m)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "minEatingSpeed",
    params: [
      { name: "piles", kind: "int[]" },
      { name: "h", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/koko-eating-bananas/",
  reference: `class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        l, r = 1, max(piles)
        res = r

        while l <= r:
            k = (l + r) // 2

            totalTime = 0
            for p in piles:
                totalTime += math.ceil(float(p) / k)
            if totalTime <= h:
                res = k
                r = k - 1
            else:
                l = k + 1
        return res
`,
  rejection: `class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        # Averages the work over the available hours, ignoring that each pile
        # costs a whole hour even when it holds less than k bananas.
        total = 0
        for pile in piles:
            total += pile
        return math.ceil(total / h)
`,
} satisfies AuthoredProblem;
