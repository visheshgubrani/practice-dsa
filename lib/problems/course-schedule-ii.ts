import type { AuthoredProblem } from "./authoring";

export const courseScheduleIi = {
  slug: "course-schedule-ii",
  number: 210,
  title: "Course Schedule II",
  difficulty: "medium",
  tags: ["depth-first-search","breadth-first-search","graph","topological-sort","neetcode-150"],
  statement: "There are `numCourses` courses numbered from 0 and pairs `[course, prerequisite]`. Return an order that puts every prerequisite first, or an empty list if this is impossible. The authored acyclic cases have a unique valid order so exact judging is unambiguous.",
  examples: [
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
      "output": "[0,1,2,3]",
      "explanation": "The chain forces the only valid order."
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
            1
          ]
        ]
      ],
      "output": "[0,1,2]",
      "explanation": "Course 0 unlocks 1, then 2."
    }
  ],
  constraints: [
    "`1 <= numCourses <= 2000`",
    "`0 <= prerequisites.length <= numCourses * (numCourses - 1)`",
    "Every pair contains distinct valid course numbers, and no pair is repeated.",
    "A valid answer lists each course once with prerequisites first."
  ],
  testcases: [
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
      "expected": "[0,1,2,3]",
      "note": "The chain forces the only valid order."
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
            1
          ]
        ]
      ],
      "expected": "[0,1,2]",
      "note": "Course 0 unlocks 1, then 2."
    },
    {
      "args": [
        1,
        []
      ],
      "expected": "[0]",
      "hidden": true,
      "note": "The only course is the only order."
    },
    {
      "args": [
        2,
        [
          [
            0,
            1
          ]
        ]
      ],
      "expected": "[1,0]",
      "hidden": true,
      "note": "Course 1 is a prerequisite of course 0."
    },
    {
      "args": [
        3,
        [
          [
            2,
            1
          ],
          [
            1,
            0
          ]
        ]
      ],
      "expected": "[0,1,2]",
      "hidden": true,
      "note": "The input edge order does not change the unique chain."
    },
    {
      "args": [
        4,
        [
          [
            2,
            0
          ],
          [
            1,
            2
          ],
          [
            3,
            1
          ]
        ]
      ],
      "expected": "[0,2,1,3]",
      "hidden": true,
      "note": "The dependencies force 0, then 2, then 1, then 3."
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
            3,
            2
          ],
          [
            4,
            3
          ]
        ]
      ],
      "expected": "[0,1,2,3,4]",
      "hidden": true,
      "note": "Five courses form a chain."
    },
    {
      "args": [
        5,
        [
          [
            4,
            3
          ],
          [
            3,
            2
          ],
          [
            2,
            1
          ],
          [
            1,
            0
          ]
        ]
      ],
      "expected": "[0,1,2,3,4]",
      "hidden": true,
      "note": "Reversing pair order still leaves the same unique chain."
    },
    {
      "args": [
        4,
        [
          [
            3,
            2
          ],
          [
            2,
            0
          ],
          [
            0,
            1
          ]
        ]
      ],
      "expected": "[1,0,2,3]",
      "hidden": true,
      "note": "The chain begins with course 1."
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
            1
          ],
          [
            0,
            2
          ]
        ]
      ],
      "expected": "[]",
      "hidden": true,
      "note": "A cycle makes a full order impossible."
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
            0,
            1
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
      "expected": "[]",
      "hidden": true,
      "note": "A cycle among the first courses blocks completion."
    }
  ],
  starterCode: { python: `class Solution:
    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:
        
` },
  notes: {
    "approach": "Topologically sort the dependency graph. A depth-first traversal appends a course after its prerequisites and detects a cycle on the active path. Cases use unique valid orders because comparison is exact.",
    "timeComplexity": "O(V + E)",
    "spaceComplexity": "O(V + E)"
  },
  signature: {
    "name": "findOrder",
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
    "returns": "int[]"
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/course-schedule-ii/",
  reference: `class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        prereq = {c: [] for c in range(numCourses)}
        for crs, pre in prerequisites:
            prereq[crs].append(pre)

        output = []
        visit, cycle = set(), set()

        def dfs(crs):
            if crs in cycle:
                return False
            if crs in visit:
                return True

            cycle.add(crs)
            for pre in prereq[crs]:
                if dfs(pre) == False:
                    return False
            cycle.remove(crs)
            visit.add(crs)
            output.append(crs)
            return True

        for c in range(numCourses):
            if dfs(c) == False:
                return []
        return output
`,
  rejection: `class Solution:
    def findOrder(self, numCourses, prerequisites):
        return list(range(numCourses))
`,
} satisfies AuthoredProblem;
