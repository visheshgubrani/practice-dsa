/**
 * Catalog checks that run before seed or execution.
 *
 * A malformed problem fails here with a sentence that names the slug and the
 * field, rather than as a wrong-answer verdict later. Authoring may omit
 * `expected` (conformance prints a candidate for hand review). Judging and
 * seed may not, and nothing here writes an expectation in to fill the gap.
 *
 * Completeness for the Phase 4 authoring workflow (statement, constraints,
 * notes, compare, return-value signature, starter/reference method) is
 * enforced here so a thin module never reaches seed.
 */

import {
  describeKindMismatch,
  describeKindMismatches,
  matchesKind,
  type ArgValue,
} from "@/lib/harness/args";
import type { ClassCalls } from "@/lib/problems";
import type { AuthoredProblem } from "@/lib/problems/authoring";

export type ValidateOptions = {
  /**
   * When true, every testcase must have a JSON `expected` whose shape matches
   * the signature's return kind. Seed and judging pass true. Authoring passes
   * false so a case can wait for a reviewed candidate.
   */
  requireExpected?: boolean;
};

function at(slug: string, suffix: string): string {
  return `${slug}: ${suffix}`;
}

function preview(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function hasPythonDef(source: string, name: string): boolean {
  return new RegExp(`\\bdef\\s+${name}\\s*\\(`).test(source);
}

function hasPythonClass(source: string, name: string): boolean {
  return new RegExp(`\\bclass\\s+${name}\\b`).test(source);
}

function checkCallScript(
  args: readonly ArgValue[],
  calls: ClassCalls,
  slug: string,
  label: string,
): string[] {
  if (args.length !== 2) {
    return [at(slug, `${label} call script must be [ops, args]`)];
  }

  const [ops, argv] = args;
  if (!Array.isArray(ops) || ops.some((op) => typeof op !== "string")) {
    return [at(slug, `${label} ops must be a list of method names`)];
  }
  if (!Array.isArray(argv) || argv.some((call) => !Array.isArray(call))) {
    return [at(slug, `${label} args must be a list of argument lists`)];
  }
  if (ops.length === 0 || ops.length !== argv.length) {
    return [
      at(slug, `${label} ops and args must be equal-length and non-empty`),
    ];
  }

  const issues: string[] = [];
  if (ops[0] !== calls.className) {
    issues.push(at(slug, `${label} must start with ${calls.className}`));
  }

  const constructorArgs = argv[0] as ArgValue[];
  if (constructorArgs.length !== calls.constructorParams.length) {
    issues.push(
      at(
        slug,
        `${label} constructor has ${constructorArgs.length} argument${constructorArgs.length === 1 ? "" : "s"}, ` +
          `signature expects ${calls.constructorParams.length}`,
      ),
    );
  } else {
    for (const [index, kind] of calls.constructorParams.entries()) {
      issues.push(
        ...describeKindMismatch(
          constructorArgs[index],
          kind,
          `${label} constructor argument ${index + 1}`,
        ).map((mismatch) => at(slug, mismatch)),
      );
    }
  }

  for (let index = 1; index < ops.length; index += 1) {
    const name = ops[index] as string;
    const method = calls.methods[name];
    const call = argv[index] as ArgValue[];
    if (!method) {
      issues.push(
        at(slug, `${label} calls ${name}, which the signature does not allow`),
      );
      continue;
    }
    if (call.length !== method.params.length) {
      issues.push(
        at(
          slug,
          `${label} ${name} has ${call.length} argument${call.length === 1 ? "" : "s"}, ` +
            `signature expects ${method.params.length}`,
        ),
      );
      continue;
    }
    for (const [argIndex, kind] of method.params.entries()) {
      issues.push(
        ...describeKindMismatch(
          call[argIndex],
          kind,
          `${label} ${name} argument ${argIndex + 1}`,
        ).map((mismatch) => at(slug, mismatch)),
      );
    }
  }

  return issues;
}

function checkArgs(
  args: readonly ArgValue[],
  problem: AuthoredProblem,
  label: string,
): string[] {
  if (problem.signature.calls) {
    return checkCallScript(
      args,
      problem.signature.calls,
      problem.slug,
      label,
    );
  }

  const expected = problem.signature.params.length;
  if (args.length !== expected) {
    return [
      at(
        problem.slug,
        `${label} has ${args.length} argument${args.length === 1 ? "" : "s"}, ` +
          `signature expects ${expected}`,
      ),
    ];
  }

  const mismatches = describeKindMismatches(args, problem.signature);
  return mismatches.map((mismatch) => at(problem.slug, `${label} — ${mismatch}`));
}

function checkExpected(
  raw: string | undefined,
  problem: AuthoredProblem,
  label: string,
  requireExpected: boolean,
): string[] {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.length === 0) {
    return requireExpected
      ? [at(problem.slug, `${label} has no expected value`)]
      : [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [
      at(
        problem.slug,
        `${label} expects ${JSON.stringify(raw)}, which is not JSON`,
      ),
    ];
  }

  if (!matchesKind(parsed, problem.signature.returns)) {
    return [
      at(
        problem.slug,
        `${label} expects ${preview(parsed)}, which is not ${problem.signature.returns}`,
      ),
    ];
  }

  return [];
}

function checkCallExpected(
  raw: string | undefined,
  args: readonly ArgValue[],
  problem: AuthoredProblem,
  label: string,
  requireExpected: boolean,
): string[] {
  const calls = problem.signature.calls;
  if (!calls) return [];

  const trimmed = raw?.trim() ?? "";
  if (trimmed.length === 0) {
    return requireExpected
      ? [at(problem.slug, `${label} has no expected value`)]
      : [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [
      at(
        problem.slug,
        `${label} expects ${JSON.stringify(raw)}, which is not JSON`,
      ),
    ];
  }

  const ops = args[0];
  if (!Array.isArray(parsed) || !Array.isArray(ops) || parsed.length !== ops.length) {
    return [
      at(
        problem.slug,
        `${label} expects ${preview(parsed)}, which is not a call-result list matching the script`,
      ),
    ];
  }

  const issues: string[] = [];
  if (parsed[0] !== null) {
    issues.push(at(problem.slug, `${label} constructor result must be null`));
  }

  for (let index = 1; index < ops.length; index += 1) {
    const name = ops[index];
    if (typeof name !== "string") continue;
    const method = calls.methods[name];
    if (!method) continue;
    const value = parsed[index];
    if (method.returns === "void") {
      if (value !== null) {
        issues.push(at(problem.slug, `${label} ${name} result must be null`));
      }
    } else if (!matchesKind(value, method.returns)) {
      issues.push(
        at(
          problem.slug,
          `${label} ${name} result ${preview(value)} is not ${method.returns}`,
        ),
      );
    }
  }

  return issues;
}

/**
 * The marker `scripts/catalog-scaffold.mts` leaves behind for every field a
 * human has to write. A draft carrying one is not a problem yet, so it cannot
 * pass conformance, cannot seed, and cannot reach the app.
 */
const DRAFT_MARKER = /\bTODO\(/;

/** Which authored fields still carry a draft marker, as printable labels. */
function draftMarkers(problem: AuthoredProblem): string[] {
  const marked: string[] = [];

  const check = (label: string, value: string | undefined): void => {
    if (value && DRAFT_MARKER.test(value)) marked.push(label);
  };

  check("statement", problem.statement);
  for (const [index, constraint] of problem.constraints.entries()) {
    check(`constraint ${index + 1}`, constraint);
  }
  check("approach notes", problem.notes.approach);
  check("time complexity notes", problem.notes.timeComplexity);
  check("space complexity notes", problem.notes.spaceComplexity);
  for (const [index, example] of problem.examples.entries()) {
    check(`example ${index + 1} output`, example.output);
    check(`example ${index + 1} explanation`, example.explanation);
  }
  for (const [index, testcase] of problem.testcases.entries()) {
    check(`testcase ${index + 1} expected`, testcase.expected);
    check(`testcase ${index + 1} note`, testcase.note);
  }
  check("rejection fixture", problem.rejection);

  return marked;
}

/** Everything wrong with one authored problem, as sentences ready to print. */
export function validateProblem(
  problem: AuthoredProblem,
  options: ValidateOptions = {},
): string[] {
  const requireExpected = options.requireExpected ?? false;
  const issues: string[] = [];

  const marked = draftMarkers(problem);
  if (marked.length > 0) {
    issues.push(
      at(problem.slug, `is still a draft — replace the TODO marker in: ${marked.join(", ")}`),
    );
  }

  if (problem.statement.trim().length === 0) {
    issues.push(at(problem.slug, "has no statement"));
  }

  const constraints = problem.constraints.filter(
    (constraint) => constraint.trim().length > 0,
  );
  if (constraints.length === 0) {
    issues.push(at(problem.slug, "has no constraints"));
  }

  if (problem.notes.approach.trim().length === 0) {
    issues.push(at(problem.slug, "has no approach notes"));
  }
  if (problem.notes.timeComplexity.trim().length === 0) {
    issues.push(at(problem.slug, "has no time complexity notes"));
  }
  if (problem.notes.spaceComplexity.trim().length === 0) {
    issues.push(at(problem.slug, "has no space complexity notes"));
  }

  if (!problem.compare) {
    issues.push(at(problem.slug, "missing compare policy"));
  }

  const method = problem.signature.name.trim();
  if (!isIdentifier(method)) {
    issues.push(at(problem.slug, "signature name is not a Python identifier"));
  }

  const calls = problem.signature.calls;
  const trip = problem.signature.roundTrip;
  const methods: string[] = [];

  if (calls && trip) {
    issues.push(
      at(problem.slug, "a signature cannot be both a call script and a round trip"),
    );
  }

  if (calls) {
    if (calls.className !== method) {
      issues.push(
        at(problem.slug, "call class name must match the signature name"),
      );
    }
    if (!isIdentifier(calls.className)) {
      issues.push(
        at(problem.slug, "call class name is not a Python identifier"),
      );
    }
    const methodNames = Object.keys(calls.methods);
    if (methodNames.length === 0) {
      issues.push(at(problem.slug, "call script has no methods"));
    }
    for (const name of methodNames) {
      if (!isIdentifier(name)) {
        issues.push(
          at(problem.slug, `call method ${name} is not a Python identifier`),
        );
      }
    }
    methods.push("__init__", ...methodNames);
  } else {
    if (problem.signature.params.length === 0) {
      issues.push(at(problem.slug, "signature has no parameters"));
    }
    if (problem.signature.returns === "void") {
      issues.push(
        at(
          problem.slug,
          "returns void; in-place output contracts are deferred — use a return-value signature",
        ),
      );
    }
    methods.push(method);
  }

  if (trip && !calls) {
    if (problem.signature.returns === "void") {
      issues.push(
        at(problem.slug, "a round trip must return the decoded value"),
      );
    }
    for (const [role, name] of [
      ["encode", trip.encode],
      ["decode", trip.decode],
    ] as const) {
      if (!isIdentifier(name)) {
        issues.push(
          at(problem.slug, `round-trip ${role} name is not a Python identifier`),
        );
      }
    }
    if (isIdentifier(trip.encode) && trip.encode !== method) {
      issues.push(
        at(problem.slug, "round-trip encode name must match the signature name"),
      );
    }
    if (isIdentifier(trip.decode) && trip.decode !== method) {
      methods.push(trip.decode);
    }
  }

  const className = calls?.className ?? "";
  const starter = problem.starterCode.python ?? "";
  if (starter.trim().length === 0) {
    issues.push(at(problem.slug, "no starter code for python"));
  } else {
    if (calls && isIdentifier(className) && !hasPythonClass(starter, className)) {
      issues.push(
        at(problem.slug, `python starter does not define class ${className}`),
      );
    }
    for (const name of methods) {
      if (isIdentifier(name) && !hasPythonDef(starter, name)) {
        issues.push(
          at(problem.slug, `python starter does not define ${name}`),
        );
      }
    }
  }

  const reference = problem.reference ?? "";
  if (reference.trim().length === 0) {
    issues.push(at(problem.slug, "no python reference solution"));
  } else {
    if (calls && isIdentifier(className) && !hasPythonClass(reference, className)) {
      issues.push(
        at(problem.slug, `python reference does not define class ${className}`),
      );
    }
    for (const name of methods) {
      if (isIdentifier(name) && !hasPythonDef(reference, name)) {
        issues.push(
          at(problem.slug, `python reference does not define ${name}`),
        );
      }
    }
  }

  if (problem.testcases.length === 0) {
    issues.push(at(problem.slug, "has no testcases, so nothing can be judged"));
  }

  for (const [index, example] of problem.examples.entries()) {
    issues.push(
      ...checkArgs(example.args, problem, `example ${index + 1}`),
    );
  }

  for (const [index, testcase] of problem.testcases.entries()) {
    const label = `testcase ${index + 1}`;
    issues.push(...checkArgs(testcase.args, problem, label));
    issues.push(
      ...(problem.signature.calls
        ? checkCallExpected(
            testcase.expected,
            testcase.args,
            problem,
            label,
            requireExpected,
          )
        : checkExpected(
            testcase.expected,
            problem,
            label,
            requireExpected,
          )),
    );
  }

  return issues;
}

/**
 * Per-problem checks plus unique slugs and numbers across the catalog.
 */
export function validateCatalog(
  problems: readonly AuthoredProblem[],
  options: ValidateOptions = {},
): string[] {
  const issues: string[] = [];
  const slugs = new Map<string, number>();
  const numbers = new Map<number, string>();

  for (const problem of problems) {
    const seenSlug = slugs.get(problem.slug);
    if (seenSlug !== undefined) {
      issues.push(
        at(
          problem.slug,
          `slug is reused by problem ${seenSlug} and problem ${problem.number}`,
        ),
      );
    } else {
      slugs.set(problem.slug, problem.number);
    }

    const seenNumber = numbers.get(problem.number);
    if (seenNumber !== undefined) {
      issues.push(
        `problem number ${problem.number} is used by both ${seenNumber} and ${problem.slug}`,
      );
    } else {
      numbers.set(problem.number, problem.slug);
    }

    issues.push(...validateProblem(problem, options));
  }

  return issues;
}
