import type { AuthoredProblem } from "./authoring";

export const topKFrequentElements = {
  slug: "top-k-frequent-elements",
  number: 347,
  title: "Top K Frequent Elements",
  difficulty: "medium",
  tags: [
    "array",
    "hash-table",
    "divide-and-conquer",
    "sorting",
    "heap-priority-queue",
    "bucket-sort",
    "counting",
    "quickselect",
    "neetcode-150",
  ],
  statement: [
    "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements.",
    "",
    "The answer may be returned in any order. The tests are generated so that the answer is unique.",
  ].join("\n"),
  examples: [
    {
      args: [[1, 1, 1, 2, 2, 3], 2],
      output: "[1,2]",
      explanation:
        "`1` appears three times and `2` twice, so both belong to the two most frequent elements.",
    },
    {
      args: [[1], 1],
      output: "[1]",
      explanation: "The single element is trivially the most frequent one.",
    },
    {
      args: [[1, 2, 1, 2, 1, 2, 3, 1, 3, 2], 2],
      output: "[1,2]",
      explanation:
        "`1` and `2` both appear four times, so both are in the answer even though `3` also repeats.",
    },
  ],
  constraints: [
    "`1 <= nums.length <= 10⁵`",
    "`-10⁴ <= nums[i] <= 10⁴`",
    "`k` is in the range `[1, the number of unique elements in the array]`.",
    "It is guaranteed that the answer is unique.",
  ],
  testcases: [
    {
      args: [[1, 1, 1, 2, 2, 3], 2],
      expected: "[1,2]",
      note: "`1` appears three times and `2` twice, both in the two most frequent.",
    },
    {
      args: [[1], 1],
      expected: "[1]",
      note: "Minimum length: one element is the most frequent one.",
    },
    {
      args: [[1, 2, 1, 2, 1, 2, 3, 1, 3, 2], 2],
      expected: "[1,2]",
      note: "Two values tie for the top, so both are returned.",
    },
    { args: [[0], 1], expected: "[0]", hidden: true, note: "single value, `k = 1`" },
    {
      args: [[7], 1],
      expected: "[7]",
      hidden: true,
      note: "single occurrence of a non-zero value",
    },
    {
      args: [[-1, -1, -2], 1],
      expected: "[-1]",
      hidden: true,
      note: "negative values, one repeat",
    },
    {
      args: [[10000, -10000, 10000], 1],
      expected: "[10000]",
      hidden: true,
      note: "constraint-max magnitude, distinct counts",
    },
    {
      args: [[1, 1, 2, 2, 3], 2],
      expected: "[1,2]",
      hidden: true,
      note: "a tie for the top two, nothing else close",
    },
    {
      args: [[1, 1, 1, 2, 2, 3], 3],
      expected: "[1,2,3]",
      hidden: true,
      note: "`k` equals the number of unique elements",
    },
    {
      args: [[1, 1, 2, 2, 3, 3, 3], 1],
      expected: "[3]",
      hidden: true,
      note: "`k = 1` where the answer is the least obvious value",
    },
    {
      args: [[1, 2, 3, 4, 5], 5],
      expected: "[1,2,3,4,5]",
      hidden: true,
      note: "all counts equal, `k` covers every element",
    },
    {
      args: [[1, 1, 1, 1, 2, 2, 2, 3, 3, 4], 2],
      expected: "[1,2]",
      hidden: true,
      note: "four distinct values with descending counts",
    },
  ],
  starterCode: {
    python: `class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        `,
  },
  notes: {
    approach:
      "Count each value, then place values in buckets indexed by their count: a value seen `c` times goes into bucket `c`, and no count can exceed the length of the array. Walk the buckets from the highest count downward, collecting values until `k` of them have been taken. That avoids sorting the distinct values, which is the follow-up's point.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "topKFrequent",
    params: [
      { name: "nums", kind: "int[]" },
      { name: "k", kind: "int" },
    ],
    returns: "int[]",
  },
  // The statement allows any order and the tests make the *set* unique, so only
  // the set of k values is compared.
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/top-k-frequent-elements/",
  reference: `class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        count = {}
        freq = [[] for i in range(len(nums) + 1)]

        for n in nums:
            count[n] = 1 + count.get(n, 0)
        for n, c in count.items():
            freq[c].append(n)

        res = []
        for i in range(len(freq) - 1, 0, -1):
            res += freq[i]
            if len(res) == k:
                return res
`,
  rejection: `class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        count = {}
        for n in nums:
            count[n] = 1 + count.get(n, 0)
        # Sorted the wrong way round: returns the k *least* frequent values.
        ranked = sorted(count.items(), key=lambda pair: pair[1])
        return [value for value, _ in ranked[:k]]
`,
} satisfies AuthoredProblem;
