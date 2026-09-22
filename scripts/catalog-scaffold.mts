#!/usr/bin/env node

/**
 * Turns one fetched snapshot into a draft problem module.
 *
 *   pnpm catalog:scaffold --slug top-k-frequent-elements
 *
 * What it writes, from the snapshot and the manifest alone:
 *
 *   - identity: slug, number, LeetCode title, difficulty, topic tags + `neetcode-150`
 *   - the signature, derived from LeetCode's `metaData` through `VALUE_KINDS`
 *   - the LeetCode python starter, verbatim
 *   - the MIT reference solution, verbatim
 *   - the examples' *arguments* (LeetCode's own example inputs)
 *   - a hidden-case battery per argument kind
 *
 * What it deliberately does not write, because a machine cannot:
 *
 *   - the statement and the constraints in your own words
 *   - why each example explains what it does
 *   - any `expected` value at all
 *   - a plausible wrong answer for `rejection`
 *
 * Every one of those leaves a `TODO(` marker, which `validateCatalog` refuses —
 * so a draft cannot pass conformance, cannot seed, and cannot reach the app
 * until a human has replaced it. Expectations come from `pnpm problems:check`,
 * which prints a candidate per missing case for review, and never writes one.
 */

import { readFile, writeFile } from "node:fs/promises";

import type { ArgValue } from "@/lib/harness/args";
import type { ValueKind } from "@/lib/problems";

import { DEFER_REASON_LABEL, kindFor, type Manifest, type MetaData, type Snapshot } from "./catalog-sheet";

const MANIFEST_PATH = "docs/catalog/neetcode-150.json";
const SOURCES_DIR = "docs/catalog/sources";
const MODULES_DIR = "lib/problems";

/** How many hidden cases a scaffold proposes. Conformance requires eight. */
const HIDDEN_CASES = 10;

type ParsedArgs = { slug: string; force: boolean };

type Param = { name: string; kind: ValueKind };

type Draft = {
  identifier: string;
  method: string;
  params: Param[];
  returns: ValueKind;
};

function parseArgs(argv: string[]): ParsedArgs {
  let slug: string | undefined;
  let force = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--slug") slug = argv[++index];
    else if (arg === "--force") force = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!slug) throw new Error("usage: pnpm catalog:scaffold --slug <slug> [--force]");
  return { slug, force };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

/** `Two Sum II - Input Array Is Sorted` → `Two Sum II` → `twoSumIi`. */
function identifierFrom(title: string, method: string): string {
  const short = title.split(" - ")[0]!.trim();
  const words = short
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const camel = words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(camel) && camel.length > 0) return camel;
  return method;
}

/** A python string as a TS template literal that cannot be broken by its own text. */
function pythonBlock(source: string): string {
  const escaped = source
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
  const body = escaped.endsWith("\n") ? escaped.slice(0, -1) : escaped;
  return "`" + body + "\n`";
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

/**
 * `[[2,7,11,15],9]` → `[[2, 7, 11, 15], 9]`: the spacing the catalog already
 * uses, so a scaffolded draft reads like a hand-written module. Commas inside a
 * string are left alone.
 */
function prettyJson(value: unknown): string {
  const text = JSON.stringify(value);
  let out = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    out += char;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === ",") out += " ";
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Constraint bounds
 *
 * LeetCode's constraints are prose, and a battery that ignores them proposes
 * cases the problem does not allow. Only the simple, unambiguous forms are
 * read; anything else leaves the battery at its defaults, which the author
 * reviews anyway.
 * ------------------------------------------------------------------ */

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** `10⁵` → `100000`, so a bound can be compared as a number. */
export function expandExponents(text: string): string {
  return text.replace(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_match, base: string, digits: string) => {
    const exponent = Number([...digits].map((char) => SUPERSCRIPT_DIGITS[char]).join(""));
    return String(Number(base) ** exponent);
  });
}

type Bounds = { min?: number; max?: number };

/** Bounds keyed by the expression they constrain: `k`, `nums.length`, `nums[i]`. */
export function parseBounds(constraints: readonly string[]): Map<string, Bounds> {
  const bounds = new Map<string, Bounds>();

  const record = (key: string, side: keyof Bounds, value: number): void => {
    const entry = bounds.get(key) ?? {};
    entry[side] = value;
    bounds.set(key, entry);
  };

  for (const raw of constraints) {
    const text = expandExponents(raw.replace(/`/g, "").trim());
    const between = text.match(/^(-?[\d]+)\s*<=\s*(.+?)\s*<=\s*(-?[\d]+)$/);
    if (between) {
      record(between[2]!.trim(), "min", Number(between[1]));
      record(between[2]!.trim(), "max", Number(between[3]));
      continue;
    }
    const upper = text.match(/^(.+?)\s*<=\s*(-?[\d]+)$/);
    if (upper) {
      record(upper[1]!.trim(), "max", Number(upper[2]));
      continue;
    }
    const lower = text.match(/^(-?[\d]+)\s*<=\s*(.+)$/);
    if (lower) {
      record(lower[2]!.trim(), "min", Number(lower[1]));
      continue;
    }
    // Prose bounds (`k` is in the range `[1, …]`) still state a floor.
    const range = text.match(/^(\w+)\s+is in the range\s*\[(\d+),/);
    if (range) {
      record(range[1]!, "min", Number(range[2]));
    }
  }

  return bounds;
}

/** The interesting values of an int parameter, given whatever bounds are known. */
function intCandidates(bounds: Bounds | undefined): number[] {
  const min = bounds?.min ?? Number.NEGATIVE_INFINITY;
  const max = bounds?.max ?? Number.POSITIVE_INFINITY;
  const candidates = [1, 2, 3, 0, 10, -1];
  if (Number.isFinite(min)) candidates.push(min, min + 1);
  if (Number.isFinite(max) && max < 100_000) candidates.push(max, Math.max(min, max - 1));
  return [...new Set(candidates)].filter((value) => value >= min && value <= max);
}

function multiply<T>(values: T[], length: number, filler: T): T[] {
  if (values.length >= length) return values;
  return [...values, ...Array.from({ length: length - values.length }, () => filler)];
}

type Battery = { rows: ArgValue[][]; labels: string[] };

/**
 * A per-kind battery: the smallest input, all-equal, ascending, descending,
 * duplicates, and a negative case, sized to whatever length the constraints
 * demand. Deliberately never empty — "empty inputs only when the contract
 * allows them" is a judgement the author makes, not a default.
 */
export function batteryFor(params: readonly Param[], constraints: readonly string[]): Battery {
  const bounds = parseBounds(constraints);

  const candidatesFor = (param: Param): ArgValue[] => {
    const own = bounds.get(param.name);
    const length = own?.min && own.min > 1 ? Math.min(own.min, 8) : 0;

    switch (param.kind) {
      case "int":
        return intCandidates(own);
      case "long":
        return [0, 1, -1, 2];
      case "double":
        return [0, 0.5, -1.5];
      case "bool":
        return [true, false];
      case "string":
        return ["a", "ab", "aa", "abc", "aab", "racecar"];
      case "int[]":
        return [
          multiply([0], length, 0),
          multiply([1], length, 1),
          multiply([2, 1], length, 0),
          multiply([1, 2, 3], length, 1),
          multiply([3, 2, 1], length, 1),
          multiply([1, 1, 1], length, 1),
          multiply([-1, -2, -3], length, -1),
        ];
      case "string[]":
        return [
          multiply(["a"], length, "a"),
          multiply(["a", "b"], length, "a"),
          multiply(["aa", "aa"], length, "aa"),
          multiply(["a", "ab", "b"], length, "a"),
        ];
      case "int[][]":
        return [
          multiply([[0]], length, [0]),
          multiply([[1, 2]], length, [1, 2]),
          multiply([[1, 2], [2, 3]], length, [1, 2]),
          multiply([[0, 1], [1, 0]], length, [0, 1]),
        ];
      case "string[][]":
        return [
          multiply([["a"]], length, ["a"]),
          multiply([["a", "b"]], length, ["a", "b"]),
          multiply([["#", "."], [".", "#"]], length, ["#", "."]),
        ];
      case "bool[]":
        return [multiply([true], length, true), multiply([false, true], length, true)];
      case "double[]":
        return [multiply([0], length, 0), multiply([1.5, -2.5], length, 1.5)];
      case "long[]":
        return [multiply([0], length, 0), multiply([1, -1], length, 1)];
      case "void":
        return [];
    }
  };

  const pools = params.map((param) => {
    const candidates = candidatesFor(param);
    return candidates.length > 0 ? candidates : [null];
  });

  const rows: ArgValue[][] = [];
  const labels: string[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < HIDDEN_CASES * 4 && rows.length < HIDDEN_CASES; attempt += 1) {
    const row = params.map((_param, index) => {
      const pool = pools[index]!;
      return pool[(attempt + index * 3) % pool.length]!;
    });
    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
    labels.push(
      params
        .map((param, index) => `${param.name}=${JSON.stringify(row[index])}`)
        .join(", ")
        .slice(0, 72),
    );
  }

  return { rows, labels };
}

/** `int[]` → `return []`; a wrong answer a human replaces with a real near-miss. */
function rejectionStub(method: string, params: readonly Param[], returns: ValueKind): string {
  const empty: Record<string, string> = {
    int: "0",
    long: "0",
    double: "0.0",
    bool: "False",
    string: '""',
    "int[]": "[]",
    "long[]": "[]",
    "double[]": "[]",
    "bool[]": "[]",
    "string[]": "[]",
    "int[][]": "[]",
    "string[][]": "[]",
    void: "None",
  };
  const signature = params.map((param) => `${param.name}`).join(", ");
  return [
    "class Solution:",
    `    def ${method}(self, ${signature}):`,
    "        # TODO(rejection): replace with a plausible near-miss the suite rejects.",
    `        return ${empty[returns] ?? "None"}`,
  ].join("\n") + "\n";
}

function compareComment(returns: ValueKind): string[] {
  if (!returns.endsWith("[]")) {
    return ["  // `exact` unless this problem's answer may arrive in another order."];
  }
  return [
    "  // Order matters here. If LeetCode accepts the answer in any order, say so in the",
    "  // statement and use `unordered` (order inside a piece is free too) or",
    "  // `unordered_outer` (a set of ordered sequences: permutations, boards, cells).",
  ];
}

function renderModule(
  manifest: Manifest,
  problem: Manifest["problems"][number],
  snapshot: Snapshot,
  draft: Draft,
): string {
  const battery = batteryFor(draft.params, snapshot.constraints);
  const constraints =
    snapshot.constraints.length > 0
      ? snapshot.constraints
      : ["TODO(constraints): copy the problem's real bounds here."];

  const exampleRows: ArgValue[][] = [];
  for (let index = 0; index + draft.params.length <= snapshot.exampleTestcases.length; index += draft.params.length) {
    const row = snapshot.exampleTestcases.slice(index, index + draft.params.length).map((line) => {
      try {
        return JSON.parse(line) as ArgValue;
      } catch {
        return line;
      }
    });
    exampleRows.push(row);
    if (exampleRows.length === 3) break;
  }

  const examples = exampleRows.map((args) =>
    [
      "    {",
      `      args: ${prettyJson(args)},`,
      '      output: "TODO(example)",',
      '      explanation: "TODO(note)",',
      "    },",
    ].join("\n"),
  );

  const visible = exampleRows.map((args) =>
    [
      "    {",
      `      args: ${prettyJson(args)},`,
      '      note: "TODO(note)",',
      "    },",
    ].join("\n"),
  );

  const hidden = battery.rows.map((args, index) =>
    [
      "    {",
      `      args: ${prettyJson(args)},`,
      "      hidden: true,",
      `      note: ${jsString(battery.labels[index]!)},`,
      "    },",
    ].join("\n"),
  );

  const notes = snapshot.notes;

  return [
    'import type { AuthoredProblem } from "./authoring";',
    "",
    `export const ${draft.identifier} = {`,
    `  slug: ${jsString(problem.slug)},`,
    `  number: ${problem.number},`,
    `  title: ${jsString(problem.title)},`,
    `  difficulty: ${jsString(problem.difficulty)},`,
    `  tags: [${[...snapshot.topicTags, "neetcode-150"].map(jsString).join(", ")}],`,
    "  statement: [",
    `    ${jsString(`TODO(statement): write ${problem.title} in your own words and delete this marker.`)},`,
    '  ].join("\\n"),',
    "  examples: [",
    ...examples,
    "  ],",
    "  constraints: [",
    ...constraints.map((constraint) => `    ${jsString(constraint)},`),
    "  ],",
    "  testcases: [",
    ...visible,
    ...hidden,
    "  ],",
    "  starterCode: {",
    `    python: ${pythonBlock(snapshot.pythonStarter)},`,
    "  },",
    "  notes: {",
    `    approach: ${jsString(notes.approach ?? "TODO(approach): one paragraph on the idea.")},`,
    `    timeComplexity: ${jsString(notes.timeComplexity ?? "TODO(complexity)")},`,
    `    spaceComplexity: ${jsString(notes.spaceComplexity ?? "TODO(complexity)")},`,
    "  },",
    "  signature: {",
    `    name: ${jsString(draft.method)},`,
    "    params: [",
    ...draft.params.map(
      (param) => `      { name: ${jsString(param.name)}, kind: ${jsString(param.kind)} },`,
    ),
    "    ],",
    `    returns: ${jsString(draft.returns)},`,
    "  },",
    ...compareComment(draft.returns),
    '  compare: "exact",',
    `  sourceUrl: ${jsString(`https://leetcode.com/problems/${problem.slug}/`)},`,
    `  reference: ${pythonBlock(snapshot.referencePython ?? "")},`,
    `  rejection: ${pythonBlock(rejectionStub(draft.method, draft.params, draft.returns))},`,
    "} satisfies AuthoredProblem;",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await readJson<Manifest>(MANIFEST_PATH);
  const problem = manifest.problems.find((entry) => entry.slug === args.slug);
  if (!problem) throw new Error(`${args.slug} is not in ${MANIFEST_PATH}`);

  if (problem.status === "deferred") {
    const label = problem.reason ? DEFER_REASON_LABEL[problem.reason] : "deferred";
    throw new Error(
      `${problem.slug} is deferred (${problem.reason ?? "deferred"}): ${label}.\n` +
        "Authoring it means changing the harness first, which is a separate phase " +
        "(see docs/plan/07-neetcode-150.md). No file was written.",
    );
  }

  const snapshotPath = `${SOURCES_DIR}/${problem.slug}.json`;
  if (!(await exists(snapshotPath))) {
    throw new Error(
      `${snapshotPath} is missing. Run: pnpm catalog:fetch --slug ${problem.slug}`,
    );
  }
  const snapshot = await readJson<Snapshot>(snapshotPath);

  if (!snapshot.referencePython) {
    throw new Error(
      `${problem.slug} has no reference in neetcode-gh/leetcode (${snapshot.referencePath ?? "no path"}). ` +
        "Author the reference by hand, or leave the problem out of this batch.",
    );
  }

  const meta = snapshot.metaData as MetaData;
  const method = meta.name ?? "";
  if (method.length === 0 || !meta.return?.type) {
    throw new Error(`${problem.slug} has no usable metaData; author the signature by hand.`);
  }

  const params: Param[] = (meta.params ?? []).map((param) => {
    const kind = kindFor(param.type);
    if (!kind) throw new Error(`${problem.slug}: ${param.type} is not a ValueKind`);
    return { name: param.name, kind };
  });
  const returns = kindFor(meta.return.type);
  if (!returns) throw new Error(`${problem.slug}: ${meta.return.type} is not a ValueKind`);
  if (params.length === 0) throw new Error(`${problem.slug} has no parameters`);

  const draft: Draft = {
    identifier: identifierFrom(problem.title, method),
    method,
    params,
    returns,
  };

  const modulePath = `${MODULES_DIR}/${problem.slug}.ts`;
  if (!args.force && (await exists(modulePath))) {
    throw new Error(`${modulePath} already exists. Pass --force to overwrite it.`);
  }

  await writeFile(modulePath, renderModule(manifest, problem, snapshot, draft), "utf8");

  console.log(`Wrote ${modulePath}`);
  console.log(
    `  ${problem.number}. ${problem.title} · ${method}(${params
      .map((param) => `${param.name}: ${param.kind}`)
      .join(", ")}) → ${returns}`,
  );
  console.log(`  reference: ${snapshot.referencePath} (MIT, neetcode-gh/leetcode)`);
  console.log(
    `  article:   ${snapshot.articlePath ?? "none"}` +
      (snapshot.articlePath && !snapshot.articleVerified ? " (matched by name only)" : ""),
  );
  console.log(`  constraints: ${snapshot.constraints.length} extracted`);
  console.log(`  snapshot:   ${snapshotPath} — the statement HTML and article live there`);
  console.log("");
  console.log("Next, in this order:");
  console.log("  1. Write the statement and confirm the constraints.");
  console.log("  2. Replace TODO(note) on the visible cases and the examples.");
  console.log("  3. Review the hidden battery; keep 8+ real edge cases, replace the rest.");
  console.log("  4. Confirm `compare` against the problem's ordering rules.");
  console.log("  5. Replace the rejection stub with a real near-miss.");
  console.log("  6. pnpm problems:check --slug " + problem.slug + "  (paste reviewed expectations)");
  console.log("  7. pnpm db:seed && pnpm piston:check");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
