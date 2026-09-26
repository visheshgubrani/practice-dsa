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
 *   exact            — canonical JSON text, identical after trimming
 *   unordered        — same, but every array may be in any order (groups and members)
 *   unordered_outer  — the outermost array may be in any order; inner order is kept
 *   index_pair       — a two-element array; the values may appear in either order
 *   intervals        — a list of `[start, end]` pairs, in order; endpoints stay ordered
 *   tolerance        — two JSON numbers, accepted when they differ by at most 1e-5
 *
 * `unordered` is the LeetCode convention for "return the answer in any order",
 * and it is the only reason `group-anagrams` can be judged at all: its expected
 * value enumerates one valid grouping, not the only one.
 *
 * `unordered_outer` is for a *set of ordered sequences* — permutations, N-Queens
 * boards, palindrome partitions, Pacific-Atlantic cells, K-Closest points. There
 * the outer order is free but a piece's order is the answer, and recursive
 * `unordered` would sort the pieces too (`[[2,1]]` matching `[[1,2]]`).
 *
 * Two Sum is `index_pair`, not `unordered`: the unique answer may be reversed,
 * but a longer permutation is not an answer. Merge Intervals is `intervals`,
 * not `unordered`: reversed endpoints and a shuffled interval list both fail.
 *
 * `tolerance` is for a `double` return. `2` and `2.0` are the same answer, and
 * a value within `1e-5` of the expected number is accepted. An off-by-one
 * median is at least `0.5` away, so the band does not hide a wrong index.
 */
export const COMPARE_MODES = [
  "exact",
  "unordered",
  "unordered_outer",
  "index_pair",
  "intervals",
  "tolerance",
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

/**
 * A codec judged by round trip: `decode(encode(args))` must equal the case.
 *
 * Each call uses a fresh `Solution`, so the encoded string is the only channel
 * between the two methods. This is not general multi-method dispatch.
 */
export type RoundTrip = {
  encode: string;
  decode: string;
};

/** One method on a class the call script may invoke after construction. */
export type CallMethod = {
  params: readonly ValueKind[];
  returns: ValueKind;
};

/**
 * One instance, constructed once, then a script of methods on that same instance.
 *
 * A case is `[ops, args]`. The first operation is `className` and its argument
 * list constructs the object. Later operations are method names. The judged
 * value is the list of results: `null` for the constructor and for `void`
 * methods, and the method's return value otherwise.
 *
 * This is the shared path for a design problem that fits that shape. A custom
 * node class, a float return, or an in-place `void` function does not.
 */
export type ClassCalls = {
  className: string;
  constructorParams: readonly ValueKind[];
  methods: Readonly<Record<string, CallMethod>>;
};

export type ProblemSignature = {
  /**
   * The function the user implements, or the class name when `calls` is set.
   */
  name: string;
  params: readonly SignatureParam[];
  returns: ValueKind;
  /**
   * When set, judging calls `encode` then `decode` on two instances and
   * compares the decoded value. `name` is the encode method. `returns` is the
   * decoded value the console shows.
   */
  roundTrip?: RoundTrip;
  /**
   * When set, judging constructs one instance and runs the operation script.
   * `name` is the class. The judged value is the script's result list, not
   * `returns`. An ordinary problem still cannot return `void`.
   */
  calls?: ClassCalls;
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
  /**
   * The roadmap group the problem is filed under ("Stack", "Graphs"), which is
   * what the dashboard's topic sections group by.
   *
   * Empty means "not classified yet" — a row from before the topic backfill.
   * The dashboard folds those into Uncategorized rather than hiding them.
   */
  topic: string;
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
  "slug" | "number" | "title" | "difficulty" | "topic" | "tags"
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
