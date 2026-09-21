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
  describeKindMismatches,
  matchesKind,
  type ArgValue,
} from "@/lib/harness/args";
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

function checkArgs(
  args: readonly ArgValue[],
  problem: AuthoredProblem,
  label: string,
): string[] {
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

/** Everything wrong with one authored problem, as sentences ready to print. */
export function validateProblem(
  problem: AuthoredProblem,
  options: ValidateOptions = {},
): string[] {
  const requireExpected = options.requireExpected ?? false;
  const issues: string[] = [];

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

  const starter = problem.starterCode.python ?? "";
  if (starter.trim().length === 0) {
    issues.push(at(problem.slug, "no starter code for python"));
  } else if (isIdentifier(method) && !hasPythonDef(starter, method)) {
    issues.push(
      at(problem.slug, `python starter does not define ${method}`),
    );
  }

  const reference = problem.reference ?? "";
  if (reference.trim().length === 0) {
    issues.push(at(problem.slug, "no python reference solution"));
  } else if (isIdentifier(method) && !hasPythonDef(reference, method)) {
    issues.push(
      at(problem.slug, `python reference does not define ${method}`),
    );
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
      ...checkExpected(
        testcase.expected,
        problem,
        label,
        requireExpected,
      ),
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
