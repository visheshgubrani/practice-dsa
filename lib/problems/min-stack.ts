import type { AuthoredProblem } from "./authoring";

const officialOps = [
  "MinStack",
  "push",
  "push",
  "push",
  "getMin",
  "pop",
  "top",
  "getMin",
];

export const minStack = {
  slug: "min-stack",
  number: 155,
  title: "Min Stack",
  difficulty: "medium",
  tags: ["stack", "design", "neetcode-150"],
  statement: [
    "Design a stack that can push a value, pop the top value, read the top value, and read the minimum value currently in the stack.",
    "",
    "`MinStack()` creates an empty stack. `push(val)` adds `val`. `pop()` removes the top value. `top()` returns the top value. `getMin()` returns the smallest value still in the stack.",
    "",
    "Each of those operations runs in O(1) time. `pop`, `top`, and `getMin` are only called when the stack is not empty.",
    "",
    "Judging constructs one `MinStack` and runs an operation script on that instance. The result is the list of return values: `null` for the constructor, `push`, and `pop`, and the integer returned by `top` and `getMin`.",
  ].join("\n"),
  examples: [
    {
      args: [officialOps, [[], [-2], [0], [-3], [], [], [], []]],
      output: "[null,null,null,null,-3,null,0,-2]",
      explanation:
        "After pushing -2, 0, and -3, the minimum is -3. Popping removes -3, so the top is 0 and the minimum is -2 again.",
    },
    {
      args: [
        ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"],
        [[], [1], [2], [0], [], [], [], []],
      ],
      output: "[null,null,null,null,0,null,2,1]",
      explanation:
        "Pushing 0 makes it the minimum. After it is popped, the top is 2 and the minimum is 1.",
    },
  ],
  constraints: [
    "`-2³¹ <= val <= 2³¹ - 1`",
    "`pop`, `top`, and `getMin` are called only on a non-empty stack.",
    "At most `3 * 10⁴` calls are made to `push`, `pop`, `top`, and `getMin`.",
  ],
  testcases: [
    {
      args: [officialOps, [[], [-2], [0], [-3], [], [], [], []]],
      expected: "[null,null,null,null,-3,null,0,-2]",
      note: "The minimum is the last push, then the earlier minimum returns after pop.",
    },
    {
      args: [
        ["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"],
        [[], [1], [2], [0], [], [], [], []],
      ],
      expected: "[null,null,null,null,0,null,2,1]",
      note: "A later smaller value is the minimum until it is popped.",
    },
    {
      args: [
        ["MinStack", "push", "top", "getMin"],
        [[], [5], [], []],
      ],
      expected: "[null,null,5,5]",
      hidden: true,
      note: "One value is both the top and the minimum.",
    },
    {
      args: [
        ["MinStack", "push", "push", "getMin", "pop", "getMin", "top"],
        [[], [1], [0], [], [], [], []],
      ],
      expected: "[null,null,null,0,null,1,1]",
      hidden: true,
      note: "Popping the current minimum restores the previous one.",
    },
    {
      args: [
        ["MinStack", "push", "push", "push", "getMin", "pop", "getMin", "pop", "getMin"],
        [[], [2], [1], [1], [], [], [], [], []],
      ],
      expected: "[null,null,null,null,1,null,1,null,2]",
      hidden: true,
      note: "A duplicated minimum stays after one of the copies is popped.",
    },
    {
      args: [
        ["MinStack", "push", "push", "push", "pop", "getMin", "top"],
        [[], [3], [1], [4], [], [], []],
      ],
      expected: "[null,null,null,null,null,1,1]",
      hidden: true,
      note: "Popping a larger value leaves the minimum in place.",
    },
    {
      args: [
        ["MinStack", "push", "getMin", "top"],
        [[], [-2147483648], [], []],
      ],
      expected: "[null,null,-2147483648,-2147483648]",
      hidden: true,
      note: "The lower int32 bound.",
    },
    {
      args: [
        ["MinStack", "push", "push", "getMin", "pop", "getMin"],
        [[], [2147483647], [-2147483648], [], [], []],
      ],
      expected: "[null,null,null,-2147483648,null,2147483647]",
      hidden: true,
      note: "The upper int32 bound sits under the lower bound, then becomes the minimum.",
    },
    {
      args: [
        ["MinStack", "push", "push", "pop", "getMin", "top"],
        [[], [7], [7], [], [], []],
      ],
      expected: "[null,null,null,null,7,7]",
      hidden: true,
      note: "Two equal values: popping one leaves the other as the minimum.",
    },
    {
      args: [
        ["MinStack", "push", "push", "push", "pop", "pop", "getMin", "top"],
        [[], [1], [2], [3], [], [], [], []],
      ],
      expected: "[null,null,null,null,null,null,1,1]",
      hidden: true,
      note: "Popping back to the first value restores that minimum.",
    },
    {
      args: [
        ["MinStack", "push", "push", "pop", "push", "getMin", "top"],
        [[], [0], [-1], [], [2], [], []],
      ],
      expected: "[null,null,null,null,null,0,2]",
      hidden: true,
      note: "After the minimum is popped, a larger push does not become the minimum.",
    },
  ],
  starterCode: {
    python: `class MinStack:

    def __init__(self):
        

    def push(self, val: int) -> None:
        

    def pop(self) -> None:
        

    def top(self) -> int:
        

    def getMin(self) -> int:
        `,
  },
  notes: {
    approach:
      "Keep the values in one stack and the minimums in another. Push a value onto the minimum stack only when it is less than or equal to the current minimum, so the top of that stack is always the minimum of the values still present. Pop the minimum stack only when the popped value equals its top. Both stacks change by one element per call, so every operation is constant time.",
    timeComplexity: "O(1) per operation",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "MinStack",
    params: [],
    returns: "void",
    calls: {
      className: "MinStack",
      constructorParams: [],
      methods: {
        push: { params: ["int"], returns: "void" },
        pop: { params: [], returns: "void" },
        top: { params: [], returns: "int" },
        getMin: { params: [], returns: "int" },
      },
    },
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/min-stack/",
  reference: `class MinStack:
    def __init__(self):
        self.values = []
        self.mins = []

    def push(self, val: int) -> None:
        self.values.append(val)
        if not self.mins or val <= self.mins[-1]:
            self.mins.append(val)

    def pop(self) -> None:
        if self.values.pop() == self.mins[-1]:
            self.mins.pop()

    def top(self) -> int:
        return self.values[-1]

    def getMin(self) -> int:
        return self.mins[-1]
`,
  rejection: `class MinStack:
    def __init__(self):
        self.values = []

    def push(self, val: int) -> None:
        self.values.append(val)

    def pop(self) -> None:
        self.values.pop()

    def top(self) -> int:
        return self.values[-1]

    def getMin(self) -> int:
        return self.values[-1]
`,
} satisfies AuthoredProblem;
