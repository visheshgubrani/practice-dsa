import type { AuthoredProblem } from "./authoring";

export const courseSchedule = {
  slug: "course-schedule",
  number: 207,
  title: "Course Schedule",
  difficulty: "medium",
  tags: ["depth-first-search","breadth-first-search","graph","topological-sort","directed-acyclic-graph","neetcode-150"],
  statement: "There are `numCourses` courses numbered from 0. Each pair `[course, prerequisite]` says the prerequisite must be completed first. Return whether every course can be completed.",
  examples: [
    {
      "args": [
        2,
        [
          [
            1,
            0
          ]
        ]
      ],
      "output": "true",
      "explanation": "Course 0 is completed before course 1."
    },
    {
      "args": [
        2,
        [
          [
            1,
            0
          ],
          [
            0,
            1
          ]
        ]
      ],
      "output": "false",
      "explanation": "The two courses depend on each other."
    }
  ],
  constraints: [
    "`1 <= numCourses <= 2000`",
    "`0 <= prerequisites.length <= 5000`",
    "Every pair contains valid course numbers, and no pair is repeated."
  ],
  testcases: [
    {
      "args": [
        2,
        [
          [
            1,
            0
          ]
        ]
      ],
      "expected": "true",
      "note": "Course 0 is completed before course 1."
    },
    {
      "args": [
        2,
        [
          [
            1,
            0
          ],
          [
            0,
            1
          ]
        ]
      ],
      "expected": "false",
      "note": "The two courses depend on each other."
    },
    {
      "args": [
        1,
        []
      ],
      "expected": "true",
      "hidden": true,
      "note": "One course has no prerequisites."
    },
    {
      "args": [
        4,
        []
      ],
      "expected": "true",
      "hidden": true,
      "note": "Independent courses can be taken in any order."
    },
    {
      "args": [
        4,
        [
          [
            1,
            0
          ],
          [
            2,
            1
          ],
          [
            3,
            2
          ]
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "A dependency chain has a valid order."
    },
    {
      "args": [
        3,
        [
          [
            1,
            0
          ],
          [
            2,
            0
          ]
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "Two courses may share a prerequisite."
    },
    {
      "args": [
        2,
        [
          [
            1,
            0
          ],
          [
            0,
            1
          ]
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "A two-course cycle blocks completion."
    },
    {
      "args": [
        3,
        [
          [
            0,
            1
          ],
          [
            1,
            2
          ],
          [
            2,
            0
          ]
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "Three dependencies form a directed cycle."
    },
    {
      "args": [
        4,
        [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            3,
            1
          ],
          [
            3,
            2
          ]
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "Both prerequisites of course 3 can be completed after course 0."
    },
    {
      "args": [
        5,
        [
          [
            1,
            0
          ],
          [
            2,
            1
          ],
          [
            0,
            2
          ],
          [
            4,
            3
          ]
        ]
      ],
      "expected": "false",
      "hidden": true,
      "note": "A cycle blocks one part of an otherwise separate graph."
    },
    {
      "args": [
        5,
        [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            3,
            2
          ],
          [
            4,
            3
          ]
        ]
      ],
      "expected": "true",
      "hidden": true,
      "note": "A branching dependency graph without a cycle is completable."
    },
    {
      "args": [4, [[1, 0], [2, 1], [3, 3]]],
      "expected": "false",
      "hidden": true,
      "note": "Course 3 has a prerequisite edge to itself, which forms a cycle."
    }
  ],
  starterCode: { python: `class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        
` },
  notes: {
    "approach": "Model prerequisites as directed edges and detect directed cycles. A cycle means every course on it waits on another course in the same cycle.",
    "timeComplexity": "O(V + E)",
    "spaceComplexity": "O(V + E)"
  },
  signature: {
    "name": "canFinish",
    "params": [
      {
        "name": "numCourses",
        "kind": "int"
      },
      {
        "name": "prerequisites",
        "kind": "int[][]"
      }
    ],
    "returns": "bool"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/course-schedule/",
  reference: `class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        # dfs
        preMap = {i: [] for i in range(numCourses)}

        # map each course to : prereq list
        for crs, pre in prerequisites:
            preMap[crs].append(pre)

        visiting = set()

        def dfs(crs):
            if crs in visiting:
                return False
            if preMap[crs] == []:
                return True

            visiting.add(crs)
            for pre in preMap[crs]:
                if not dfs(pre):
                    return False
            visiting.remove(crs)
            preMap[crs] = []
            return True

        for c in range(numCourses):
            if not dfs(c):
                return False
        return True
`,
  rejection: `class Solution:
    def canFinish(self, numCourses, prerequisites):
        graph = [[] for _ in range(numCourses)]
        for course, prerequisite in prerequisites:
            graph[course].append(prerequisite)
        seen = set()
        def visit(course):
            if course in seen: return False
            seen.add(course)
            return all(visit(pre) for pre in graph[course])
        return all(visit(course) for course in range(numCourses))
`,
} satisfies AuthoredProblem;
