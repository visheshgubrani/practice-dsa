/**
 * Authoring and judging shapes for catalog modules.
 *
 * Arguments are authoritative. Displayed console input and example `input` are
 * generated from those arguments; example explanations stay authored.
 *
 * Seed (`lib/db/seed.ts`) is the only catalog importer. The judging read
 * (`getProblemForJudging`) reuses these types. The public `@/lib/problems`
 * barrel does not re-export this module.
 */

import {
  formatArguments,
  formatSampleInput,
  type ArgValue,
} from "@/lib/harness/args";
import type { LanguageId } from "@/lib/languages";
import type {
  CompareMode,
  Difficulty,
  Example,
  Problem,
  ProblemSignature,
  SolutionNotes,
  Testcase,
} from "@/lib/problems";

export type { ArgValue };

/**
 * A case as written in a problem module. `expected` may be omitted until
 * conformance (2.6) prints a candidate for hand review — seed still refuses to
 * write a row without one.
 */
export type AuthoredTestcase = {
  args: readonly ArgValue[];
  expected?: string;
  hidden?: boolean;
  compare?: CompareMode;
  /** Stored on `problem_testcases.explanation`. */
  note?: string;
};

/** Statement examples: `input` is generated; `output` and explanations are authored. */
export type AuthoredExample = {
  args: readonly ArgValue[];
  output: string;
  explanation?: string;
};

export type AuthoredProblem = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  statement: string;
  constraints: string[];
  examples: readonly AuthoredExample[];
  testcases: readonly AuthoredTestcase[];
  starterCode: Record<LanguageId, string>;
  notes: SolutionNotes;
  signature: ProblemSignature;
  compare?: CompareMode;
  sourceUrl?: string;
  /**
   * Python reference solution in the editor's shape. Seed and conformance only;
   * never sent to the client or the tutor.
   */
  reference: string;
};

/** Every judging case has arguments, an expected value, and a visibility flag. */
export type JudgingTestcase = {
  args: readonly ArgValue[];
  expected: string;
  hidden: boolean;
  compare?: CompareMode;
  note?: string;
};

export type JudgingProblem = {
  slug: string;
  number: number;
  title: string;
  signature: ProblemSignature;
  compare?: CompareMode;
  testcases: JudgingTestcase[];
  starterCode: Record<LanguageId, string>;
};

export type SeedExample = {
  input: string;
  output: string;
  explanation?: string;
};

export type SeedTestcase = {
  args: ArgValue[];
  expected: string;
  isHidden: boolean;
  compare?: CompareMode;
  explanation?: string;
};

function requireExpected(
  testcase: AuthoredTestcase,
  slug: string,
  index: number,
): string {
  const expected = testcase.expected?.trim() ?? "";
  if (expected.length === 0) {
    throw new Error(
      `${slug}: testcase ${index + 1} has no expected value (authoring may omit it; judging and seed may not)`,
    );
  }
  return testcase.expected as string;
}

export function toJudgingTestcase(
  testcase: AuthoredTestcase,
  slug: string,
  index: number,
): JudgingTestcase {
  return {
    args: testcase.args,
    expected: requireExpected(testcase, slug, index),
    hidden: testcase.hidden ?? false,
    compare: testcase.compare,
    note: testcase.note,
  };
}

export function toJudgingProblem(problem: AuthoredProblem): JudgingProblem {
  return {
    slug: problem.slug,
    number: problem.number,
    title: problem.title,
    signature: problem.signature,
    compare: problem.compare,
    starterCode: { ...problem.starterCode },
    testcases: problem.testcases.map((testcase, index) =>
      toJudgingTestcase(testcase, problem.slug, index),
    ),
  };
}

function toPublicTestcase(
  testcase: AuthoredTestcase,
  signature: ProblemSignature,
  slug: string,
  index: number,
): Testcase {
  return {
    stdin: formatArguments(testcase.args, signature),
    args: testcase.args,
    expected: requireExpected(testcase, slug, index),
    compare: testcase.compare,
  };
}

function toPublicExample(
  example: AuthoredExample,
  signature: ProblemSignature,
): Example {
  return {
    input: formatSampleInput(example.args, signature),
    output: example.output,
    explanation: example.explanation,
  };
}

/**
 * Visible cases only; generated console input and example input; no hidden
 * suite and no reference-solution source.
 */
export function toPublicProblem(problem: AuthoredProblem): Problem {
  const visible = problem.testcases
    .map((testcase, index) => ({ testcase, index }))
    .filter(({ testcase }) => !(testcase.hidden ?? false));

  return {
    slug: problem.slug,
    number: problem.number,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: [...problem.tags],
    statement: problem.statement,
    constraints: [...problem.constraints],
    examples: problem.examples.map((example) =>
      toPublicExample(example, problem.signature),
    ),
    testcases: visible.map(({ testcase, index }) =>
      toPublicTestcase(testcase, problem.signature, problem.slug, index),
    ),
    starterCode: { ...problem.starterCode },
    notes: { ...problem.notes },
    signature: problem.signature,
    compare: problem.compare,
  };
}

/** Rows seed writes: arguments JSON, generated example input, `note` as `explanation`. */
export function compileForSeed(problem: AuthoredProblem): {
  examples: SeedExample[];
  testcases: SeedTestcase[];
} {
  return {
    examples: problem.examples.map((example) =>
      toPublicExample(example, problem.signature),
    ),
    testcases: problem.testcases.map((testcase, index) => ({
      args: [...testcase.args],
      expected: requireExpected(testcase, problem.slug, index),
      isHidden: testcase.hidden ?? false,
      compare: testcase.compare,
      explanation: testcase.note,
    })),
  };
}
