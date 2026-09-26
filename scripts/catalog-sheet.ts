/**
 * The sheet's data contract, shared by the catalog scripts.
 *
 * `docs/catalog/neetcode-150.json` is written by `catalog-fetch --manifest`,
 * read by `catalog-status` and `catalog-scaffold`, and never read by the app.
 * The snapshot shape below is the same file-per-problem contract those two
 * scripts share.
 *
 * The classifier is here rather than in the fetcher because it is the answer to
 * "can this harness judge this problem at all": both the manifest and the
 * scaffolder must give the same verdict, or a problem could be marked ready and
 * then scaffolded into a shape the runner cannot call.
 */

import type { ValueKind } from "@/lib/problems";

export type DeferReason =
  | "premium"
  | "design"
  | "linked_list"
  | "tree"
  | "in_place_void"
  | "float_return"
  | "unsupported_kind";

export type ManifestProblem = {
  order: number;
  group: string;
  groupOrder: number;
  number: number;
  slug: string;
  ncName: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  status: "ready" | "deferred";
  reason?: DeferReason;
};

export type Manifest = {
  total: number;
  groups: string[];
  problems: ManifestProblem[];
};

export type MetaDataParam = { name: string; type: string };

/** LeetCode's `question.metaData`, parsed. */
export type MetaData = {
  name?: string;
  params?: MetaDataParam[];
  return?: { type?: string };
  manual?: boolean;
};

export type ArticleNotes = {
  approach: string | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
};

/** One `docs/catalog/sources/<slug>.json`. Gitignored; authoring input only. */
export type Snapshot = {
  slug: string;
  number: number;
  title: string;
  difficulty: string;
  isPaidOnly: boolean;
  topicTags: string[];
  metaData: MetaData;
  pythonStarter: string;
  exampleTestcases: string[];
  statementHtml: string;
  constraints: string[];
  referencePython: string | null;
  referencePath: string | null;
  articleMarkdown: string | null;
  articlePath: string | null;
  /** True when the article's own code defines this problem's method. */
  articleVerified: boolean;
  articleCandidates: string[];
  notes: ArticleNotes;
};

export type QuestionShape = {
  isPaidOnly: boolean;
  codeSnippets: { langSlug: string; code: string }[] | null;
};

/**
 * LeetCode's `metaData` type strings are the authoritative shape of a problem.
 * Anything with no `ValueKind` defers with a printable reason, never a guess.
 */
export const TYPE_TO_KIND: Record<string, ValueKind> = {
  integer: "int",
  "integer[]": "int[]",
  "integer[][]": "int[][]",
  "list<integer>": "int[]",
  "list<list<integer>>": "int[][]",
  long: "long",
  "long[]": "long[]",
  double: "double",
  "double[]": "double[]",
  boolean: "bool",
  "boolean[]": "bool[]",
  string: "string",
  "string[]": "string[]",
  "list<string>": "string[]",
  "list<list<string>>": "string[][]",
  character: "string",
  "character[]": "string[]",
  "character[][]": "string[][]",
};

const NODE_TYPES = ["ListNode", "TreeNode", "Node"];

export function kindFor(type: string | undefined): ValueKind | null {
  if (!type) return null;
  return TYPE_TO_KIND[type.trim()] ?? null;
}

export function mentionsNode(type: string | undefined): boolean {
  if (!type) return false;
  return NODE_TYPES.some((name) => type.includes(name));
}

function signatureTypes(meta: MetaData): (string | undefined)[] {
  return [...(meta.params ?? []).map((param) => param.type), meta.return?.type];
}

export function hasNodeShape(meta: MetaData): boolean {
  return signatureTypes(meta).some(mentionsNode);
}

/** True when the signature or the starter's own class definitions mention a type. */
export function mentionsType(starter: string, meta: MetaData, name: string): boolean {
  const fromMeta = signatureTypes(meta).some((type) => (type ?? "").includes(name));
  return fromMeta || new RegExp(`\\bclass\\s+${name}\\b`).test(starter);
}

type ClassBlock = { name: string; body: string };

/**
 * A LeetCode starter puts helper classes (`ListNode`, `TreeNode`, `Node`) above
 * the class the user implements. Splitting them apart is what keeps a node
 * problem from being read as a multi-method design problem.
 */
export function classBlocks(source: string): ClassBlock[] {
  const blocks: ClassBlock[] = [];
  let current: { name: string; body: string[] } | null = null;

  for (const line of source.split("\n")) {
    const header = line.match(/^class\s+(\w+)\s*[(:]/);
    if (header) {
      if (current) blocks.push({ name: current.name, body: current.body.join("\n") });
      current = { name: header[1]!, body: [line] };
      continue;
    }
    if (!current) continue;
    // A top-level, non-class line ends the block: a module-level import or a
    // trailing statement belongs to the file, not to the class.
    if (line.trim().length > 0 && !/^\s/.test(line)) {
      blocks.push({ name: current.name, body: current.body.join("\n") });
      current = null;
      continue;
    }
    current.body.push(line);
  }
  if (current) blocks.push({ name: current.name, body: current.body.join("\n") });
  return blocks;
}

const NODE_CLASS_NAMES = /^(ListNode|TreeNode|Node|Node\w+|\w+Node)$/;

/** The class the user implements, and how many methods it declares. */
export function solutionMethods(starter: string): number {
  const blocks = classBlocks(starter);
  const solution = [...blocks].reverse().find((block) => !NODE_CLASS_NAMES.test(block.name));
  if (!solution) return 0;
  return solution.body.match(/^\s+def\s+\w+\s*\(/gm)?.length ?? 0;
}

export function pythonStarterOf(question: QuestionShape): string {
  return question.codeSnippets?.find((snippet) => snippet.langSlug === "python3")?.code ?? "";
}

/**
 * The starter is the stronger signal, because `metaData` lies for problems
 * LeetCode judges manually: Clone Graph's metadata claims `integer[][]` →
 * `boolean` while its real signature takes and returns a custom `Node`.
 *
 * A bare `Node` class is LeetCode's custom node: `next`/`random` make it a
 * linked list, `neighbors` makes it a graph — a custom class by another name.
 */
export function starterNodeShape(
  starter: string,
): "tree" | "linked_list" | "design" | null {
  if (/\bTreeNode\b/.test(starter)) return "tree";
  if (/\bListNode\b/.test(starter)) return "linked_list";
  if (/class\s+Node\b/.test(starter)) {
    return /\bnext\b/.test(starter) ? "linked_list" : "design";
  }
  return null;
}

/**
 * Design problems the shared call script already judges. A later manifest
 * rebuild must not put them back on the deferred list.
 */
const CALL_SCRIPT_READY = new Set(["min-stack", "time-based-key-value-store"]);

/**
 * Ordinary `double` returns judged with the absolute `1e-5` tolerance mode.
 * `powx-n` stays deferred until it is authored.
 */
const TOLERANCE_READY = new Set(["median-of-two-sorted-arrays"]);

/** Whether this harness can judge the problem, and why not when it cannot. */
export function classify(
  question: QuestionShape,
  meta: MetaData,
  slug?: string,
): { status: "ready" | "deferred"; reason?: DeferReason } {
  if (question.isPaidOnly) return { status: "deferred", reason: "premium" };

  const pythonStarter = pythonStarterOf(question);
  if (pythonStarter.trim().length === 0) {
    return { status: "deferred", reason: "premium" };
  }

  const nodeShape = starterNodeShape(pythonStarter);
  if (nodeShape === "tree") return { status: "deferred", reason: "tree" };
  if (nodeShape === "linked_list") return { status: "deferred", reason: "linked_list" };
  if (nodeShape === "design") return { status: "deferred", reason: "design" };

  if (mentionsType(pythonStarter, meta, "TreeNode")) {
    return { status: "deferred", reason: "tree" };
  }
  if (mentionsType(pythonStarter, meta, "ListNode")) {
    return { status: "deferred", reason: "linked_list" };
  }
  // Multi-method classes are design problems unless the call script already
  // covers this slug.
  if (hasNodeShape(meta) || solutionMethods(pythonStarter) > 1) {
    if (slug !== undefined && CALL_SCRIPT_READY.has(slug)) {
      return { status: "ready" };
    }
    return { status: "deferred", reason: "design" };
  }

  const returnType = meta.return?.type;
  if (returnType === "void" || returnType === "null" || returnType === "None") {
    return { status: "deferred", reason: "in_place_void" };
  }

  const kinds = [
    ...(meta.params ?? []).map((param) => kindFor(param.type)),
    kindFor(returnType),
  ];
  if (kinds.some((kind) => kind === null)) {
    return { status: "deferred", reason: "unsupported_kind" };
  }
  if (kindFor(returnType) === "double") {
    if (slug !== undefined && TOLERANCE_READY.has(slug)) {
      return { status: "ready" };
    }
    return { status: "deferred", reason: "float_return" };
  }
  return { status: "ready" };
}

export const DEFER_REASON_LABEL: Record<DeferReason, string> = {
  premium: "LeetCode-premium only: no public statement, starter, or examples",
  design: "custom classes or multi-method dispatch",
  linked_list: "linked lists: needs serialising the harness does not have",
  tree: "trees: needs level-order parsing the harness does not have",
  in_place_void: "in-place `void` contracts are deferred",
  float_return: "float return not yet authored (powx-n); absolute 1e-5 tolerance exists",
  unsupported_kind: "argument or return kind outside VALUE_KINDS",
};
