import type { AuthoredProblem } from "./authoring";

export const taskScheduler = {
  slug: "task-scheduler",
  number: 621,
  title: "Task Scheduler",
  difficulty: "medium",
  tags: ["array", "hash-table", "greedy", "sorting", "heap-priority-queue", "counting", "neetcode-150"],
  statement: [
    "`tasks` is a list of CPU jobs, each named by an uppercase letter. Two runs of the same letter need at least `n` idle slots between them. Different letters have no such gap.",
    "",
    "Return the length of the shortest schedule, counting the idle slots.",
  ].join("\n"),
  examples: [
    {
      args: [["A", "A", "A", "B", "B", "B"], 2],
      output: "8",
      explanation:
        "One shortest schedule is A, B, idle, A, B, idle, A, B. The two idles are required so each letter waits 2 slots.",
    },
    {
      args: [["A", "C", "A", "B", "D", "B"], 1],
      output: "6",
      explanation: "The six tasks can be ordered so the same letter is never adjacent, so no idle is needed.",
    },
    {
      args: [["A", "A", "A", "B", "B", "B"], 3],
      output: "10",
      explanation:
        "A gap of 3 needs two idles in each frame: A, B, idle, idle, repeated, then a final A, B.",
    },
  ],
  constraints: [
    "`1 <= tasks.length <= 10⁴`",
    "`tasks[i]` is an uppercase English letter.",
    "`0 <= n <= 100`",
  ],
  testcases: [
    {
      args: [["A", "A", "A", "B", "B", "B"], 2],
      expected: "8",
      note: "Six tasks plus two idle slots.",
    },
    {
      args: [["A", "C", "A", "B", "D", "B"], 1],
      expected: "6",
      note: "Enough distinct letters to avoid every cooldown.",
    },
    {
      args: [["A", "A", "A", "B", "B", "B"], 3],
      expected: "10",
      note: "A wider cooldown adds more idle slots.",
    },
    {
      args: [["A"], 0],
      expected: "1",
      hidden: true,
      note: "one task and no cooldown",
    },
    {
      args: [["A", "A", "A"], 0],
      expected: "3",
      hidden: true,
      note: "n is 0, so the same letter may run back to back",
    },
    {
      args: [["A", "A", "A"], 2],
      expected: "7",
      hidden: true,
      note: "three identical tasks with a gap of 2",
    },
    {
      args: [["A", "B"], 2],
      expected: "2",
      hidden: true,
      note: "two different letters need no idle between them",
    },
    {
      args: [["A", "A", "B", "B"], 2],
      expected: "5",
      hidden: true,
      note: "one idle is still required between the two A's",
    },
    {
      args: [["A", "B", "C", "A", "B", "C"], 2],
      expected: "6",
      hidden: true,
      note: "three distinct letters fill the cooldown exactly",
    },
    {
      args: [["A", "A", "A", "A"], 1],
      expected: "7",
      hidden: true,
      note: "a gap of 1 between four copies of one letter",
    },
    {
      args: [["A", "A"], 100],
      expected: "102",
      hidden: true,
      note: "the cooldown is far longer than the task list",
    },
  ],
  starterCode: {
    python: `class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        `,
  },
  notes: {
    approach:
      "Let `maxCount` be the frequency of the busiest letter. That letter needs a gap of `n` after every copy except the last, which is `(maxCount - 1) * (n + 1)` slots, plus one more slot for every letter that is equally busy. If the tasks themselves outnumber that frame, there is no room for idle and the answer is just the number of tasks.",
    timeComplexity: "O(tasks.length)",
    spaceComplexity: "O(1)",
  },
  signature: {
    name: "leastInterval",
    params: [
      { name: "tasks", kind: "string[]" },
      { name: "n", kind: "int" },
    ],
    returns: "int",
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/task-scheduler/",
  reference: `class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        count = Counter(tasks)
        maxHeap = [-cnt for cnt in count.values()]
        heapq.heapify(maxHeap)

        time = 0
        q = deque()  # pairs of [-cnt, idleTime]
        while maxHeap or q:
            time += 1

            if not maxHeap:
                time = q[0][1]
            else:
                cnt = 1 + heapq.heappop(maxHeap)
                if cnt:
                    q.append([cnt, time + n])
            if q and q[0][1] == time:
                heapq.heappush(maxHeap, q.popleft()[0])
        return time


# Greedy algorithm
class Solution(object):
    def leastInterval(self, tasks: List[str], n: int) -> int:
        counter = collections.Counter(tasks)
        max_count = max(counter.values())
        min_time = (max_count - 1) * (n + 1) + \\
                    sum(map(lambda count: count == max_count, counter.values()))
    
        return max(min_time, len(tasks))
`,
  rejection: `class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        # Ignores the cooldown, so idle slots are never counted.
        return len(tasks)
`,
} satisfies AuthoredProblem;
