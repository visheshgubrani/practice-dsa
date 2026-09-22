#!/usr/bin/env node

/**
 * Docker-free catalog conformance.
 *
 * Runs repository-authored Python reference solutions locally against every
 * visible and hidden case, using the production harness and comparator.
 * Missing expectations print a candidate and fail until they are added by
 * hand. Mismatches are never rewritten.
 *
 * Requires Python 3. Does not need Postgres or Docker.
 *
 * Usage:
 *   pnpm problems:check                  the whole catalog — the gate
 *   pnpm problems:check --slug two-sum   one problem, for iteration
 *   pnpm problems:check --group Stack    one roadmap group, for a batch
 *
 * A narrowed run is a fast loop, not a gate: only the whole catalog proves the
 * phase. The temporary subset never changes what seed writes, because seed
 * always runs `checkCatalog(PROBLEMS)`.
 */

import { readFileSync } from "node:fs";

import { PROBLEMS } from "@/lib/problems/catalog";
import {
  checkCatalog,
  formatConformanceReport,
} from "@/lib/problems/conformance";

import type { Manifest } from "./catalog-sheet";

type Args = { slug?: string; group?: string };

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--slug") args.slug = argv[++index];
    else if (arg === "--group") args.group = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

/** A roadmap group comes from the sheet manifest; the app stores no group tag. */
function slugsInGroup(group: string): Set<string> {
  const manifest = JSON.parse(
    readFileSync("docs/catalog/neetcode-150.json", "utf8"),
  ) as Manifest;
  if (!manifest.groups.includes(group)) {
    throw new Error(`unknown group ${group}. Known: ${manifest.groups.join(" | ")}`);
  }
  return new Set(
    manifest.problems
      .filter((problem) => problem.group === group)
      .map((problem) => problem.slug),
  );
}

function select(problems: typeof PROBLEMS, args: Args): typeof PROBLEMS {
  if (args.slug) {
    const match = problems.filter((problem) => problem.slug === args.slug);
    if (match.length === 0) throw new Error(`${args.slug} is not in the catalog`);
    return match;
  }
  if (args.group) {
    const slugs = slugsInGroup(args.group);
    const match = problems.filter((problem) => slugs.has(problem.slug));
    if (match.length === 0) {
      throw new Error(`no catalog problem belongs to the group ${args.group} yet`);
    }
    return match;
  }
  return problems;
}

const args = parseArgs(process.argv.slice(2));
const selected = select(PROBLEMS, args);
if (selected.length !== PROBLEMS.length) {
  console.log(
    `Checking ${selected.length} of ${PROBLEMS.length} problems ` +
      `(${args.slug ?? args.group}); the gate is the full run.`,
  );
}

const report = checkCatalog(selected);
console.log(formatConformanceReport(report));
if (!report.ok) {
  process.exitCode = 1;
}
