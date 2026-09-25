import type { AuthoredProblem } from "./authoring";

export const coinChangeIi = {
  slug: "coin-change-ii",
  number: 518,
  title: "Coin Change II",
  difficulty: "medium",
  tags: ["array","dynamic-programming","knapsack-problem","complete-knapsack","neetcode-150"],
  statement: "Return the number of combinations that make amount using the given coin denominations. You may use each denomination any number of times, and combinations with the same counts in a different order are counted once.",
  examples: [
    { args: [5,[1,2,5]], output: "4", explanation: "The combinations are five 1s; three 1s and one 2; one 1 and two 2s; or one 5." },
    { args: [3,[2]], output: "0", explanation: "No combination of 2-value coins makes 3." },
    { args: [10,[10]], output: "1", explanation: "One coin of value 10 makes the amount." },
  ],
  constraints: [
    "0 <= amount <= 5000.",
    "1 <= coins.length <= 300.",
    "1 <= coins[i] <= 5000; denominations are unique.",
  ],
  testcases: [
    { args: [5,[1,2,5]], expected: "4", hidden: false, note: "The combinations are five 1s; three 1s and one 2; one 1 and two 2s; or one 5." },
    { args: [3,[2]], expected: "0", hidden: false, note: "No combination of 2-value coins makes 3." },
    { args: [10,[10]], expected: "1", hidden: false, note: "One coin of value 10 makes the amount." },
    { args: [0,[1,2]], expected: "1", hidden: true, note: "The empty selection is the only way to make zero." },
    { args: [1,[2,3]], expected: "0", hidden: true, note: "Neither denomination fits the amount." },
    { args: [4,[1,2]], expected: "3", hidden: true, note: "The combinations are four 1s, two 1s with one 2, or two 2s." },
    { args: [5,[1,2,3]], expected: "5", hidden: true, note: "There are five unordered combinations of these denominations." },
    { args: [8,[2,3,5]], expected: "3", hidden: true, note: "The combinations are four 2s, one 2 with two 3s, or 3 plus 5." },
    { args: [7,[2,4]], expected: "0", hidden: true, note: "Even denominations cannot sum to an odd amount." },
    { args: [6,[1,3,4]], expected: "4", hidden: true, note: "The combinations are six 1s, three 1s plus 3, two 3s, or two 1s plus 4." },
    { args: [10,[3,5]], expected: "1", hidden: true, note: "Only two 5-value coins make 10." },
  ],
  starterCode: { python: `class Solution:
    def change(self, amount: int, coins: list[int]) -> int:
        
` },
  notes: {
    approach: "Process one denomination at a time. For each amount, count the ways that omit this denomination plus the ways that use one coin of it and continue from the same denomination.",
    timeComplexity: "O(amount × number of denominations)",
    spaceComplexity: "O(amount)",
  },
  signature: {
    name: "change",
    params: [
      { name: "amount", kind: "int" },
      { name: "coins", kind: "int[]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/coin-change-ii/",
  reference: `class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        # MEMOIZATION
        # Time: O(n*m)
        # Memory: O(n*m)
        cache = {}

        def dfs(i, a):
            if a == amount:
                return 1
            if a > amount:
                return 0
            if i == len(coins):
                return 0
            if (i, a) in cache:
                return cache[(i, a)]

            cache[(i, a)] = dfs(i, a + coins[i]) + dfs(i + 1, a)
            return cache[(i, a)]

        return dfs(0, 0)

        # DYNAMIC PROGRAMMING
        # Time: O(n*m)
        # Memory: O(n*m)
        dp = [[0] * (len(coins) + 1) for i in range(amount + 1)]
        dp[0] = [1] * (len(coins) + 1)
        for a in range(1, amount + 1):
            for i in range(len(coins) - 1, -1, -1):
                dp[a][i] = dp[a][i + 1]
                if a - coins[i] >= 0:
                    dp[a][i] += dp[a - coins[i]][i]
        return dp[amount][0]

        # DYNAMIC PROGRAMMING
        # Time: O(n*m)
        # Memory: O(n) where n = amount
        dp = [0] * (amount + 1)
        dp[0] = 1
        for i in range(len(coins) - 1, -1, -1):
            nextDP = [0] * (amount + 1)
            nextDP[0] = 1

            for a in range(1, amount + 1):
                nextDP[a] = dp[a]
                if a - coins[i] >= 0:
                    nextDP[a] += nextDP[a - coins[i]]
            dp = nextDP
        return dp[amount]
`,
  rejection: `class Solution:
    def change(self, amount, coins):
        # Counts ordered sequences, so swapping two different coins is counted again.
        dp = [0] * (amount + 1)
        dp[0] = 1
        for total in range(1, amount + 1):
            for coin in coins:
                if total >= coin:
                    dp[total] += dp[total - coin]
        return dp[amount]
`,
} satisfies AuthoredProblem;
