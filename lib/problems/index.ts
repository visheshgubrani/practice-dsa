/**
 * The public problem shape — types and helpers the UI may import.
 *
 * Pages, the workspace, and the tutor prompt talk in these types. The live
 * catalog is Postgres (`lib/db/queries/problems.ts`); this module is the shared
 * language those reads return.
 *
 * Authoring lives next door (`lib/problems/*.ts`) and is seed input only. Do
 * not re-export the catalog, reference solutions, or judging cases from here.
 */

import type { ArgValue } from "@/lib/harness/args";
import type { LanguageId } from "@/lib/languages";

export type Difficulty = "easy" | "medium" | "hard";

export type Example = {
  input: string;
  output: string;
  explanation?: string;
};

export type Testcase = {
  /**
   * Console input for this visible case. Generated from stored `args` via
   * `formatArguments` at read time; not a separately maintained string.
   */
  stdin: string;
  /** Authoritative arguments, when the catalog loaded them. */
  args?: readonly ArgValue[];
  /** Expected stdout for the visible case, as JSON text. */
  expected: string;
  /** Defaults to the problem's own `compare` when omitted. */
  compare?: CompareMode;
};

export type SolutionNotes = {
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
};

/**
 * How a returned value is compared with a testcase's `expected`.
 *
 *   exact      — canonical JSON text, identical after trimming
 *   unordered  — same, but every array may be in any order (groups and members)
 *   index_pair — a two-element array; the values may appear in either order
 *   intervals  — a list of `[start, end]` pairs, in order; endpoints stay ordered
 *
 * `unordered` is the LeetCode convention for "return the answer in any order",
 * and it is the only reason `group-anagrams` can be judged at all: its expected
 * value enumerates one valid grouping, not the only one.
 *
 * Two Sum is `index_pair`, not `unordered`: the unique answer may be reversed,
 * but a longer permutation is not an answer. Merge Intervals is `intervals`,
 * not `unordered`: reversed endpoints and a shuffled interval list both fail.
 */
export const COMPARE_MODES = [
  "exact",
  "unordered",
  "index_pair",
  "intervals",
] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

/**
 * The value kinds a solution can take and return.
 *
 * Deliberately language-neutral rather than Python-shaped: the harness in
 * `lib/harness/python.ts` renders one of these into a type annotation and into
 * the checks it makes, so the two can never disagree about a problem's shape.
 * It also means a problem carries no syntax of the language it is solved in.
 */
export const VALUE_KINDS = [
  "int",
  "long",
  "double",
  "bool",
  "string",
  "int[]",
  "long[]",
  "double[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
  "void",
] as const;

export type ValueKind = (typeof VALUE_KINDS)[number];

export type SignatureParam = {
  /** Argument name — also the name its generated input line starts with. */
  name: string;
  kind: ValueKind;
};

export type ProblemSignature = {
  /** The function the user is expected to implement. */
  name: string;
  params: readonly SignatureParam[];
  returns: ValueKind;
};

/**
 * Public problem content: statement, examples, visible cases, starter, notes.
 * No reference-solution source, and no hidden cases.
 */
export type Problem = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  /** Markdown. */
  statement: string;
  examples: Example[];
  constraints: string[];
  testcases: Testcase[];
  /**
   * The starting buffer per runnable language. Narrow because a problem without a
   * starter cannot be opened in the editor, so the set is the language set.
   */
  starterCode: Record<LanguageId, string>;
  notes: SolutionNotes;
  /**
   * The function the harness calls. Required: a problem without it can be
   * simulated but not judged, and `lib/db/seed.ts` refuses to seed one.
   */
  signature: ProblemSignature;
  /** How `expected` is compared, unless a single testcase overrides it. */
  compare?: CompareMode;
};

/** The slice of a problem the list page needs — cheap to cross to a client. */
export type ProblemSummary = Pick<
  Problem,
  "slug" | "number" | "title" | "difficulty" | "tags"
>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Strips whitespace and line/block comments so the mock runner can tell an
 * untouched starter template from real work.
 */
export function normalizeSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/#[^\n]*/g, "")
    .replace(/\s+/g, "")
    .trim();
}
