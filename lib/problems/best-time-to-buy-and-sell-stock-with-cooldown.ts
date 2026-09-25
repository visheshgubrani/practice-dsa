import type { AuthoredProblem } from "./authoring";

export const bestTimeToBuyAndSellStockWithCooldown = {
  slug: "best-time-to-buy-and-sell-stock-with-cooldown",
  number: 309,
  title: "Best Time to Buy and Sell Stock with Cooldown",
  difficulty: "medium",
  tags: ["array","dynamic-programming","neetcode-150"],
  statement: "Given a daily price list, maximize profit by buying and selling the stock. You may hold at most one share at a time. After selling, you must wait one full day before buying again.",
  examples: [
    { args: [[1,2,3,0,2]], output: "3", explanation: "Buy at 1, sell at 3, wait a day, then buy at 0 and sell at 2." },
    { args: [[1]], output: "0", explanation: "With one price there is no profitable sale." },
  ],
  constraints: [
    "1 <= prices.length <= 5000.",
    "0 <= prices[i] <= 1000.",
  ],
  testcases: [
    { args: [[1,2,3,0,2]], expected: "3", hidden: false, note: "Buy at 1, sell at 3, wait a day, then buy at 0 and sell at 2." },
    { args: [[1]], expected: "0", hidden: false, note: "With one price there is no profitable sale." },
    { args: [[2]], expected: "0", hidden: true, note: "There is no later day to sell." },
    { args: [[1,2]], expected: "1", hidden: true, note: "Buy on the first day and sell on the second." },
    { args: [[2,1]], expected: "0", hidden: true, note: "A falling price gives no positive trade." },
    { args: [[1,2,3]], expected: "2", hidden: true, note: "Buying once at 1 and selling at 3 is best." },
    { args: [[1,2,4]], expected: "3", hidden: true, note: "The best single trade earns three." },
    { args: [[3,1,4]], expected: "3", hidden: true, note: "Buy at 1 and sell at 4." },
    { args: [[1,2,3,0,2,7]], expected: "8", hidden: true, note: "Two trades can be separated by the required cooldown." },
    { args: [[1,4,2,8]], expected: "7", hidden: true, note: "Buying at 1 and selling at 8 is optimal." },
    { args: [[5,4,3,2,1]], expected: "0", hidden: true, note: "The prices only decrease, so no trade earns profit." },
  ],
  starterCode: { python: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        
` },
  notes: {
    approach: "At each day, track whether a share is held. If not holding, either wait or buy. If holding, either wait or sell; a sale advances past the cooldown day before another buy is possible.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "maxProfit",
    params: [
      { name: "prices", kind: "int[]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/",
  reference: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # State: Buying or Selling?
        # If Buy -> i + 1
        # If Sell -> i + 2

        dp = {}  # key=(i, buying) val=max_profit

        def dfs(i, buying):
            if i >= len(prices):
                return 0
            if (i, buying) in dp:
                return dp[(i, buying)]

            cooldown = dfs(i + 1, buying)
            if buying:
                buy = dfs(i + 1, not buying) - prices[i]
                dp[(i, buying)] = max(buy, cooldown)
            else:
                sell = dfs(i + 2, not buying) + prices[i]
                dp[(i, buying)] = max(sell, cooldown)
            return dp[(i, buying)]

        return dfs(0, True)
`,
  rejection: `class Solution:
    def maxProfit(self, prices):
        # Adds every upward step and ignores the cooldown after a sale.
        return sum(max(0, prices[i] - prices[i - 1]) for i in range(1, len(prices)))
`,
} satisfies AuthoredProblem;
