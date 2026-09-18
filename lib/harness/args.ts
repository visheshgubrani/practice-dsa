import {
  type ProblemSignature,
  type SignatureParam,
  type ValueKind,
} from "@/lib/problems";

/**
 * The bridge between authored arguments and what a program (or the console) sees.
 *
 * Catalog modules write `args`. `formatArguments` turns them into the display
 * stdin the console shows. `encodeJsonArgs` is what the Python harness reads —
 * a JSON array, decoded and splatted into the signature's method. Display text
 * is never parsed on that path.
 *
 * `parseArguments` stays for the 2.4 stdin → `arguments` backfill. The judging
 * path sends `encodeJsonArgs` and never parses display text.
 */

/** One argument, parsed and still language-neutral. */
export type ArgValue = string | number | boolean | null | ArgValue[];

export type ParseArgsResult =
  | { ok: true; values: ArgValue[]; byName: Record<string, ArgValue> }
  | { ok: false; error: string };

/** A single `name = <json>` line, with or without spaces around the `=`. */
const LINE = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/**
 * Parses generated display stdin into the argument list for `signature`.
 *
 * Used to backfill `arguments` in 2.4. Order does not have to match the
 * signature: each value is routed by the name on its line.
 */
export function parseArguments(
  stdin: string,
  signature: ProblemSignature,
): ParseArgsResult {
  const values = new Map<string, ArgValue>();

  const lines = stdin
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const expected = signature.params.map((param) => param.name);

  for (const [index, line] of lines.entries()) {
    const match = LINE.exec(line);
    if (!match) {
      return {
        ok: false,
        error: `line ${index + 1} is not "name = value": ${JSON.stringify(line)}`,
      };
    }

    const [, name, raw] = match;
    const param = signature.params.find((candidate) => candidate.name === name);

    if (!param) {
      return {
        ok: false,
        error:
          `line ${index + 1} names "${name}", which is not an argument ` +
          `(expected: ${expected.join(", ") || "none"})`,
      };
    }

    if (values.has(name)) {
      return { ok: false, error: `line ${index + 1} repeats "${name}"` };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        error: `line ${index + 1} ("${name}") is not a JSON value: ${JSON.stringify(raw)}`,
      };
    }

    values.set(name, parsed as ArgValue);
  }

  const missing = expected.filter((name) => !values.has(name));
  if (missing.length > 0) {
    return { ok: false, error: `no value for ${missing.join(", ")}` };
  }

  const byName: Record<string, ArgValue> = {};
  for (const param of signature.params) {
    byName[param.name] = values.get(param.name) as ArgValue;
  }

  return {
    ok: true,
    values: signature.params.map((param) => byName[param.name]),
    byName,
  };
}

/** `parseArguments` or a thrown error — for callers that cannot continue. */
export function requireArguments(
  stdin: string,
  signature: ProblemSignature,
): ArgValue[] {
  const parsed = parseArguments(stdin, signature);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.values;
}

/**
 * Renders arguments into the canonical form of a testcase's console `stdin`.
 *
 * Catalog modules author `args`, not this string. Seed and the public problem
 * view generate it here so the console always shows the values the program is
 * actually called with.
 */
export function formatArguments(
  args: readonly ArgValue[],
  signature: ProblemSignature,
): string {
  return signature.params
    .map((param, index) => `${param.name} = ${JSON.stringify(args[index])}`)
    .join("\n");
}

/**
 * One-line sample input for the statement's Examples section.
 *
 * Same `name = json` fragments as `formatArguments` — so the values are the
 * executable ones — joined with commas instead of newlines.
 */
export function formatSampleInput(
  args: readonly ArgValue[],
  signature: ProblemSignature,
): string {
  return formatArguments(args, signature).replaceAll("\n", ", ");
}

/** JSON array the Python harness decodes and passes to the solution method. */
export function encodeJsonArgs(args: readonly ArgValue[]): string {
  return JSON.stringify(args);
}

/**
 * JSON stdin for one stored case, recovered from display text.
 *
 * Production judging uses `encodeJsonArgs` on stored `arguments`. This remains
 * for tests and for the 2.4 backfill's parse-then-encode path.
 */
export function jsonHarnessInput(
  stdin: string,
  signature: ProblemSignature,
): { ok: true; encoded: string } | { ok: false; error: string } {
  const parsed = parseArguments(stdin, signature);
  if (!parsed.ok) return parsed;
  return { ok: true, encoded: encodeJsonArgs(parsed.values) };
}

/**
 * Recovers stored `arguments` from display stdin for the 2.4 backfill.
 *
 * Kind-checked so a boolean cannot sneak into an int array the way a shallow
 * JSON parse would allow.
 */
export function argumentsFromDisplayStdin(
  stdin: string,
  signature: ProblemSignature,
): { ok: true; values: ArgValue[] } | { ok: false; error: string } {
  const parsed = parseArguments(stdin, signature);
  if (!parsed.ok) return parsed;
  const mismatches = describeKindMismatches(parsed.values, signature);
  if (mismatches.length > 0) {
    return { ok: false, error: mismatches.join("; ") };
  }
  return { ok: true, values: parsed.values };
}

/**
 * The JSON type a kind deserializes to, checked recursively.
 *
 * Integers are not booleans. Numeric kinds must be finite. `int` is a signed
 * 32-bit value; `long` is a JSON-safe integer (`Number.isSafeInteger`) so a
 * catalog value cannot silently lose precision before it reaches the harness.
 */
export const INT32_MIN = -2_147_483_648;
export const INT32_MAX = 2_147_483_647;

function isInt32(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= INT32_MIN &&
    value <= INT32_MAX
  );
}

function isSafeInt(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function elementKind(kind: ValueKind): ValueKind | null {
  switch (kind) {
    case "int[]":
      return "int";
    case "long[]":
      return "long";
    case "double[]":
      return "double";
    case "bool[]":
      return "bool";
    case "string[]":
      return "string";
    case "int[][]":
      return "int[]";
    case "string[][]":
      return "string[]";
    default:
      return null;
  }
}

function preview(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function matchesKind(value: unknown, kind: ValueKind): boolean {
  switch (kind) {
    case "int":
      return isInt32(value);
    case "long":
      return isSafeInt(value);
    case "double":
      return isFiniteNumber(value);
    case "bool":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "int[]":
    case "long[]":
    case "double[]":
    case "bool[]":
    case "string[]":
    case "int[][]":
    case "string[][]": {
      if (!Array.isArray(value)) return false;
      const inner = elementKind(kind);
      return inner !== null && value.every((entry) => matchesKind(entry, inner));
    }
    case "void":
      return value === null;
  }
}

/** Paths of every value that does not match its declared kind. */
export function describeKindMismatch(
  value: unknown,
  kind: ValueKind,
  path: string,
): string[] {
  if (matchesKind(value, kind)) return [];

  const inner = elementKind(kind);
  if (inner && Array.isArray(value)) {
    const nested = value.flatMap((entry, index) =>
      describeKindMismatch(entry, inner, `${path}[${index}]`),
    );
    if (nested.length > 0) return nested;
  }

  return [`${path} = ${preview(value)} is not ${kind}`];
}

/** Names every parameter whose value does not match its declared kind. */
export function describeKindMismatches(
  args: readonly unknown[],
  signature: ProblemSignature,
): string[] {
  return signature.params.flatMap((param: SignatureParam, index) =>
    describeKindMismatch(args[index], param.kind, param.name),
  );
}
