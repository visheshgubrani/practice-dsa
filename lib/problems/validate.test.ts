import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthoredProblem } from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";
import {
  validateCatalog,
  validateProblem,
} from "@/lib/problems/validate";

function problem(overrides: Partial<AuthoredProblem> = {}): AuthoredProblem {
  return {
    slug: "split-demo",
    number: 99,
    title: "Split Demo",
    difficulty: "easy",
    tags: ["array"],
    statement: "Demo.",
    constraints: ["`n >= 1`"],
    examples: [{ args: [[2, 7], 9], output: "[0,1]" }],
    testcases: [{ args: [[2, 7], 9], expected: "[0,1]" }],
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
    },
    notes: {
      approach: "hash map",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    },
    reference: `class Solution:
    def twoSum(self, nums, target):
        return [0, 1]
`,
    signature: {
      name: "twoSum",
      params: [
        { name: "nums", kind: "int[]" },
        { name: "target", kind: "int" },
      ],
      returns: "int[]",
    },
    compare: "index_pair",
    ...overrides,
  };
}

describe("validateProblem", () => {
  it("accepts a well-formed problem", () => {
    assert.deepEqual(validateProblem(problem(), { requireExpected: true }), []);
  });

  it("requires a round trip to define both methods", () => {
    const issues = validateProblem(
      problem({
        signature: {
          name: "encode",
          params: [{ name: "strs", kind: "string[]" }],
          returns: "string[]",
          roundTrip: { encode: "encode", decode: "decode" },
        },
        examples: [{ args: [["Hello"]], output: '["Hello"]' }],
        testcases: [{ args: [["Hello"]], expected: '["Hello"]' }],
        compare: "exact",
      }),
    );
    assert.match(issues.join("\n"), /starter does not define encode/);
    assert.match(issues.join("\n"), /starter does not define decode/);
    assert.match(issues.join("\n"), /reference does not define encode/);
    assert.match(issues.join("\n"), /reference does not define decode/);
  });

  it("requires argument count to match the signature", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7]], expected: "[0,1]" }] }),
    );
    assert.match(issues.join("\n"), /has 1 argument, signature expects 2/);
  });

  it("rejects a boolean in an integer array", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, true], 9], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /nums\[1\] = true is not int/);
  });

  it("rejects a non-finite number", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, 7], Number.POSITIVE_INFINITY], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /target = Infinity is not int/);
  });

  it("rejects an int outside 32-bit range", () => {
    const issues = validateProblem(
      problem({
        testcases: [{ args: [[2, 7], 3_000_000_000], expected: "[0,1]" }],
      }),
    );
    assert.match(issues.join("\n"), /target = 3000000000 is not int/);
  });

  it("rejects an expected value whose shape does not match the return kind", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7], 9], expected: "true" }] }),
    );
    assert.match(issues.join("\n"), /expects true, which is not int\[\]/);
  });

  it("allows a missing expected when authoring", () => {
    assert.deepEqual(
      validateProblem(problem({ testcases: [{ args: [[2, 7], 9] }] })),
      [],
    );
  });

  it("requires expected for judging and does not invent one", () => {
    const issues = validateProblem(
      problem({ testcases: [{ args: [[2, 7], 9] }] }),
      { requireExpected: true },
    );
    assert.deepEqual(issues, ["split-demo: testcase 1 has no expected value"]);
  });

  it("requires python starter code", () => {
    const issues = validateProblem(
      problem({ starterCode: { python: "   " } }),
    );
    assert.match(issues.join("\n"), /no starter code for python/);
  });

  it("requires a python reference solution", () => {
    const issues = validateProblem(problem({ reference: "   " }));
    assert.match(issues.join("\n"), /no python reference solution/);
  });

  it("requires a statement, constraints, and complexity notes", () => {
    const issues = validateProblem(
      problem({
        statement: "  ",
        constraints: ["", "   "],
        notes: { approach: "", timeComplexity: "", spaceComplexity: "" },
      }),
    );
    assert.match(issues.join("\n"), /has no statement/);
    assert.match(issues.join("\n"), /has no constraints/);
    assert.match(issues.join("\n"), /has no approach notes/);
    assert.match(issues.join("\n"), /has no time complexity notes/);
    assert.match(issues.join("\n"), /has no space complexity notes/);
  });

  it("requires a compare policy and rejects in-place void returns", () => {
    const missingCompare = validateProblem(problem({ compare: undefined }));
    assert.match(missingCompare.join("\n"), /missing compare policy/);

    const inPlace = validateProblem(
      problem({
        signature: {
          name: "twoSum",
          params: [
            { name: "nums", kind: "int[]" },
            { name: "target", kind: "int" },
          ],
          returns: "void",
        },
      }),
    );
    assert.match(inPlace.join("\n"), /returns void/);
  });

  it("requires the starter and reference to define the signature method", () => {
    const issues = validateProblem(
      problem({
        starterCode: {
          python: `class Solution:
    def other(self, nums: List[int], target: int) -> List[int]:
        `,
        },
        reference: `class Solution:
    def other(self, nums, target):
        return [0, 1]
`,
      }),
    );
    assert.match(issues.join("\n"), /python starter does not define twoSum/);
    assert.match(issues.join("\n"), /python reference does not define twoSum/);
  });

  it("refuses a scaffolded draft that still carries TODO markers", () => {
    const issues = validateProblem(
      problem({
        statement: "TODO(statement): Two Sum.",
        examples: [
          { args: [[2, 7], 9], output: "TODO(example)", explanation: "TODO(note)" },
        ],
        testcases: [{ args: [[2, 7], 9], note: "TODO(note)" }],
        notes: { approach: "TODO(approach)", timeComplexity: "O(n)", spaceComplexity: "O(n)" },
        rejection: `class Solution:
    def twoSum(self, nums, target):
        return []  # TODO(rejection)
`,
      }),
    );

    assert.match(issues.join("\n"), /is still a draft/);
    assert.match(issues.join("\n"), /statement/);
    assert.match(issues.join("\n"), /example 1 output/);
    assert.match(issues.join("\n"), /approach notes/);
    assert.match(issues.join("\n"), /testcase 1 note/);
    assert.match(issues.join("\n"), /rejection fixture/);
  });

  it("checks a call script against the methods the signature allows", () => {
    const calls = {
      className: "MinStack",
      constructorParams: [],
      methods: {
        push: { params: ["int" as const], returns: "void" as const },
        getMin: { params: [], returns: "int" as const },
      },
    };
    const starter = `class MinStack:
    def __init__(self):
        pass
    def push(self, val: int) -> None:
        pass
    def getMin(self) -> int:
        pass
`;
    const issues = validateProblem(
      problem({
        signature: {
          name: "MinStack",
          params: [],
          returns: "void",
          calls,
        },
        starterCode: { python: starter },
        reference: starter,
        examples: [
          {
            args: [
              ["MinStack", "push", "getMin"],
              [[], [1], []],
            ],
            output: "[null,null,1]",
          },
        ],
        testcases: [
          {
            args: [
              ["MinStack", "push", "peek"],
              [[], [1], []],
            ],
            expected: "[null,null,1]",
          },
        ],
        compare: "exact",
      }),
      { requireExpected: true },
    );
    assert.match(issues.join("\n"), /calls peek, which the signature does not allow/);
    assert.doesNotMatch(issues.join("\n"), /returns void/);
    assert.doesNotMatch(issues.join("\n"), /has no parameters/);
  });

  it("does not trip on prose that merely says todo without a marker", () => {
    const issues = validateProblem(
      problem({ statement: "A todo list of indices, returned in order." }),
      { requireExpected: true },
    );

    assert.deepEqual(issues, []);
  });
});

describe("validateCatalog", () => {
  it("accepts the authored catalog for seed", () => {
    assert.deepEqual(validateCatalog(PROBLEMS, { requireExpected: true }), []);
  });

  it("rejects duplicate slugs and numbers", () => {
    const twoSum = PROBLEMS.find((entry) => entry.slug === "two-sum");
    assert.ok(twoSum, "the catalog is expected to keep two-sum seeded");
    const copy = problem({ slug: "two-sum", number: 1, title: "Copy" });
    const issues = validateCatalog([twoSum, copy], {
      requireExpected: true,
    });
    assert.match(issues.join("\n"), /slug is reused/);
    assert.match(issues.join("\n"), /problem number 1 is used by both/);
  });
});
