import type { AuthoredProblem } from "./authoring";

const aliceOps = ["TimeMap", "set", "get", "get", "set", "get"];
const aliceArgs = [
  [],
  ["alice", "happy", 1],
  ["alice", 1],
  ["alice", 2],
  ["alice", "sad", 3],
  ["alice", 3],
];

const otherKeyOps = ["TimeMap", "set", "get", "get"];
const otherKeyArgs = [[], ["alice", "happy", 1], ["bob", 1], ["alice", 5]];

export const timeBasedKeyValueStore = {
  slug: "time-based-key-value-store",
  number: 981,
  title: "Time Based Key-Value Store",
  difficulty: "medium",
  tags: ["hash-table", "string", "binary-search", "design", "neetcode-150"],
  statement: [
    "Design a map that can store several string values for the same key, each at its own timestamp, and can recall which value was current at a given time.",
    "",
    "`TimeMap()` creates an empty map. `set(key, value, timestamp)` stores `value` for `key` at `timestamp`. `get(key, timestamp)` returns the value whose stored timestamp is the greatest one still less than or equal to `timestamp`. When no stored timestamp qualifies, `get` returns `\"\"`.",
    "",
    "Every timestamp passed to `set` is strictly greater than the timestamps already stored.",
    "",
    "Judging constructs one `TimeMap` and runs an operation script on that instance. The result is the list of return values: `null` for the constructor and for `set`, and the string returned by `get`.",
  ].join("\n"),
  examples: [
    {
      args: [aliceOps, aliceArgs],
      output: '[null,null,"happy","happy",null,"sad"]',
      explanation:
        "happy is stored at timestamp 1, so a get at 1 or 2 returns happy. sad is stored at 3, and a get at 3 returns sad.",
    },
    {
      args: [otherKeyOps, otherKeyArgs],
      output: '[null,null,"","happy"]',
      explanation:
        "bob was never stored, so that get is empty. alice at timestamp 5 still returns happy, the only value stored for her.",
    },
  ],
  constraints: [
    "`1 <= key.length, value.length <= 100`",
    "`key` and `value` contain only lowercase English letters and digits.",
    "`0 <= timestamp <= 10⁷`",
    "The timestamps passed to `set` are strictly increasing.",
    "At most `2 * 10⁵` calls are made to `set` and `get`.",
  ],
  testcases: [
    {
      args: [aliceOps, aliceArgs],
      expected: '[null,null,"happy","happy",null,"sad"]',
      note: "A missing timestamp returns the value from the greatest earlier timestamp.",
    },
    {
      args: [otherKeyOps, otherKeyArgs],
      expected: '[null,null,"","happy"]',
      note: "An unknown key is empty, and a later timestamp still sees the stored value.",
    },
    {
      args: [
        ["TimeMap", "get"],
        [[], ["alice", 1]],
      ],
      expected: '[null,""]',
      hidden: true,
      note: "A key that was never set returns an empty string.",
    },
    {
      args: [
        ["TimeMap", "set", "get"],
        [[], ["alice", "happy", 5], ["alice", 4]],
      ],
      expected: '[null,null,""]',
      hidden: true,
      note: "A timestamp before the first set returns an empty string.",
    },
    {
      args: [
        ["TimeMap", "set", "set", "get"],
        [[], ["alice", "happy", 1], ["alice", "sad", 3], ["alice", 2]],
      ],
      expected: '[null,null,null,"happy"]',
      hidden: true,
      note: "A later set does not answer an earlier timestamp.",
    },
    {
      args: [
        ["TimeMap", "set", "set", "get", "get"],
        [[], ["alice", "happy", 1], ["bob", "sad", 2], ["alice", 2], ["bob", 1]],
      ],
      expected: '[null,null,null,"happy",""]',
      hidden: true,
      note: "Two keys stay separate, and bob has nothing stored at timestamp 1.",
    },
    {
      args: [
        ["TimeMap", "set", "set", "set", "get"],
        [[], ["a", "one", 1], ["a", "two", 10], ["a", "three", 20], ["a", 15]],
      ],
      expected: '[null,null,null,null,"two"]',
      hidden: true,
      note: "A query between stored timestamps returns the previous value.",
    },
    {
      args: [
        ["TimeMap", "set", "get", "get"],
        [[], ["k", "v", 0], ["k", 0], ["k", 1]],
      ],
      expected: '[null,null,"v","v"]',
      hidden: true,
      note: "Timestamp 0 is a stored value, and a later query still sees it.",
    },
    {
      args: [
        ["TimeMap", "set", "get", "get"],
        [[], ["k", "end", 10000000], ["k", 10000000], ["k", 9999999]],
      ],
      expected: '[null,null,"end",""]',
      hidden: true,
      note: "The upper timestamp bound matches exactly and misses one below it.",
    },
    {
      args: [
        ["TimeMap", "set", "set", "get", "get"],
        [[], ["a", "x", 1], ["a", "y", 2], ["a", 2], ["a", 1]],
      ],
      expected: '[null,null,null,"y","x"]',
      hidden: true,
      note: "Each stored timestamp returns its own value.",
    },
  ],
  starterCode: {
    python: `class TimeMap:

    def __init__(self):
        

    def set(self, key: str, value: str, timestamp: int) -> None:
        

    def get(self, key: str, timestamp: int) -> str:
        `,
  },
  notes: {
    approach:
      "Keep a list of (timestamp, value) pairs for each key. set appends, and the timestamps arrive already sorted, so the list stays ordered. get binary-searches that list for the rightmost timestamp that is still less than or equal to the query, and returns its value. A search that falls off the left end means nothing was stored yet.",
    timeComplexity: "O(1) for set, O(log n) for get",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "TimeMap",
    params: [],
    returns: "void",
    calls: {
      className: "TimeMap",
      constructorParams: [],
      methods: {
        set: { params: ["string", "string", "int"], returns: "void" },
        get: { params: ["string", "int"], returns: "string" },
      },
    },
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/time-based-key-value-store/",
  reference: `class TimeMap:
    def __init__(self):
        self.store = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store.setdefault(key, []).append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        values = self.store.get(key)
        if not values:
            return ""
        left, right = 0, len(values) - 1
        answer = ""
        while left <= right:
            mid = (left + right) // 2
            if values[mid][0] <= timestamp:
                answer = values[mid][1]
                left = mid + 1
            else:
                right = mid - 1
        return answer
`,
  rejection: `class TimeMap:
    def __init__(self):
        self.latest = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.latest[key] = value

    def get(self, key: str, timestamp: int) -> str:
        return self.latest.get(key, "")
`,
} satisfies AuthoredProblem;
