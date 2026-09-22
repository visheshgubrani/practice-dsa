import type { AuthoredProblem } from "./authoring";

export const carFleet = {
  slug: "car-fleet",
  number: 853,
  title: "Car Fleet",
  difficulty: "medium",
  tags: ["array", "stack", "sorting", "monotonic-stack", "neetcode-150"],
  statement: [
    "`n` cars drive toward `target` from miles `position[i]`, each at speed `speed[i]`. A car may not pass another: when it catches up it travels behind it at the slower speed.",
    "",
    "A fleet is one car, or several cars driving together. Return the number of fleets that arrive at `target`.",
  ].join("\n"),
  examples: [
    {
      args: [12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]],
      output: "3",
      explanation:
        "The car at 10 arrives first, the car at 8 catches the car at 5, and the car at 0 catches the car at 3 — leaving three fleets.",
    },
    {
      args: [10, [3], [3]],
      output: "1",
      explanation: "A single car is a single fleet.",
    },
    {
      args: [100, [0, 2, 4], [4, 2, 1]],
      output: "1",
      explanation:
        "The faster cars start behind the slowest one and pile up behind it, so all three arrive together.",
    },
  ],
  constraints: [
    "`n == position.length == speed.length`",
    "`1 <= n <= 10⁵`",
    "`0 < target <= 10⁶`",
    "`0 <= position[i] < target`",
    "All the values of `position` are unique.",
    "`0 < speed[i] <= 10⁶`",
  ],
  testcases: [
    {
      args: [12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]],
      expected: "3",
      note: "One catch-up in the middle, one at the back.",
    },
    {
      args: [10, [3], [3]],
      expected: "1",
      note: "Minimum: one car, one fleet.",
    },
    {
      args: [100, [0, 2, 4], [4, 2, 1]],
      expected: "1",
      note: "Everything queues behind the slowest car.",
    },
    {
      args: [10, [0, 4], [2, 1]],
      expected: "1",
      hidden: true,
      note: "a fast car starting behind catches the leader before the target",
    },
    {
      args: [10, [4, 0], [1, 2]],
      expected: "1",
      hidden: true,
      note: "the same pair with the arrays in the other order",
    },
    {
      args: [10, [5, 4], [1, 1]],
      expected: "2",
      hidden: true,
      note: "equal speeds can never close the gap",
    },
    {
      args: [10, [0, 5], [2, 1]],
      expected: "1",
      hidden: true,
      note: "an exactly simultaneous arrival is still one fleet",
    },
    {
      args: [20, [10], [1]],
      expected: "1",
      hidden: true,
      note: "a single slow car",
    },
    {
      args: [100, [99], [100]],
      expected: "1",
      hidden: true,
      note: "a car one mile from the target",
    },
    {
      args: [10, [8, 7, 6], [1, 2, 3]],
      expected: "1",
      hidden: true,
      note: "the closer a car starts, the slower it goes",
    },
    {
      args: [10, [0, 1, 2, 3, 4], [1, 1, 1, 1, 1]],
      expected: "5",
      hidden: true,
      note: "equal speeds mean every car is its own fleet",
    },
    {
      args: [10, [0, 1, 2, 3, 4, 5, 6, 7, 8], [1, 1, 1, 1, 1, 1, 1, 1, 1]],
      expected: "9",
      hidden: true,
      note: "nine cars, all travelling at the same speed",
    },
    {
      args: [1000000, [999999], [1000000]],
      expected: "1",
      hidden: true,
      note: "constraint-boundary target and speed",
    },
  ],
  starterCode: {
    python: `class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        `,
  },
  notes: {
    approach:
      "Sort the cars by position, nearest the target first. Each car's arrival time is `(target - position) / speed`, and a car catches the fleet ahead exactly when its time is no greater than that fleet's. Walking from the front, a car that arrives no later than the current fleet joins it; otherwise it starts a new fleet.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "carFleet",
    params: [
      { name: "target", kind: "int" },
      { name: "position", kind: "int[]" },
      { name: "speed", kind: "int[]" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/car-fleet/",
  reference: `class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        pair = [(p, s) for p, s in zip(position, speed)]
        pair.sort(reverse=True)
        stack = []
        for p, s in pair:  # Reverse Sorted Order
            stack.append((target - p) / s)
            if len(stack) >= 2 and stack[-1] <= stack[-2]:
                stack.pop()
        return len(stack)
`,
  rejection: `class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        pair = sorted(zip(position, speed), reverse=True)
        fleets = 0
        best_time = 0
        for p, s in pair:
            time = (target - p) / s
            # A car that arrives at exactly the same time as the fleet ahead is
            # counted as its own fleet instead of joining it.
            if time < best_time:
                continue
            fleets += 1
            best_time = time
        return fleets
`,
} satisfies AuthoredProblem;
