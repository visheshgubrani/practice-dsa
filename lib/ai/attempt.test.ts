import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Problem, ProblemSignature } from "@/lib/problems";

import {
  ATTEMPT_STATE_HEADER,
  attemptState,
  describeAttemptState,
  expectedMethods,
} from "./attempt";

/**
 * The exact buffer that produced the unhelpful Encode and Decode Strings chat:
 * `encode` holds only the two format comments, and `decode` is half-written.
 */
const TRANSCRIPT_BUFFER = `class Solution:
    def encode(self, strs: List[str]) -> str:
        # chunk = <length><sep><chars>
        # 5#hello5#world
    def decode(self, s: str) -> List[str]:
        final_list = []
        i = 0
        while i < len(s):
            length = 0
            if s[i] == "#":
                i += 1
`;

function problem(signature: ProblemSignature): Problem {
  return {
    slug: "fixture",
    number: 271,
    title: "Encode and Decode Strings",
    difficulty: "medium",
    topic: "Arrays & Hashing",
    tags: ["string"],
    statement: "Design a codec for a list of strings.",
    examples: [],
    constraints: [],
    testcases: [],
    starterCode: { python: "" },
    notes: { approach: "", timeComplexity: "", spaceComplexity: "" },
    signature,
  };
}

function codec(): Problem {
  return problem({
    name: "encode",
    params: [{ name: "strs", kind: "string[]" }],
    returns: "string[]",
    roundTrip: { encode: "encode", decode: "decode" },
  });
}

function minStack(): Problem {
  return problem({
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
      },
    },
  });
}

function stateOf(source: string, target: Problem) {
  return Object.fromEntries(
    attemptState(source, target).map((entry) => [
      entry.name,
      entry.present ? (entry.emptyBody ? "empty" : "statements") : "missing",
    ]),
  );
}

describe("expectedMethods", () => {
  it("lists encode and decode for a round trip", () => {
    assert.deepEqual(expectedMethods(codec()), ["encode", "decode"]);
  });

  it("lists the constructor then the script methods for a call problem", () => {
    assert.deepEqual(expectedMethods(minStack()), [
      "__init__",
      "push",
      "pop",
      "top",
    ]);
  });

  it("lists the single function for an ordinary problem", () => {
    const ordinary = problem({
      name: "twoSum",
      params: [
        { name: "nums", kind: "int[]" },
        { name: "target", kind: "int" },
      ],
      returns: "int[]",
    });
    assert.deepEqual(expectedMethods(ordinary), ["twoSum"]);
  });
});

describe("attemptState", () => {
  it("reads the transcript buffer as an empty encode and a started decode", () => {
    assert.deepEqual(stateOf(TRANSCRIPT_BUFFER, codec()), {
      encode: "empty",
      decode: "statements",
    });
  });

  it("treats comments, blank lines, and a bare pass as an empty body", () => {
    const commented = `class Solution:
    def encode(self, strs):
        # not written yet
        \t
    def decode(self, s):
        pass
`;
    assert.deepEqual(stateOf(commented, codec()), {
      encode: "empty",
      decode: "empty",
    });
  });

  it("counts real statements inside a body", () => {
    const started = `class Solution:
    def encode(self, strs):
        parts = []
    def decode(self, s):
        return []
`;
    assert.deepEqual(stateOf(started, codec()), {
      encode: "statements",
      decode: "statements",
    });
  });

  it("reports a method that is not in the buffer", () => {
    const partial = `class Solution:
    def encode(self, strs):
        return ""
`;
    assert.deepEqual(stateOf(partial, codec()), {
      encode: "statements",
      decode: "missing",
    });
  });

  it("does not mistake a nested helper for the method itself", () => {
    const nested = `class Solution:
    def decode(self, s):
        def decode(part):
            return part
        return []
`;
    assert.deepEqual(stateOf(nested, codec()), {
      encode: "missing",
      decode: "statements",
    });
  });

  it("reads a design-problem starter with blank lines between methods", () => {
    const starter = `class MinStack:

    def __init__(self):
        self.stack = []

    def push(self, val: int) -> None:
        self.stack.append(val)

    def pop(self) -> None:

    def top(self) -> int:
        return self.stack[-1]
`;
    assert.deepEqual(stateOf(starter, minStack()), {
      __init__: "statements",
      push: "statements",
      pop: "empty",
      top: "statements",
    });
  });
});

describe("describeAttemptState", () => {
  it("states the transcript buffer as facts the tutor can act on", () => {
    const text = describeAttemptState(TRANSCRIPT_BUFFER, codec());
    assert.ok(text);
    assert.equal(text.startsWith(ATTEMPT_STATE_HEADER), true);
    assert.match(text, /- encode: defined; body is empty/);
    assert.match(text, /- decode: defined; body has statements/);
    assert.match(text, /Never read this block back/);
    assert.match(text, /does not mean the method is implemented or understood/);
  });

  it("names a method the buffer has not written yet", () => {
    const partial = `class Solution:
    def encode(self, strs):
        return ""
`;
    assert.match(
      describeAttemptState(partial, codec()) ?? "",
      /- decode: not defined in the buffer/,
    );
  });

  it("stays silent for a blank buffer or one without the expected methods", () => {
    assert.equal(describeAttemptState("", codec()), null);
    assert.equal(describeAttemptState("   \n\t\n", codec()), null);
    assert.equal(describeAttemptState("print('scratch')\n", codec()), null);
  });
});
