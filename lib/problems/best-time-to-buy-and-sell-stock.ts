import type { AuthoredProblem } from "./authoring";

export const bestTimeToBuyAndSellStock = {
  slug: "best-time-to-buy-and-sell-stock",
  number: 121,
  title: "Best Time to Buy and Sell Stock",
  difficulty: "easy",
  tags: ["array", "dynamic-programming", "neetcode-150"],
  statement: [
    "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.",
    "",
    "You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.",
    "",
    "Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
  ].join("\n"),
  examples: [
    {
      args: [[7, 1, 5, 3, 6, 4]],
      output: "5",
      explanation:
        "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5. Buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.",
    },
    {
      args: [[7, 6, 4, 3, 1]],
      output: "0",
      explanation: "The prices only fall, so no transaction is profitable.",
    },
    {
      args: [[1, 2]],
      output: "1",
      explanation: "Buy on day 1 and sell on day 2.",
    },
  ],
  constraints: [
    "`1 <= prices.length <= 10⁵`",
    "`0 <= prices[i] <= 10⁴`",
  ],
  testcases: [
    {
      args: [[7, 1, 5, 3, 6, 4]],
      expected: "5",
      note: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5. Buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.",
    },
    {
      args: [[7, 6, 4, 3, 1]],
      expected: "0",
      note: "The prices only fall, so no transaction is profitable.",
    },
    {
      args: [[1, 2]],
      expected: "1",
      note: "Buy on day 1 and sell on day 2.",
    },
    { args: [[1]], expected: "0", hidden: true, note: "minimum length, no later sell" },
    { args: [[2, 1]], expected: "0", hidden: true, note: "only a decrease" },
    {
      args: [[1, 1]],
      expected: "0",
      hidden: true,
      note: "duplicate prices, no profit",
    },
    {
      args: [[1, 2, 3, 4, 5]],
      expected: "4",
      hidden: true,
      note: "strictly increasing",
    },
    {
      args: [[2, 4, 1, 4]],
      expected: "3",
      hidden: true,
      note: "best valley is not the first",
    },
    {
      args: [[6, 1, 3, 2, 4, 7]],
      expected: "6",
      hidden: true,
      note: "buy at 1, sell at 7",
    },
    {
      args: [[0, 10_000]],
      expected: "10000",
      hidden: true,
      note: "constraint endpoints",
    },
    {
      args: [[3, 3, 5, 0, 0, 3, 1, 4]],
      expected: "4",
      hidden: true,
      note: "zeros then a late peak",
    },
  ],
  starterCode: {
    python: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "One pass keeps the lowest price seen so far and the best profit of selling today against that floor. Updating the floor after the profit check is what enforces buy-before-sell without a second loop.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "maxProfit",
    params: [{ name: "prices", kind: "int[]" }],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
  reference: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        lowest = prices[0]
        best = 0
        for price in prices[1:]:
            best = max(best, price - lowest)
            lowest = min(lowest, price)
        return best
`,
} satisfies AuthoredProblem;
