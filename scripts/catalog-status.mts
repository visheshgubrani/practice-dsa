#!/usr/bin/env node

/**
 * Where the NeetCode 150 import stands.
 *
 *   pnpm catalog:status
 *
 * Prints the sheet against the authored catalog: ready/deferred per group, which
 * ready problems have no module yet, which deferred ones are deferred and why,
 * and whether any authored module is still a draft (a `TODO(` marker, which
 * seed refuses). Exits non-zero when a draft marker is left in a catalog
 * module — that is a real failure, not a status.
 *
 * Reads `lib/problems/catalog.ts`, so it sees exactly what `pnpm db:seed` would
 * write. It does not touch Postgres and does not fetch anything.
 */

import { readFile } from "node:fs/promises";

import { PROBLEMS } from "@/lib/problems/catalog";
import { validateProblem } from "@/lib/problems/validate";

import { DEFER_REASON_LABEL, type DeferReason, type Manifest } from "./catalog-sheet";

const MANIFEST_PATH = "docs/catalog/neetcode-150.json";

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  const authored = new Set(PROBLEMS.map((problem) => problem.slug));

  const ready = manifest.problems.filter((problem) => problem.status === "ready");
  const deferred = manifest.problems.filter((problem) => problem.status === "deferred");
  const missing = ready.filter((problem) => !authored.has(problem.slug));
  const extra = PROBLEMS.filter(
    (problem) => !manifest.problems.some((entry) => entry.slug === problem.slug),
  );

  console.log(
    `${manifest.total} sheet problems · ${ready.length} ready for this harness · ` +
      `${deferred.length} deferred`,
  );
  console.log(
    `${authored.size} authored · ${ready.length - missing.length}/${ready.length} ready problems done · ` +
      `${missing.length} to go`,
  );

  console.log("\nBy group (authored/ready, deferred):");
  for (const group of manifest.groups) {
    const rows = manifest.problems.filter((problem) => problem.group === group);
    const groupReady = rows.filter((problem) => problem.status === "ready");
    const groupDeferred = rows.filter((problem) => problem.status === "deferred");
    const done = groupReady.filter((problem) => authored.has(problem.slug)).length;
    const mark = groupReady.length > 0 && done === groupReady.length ? "✓" : " ";
    console.log(
      `  ${mark} ${group.padEnd(26)} ${String(done).padStart(2)}/${String(groupReady.length).padEnd(2)}` +
        (groupDeferred.length > 0 ? `  (+${groupDeferred.length} deferred)` : ""),
    );
  }

  if (missing.length > 0) {
    console.log("\nReady but not authored yet:");
    for (const problem of missing) {
      console.log(`  ${String(problem.number).padStart(4)} ${problem.slug}`);
    }
  }

  if (extra.length > 0) {
    console.log("\nAuthored but not in the sheet:");
    for (const problem of extra) {
      console.log(`  ${String(problem.number).padStart(4)} ${problem.slug}`);
    }
  }

  const byReason = new Map<DeferReason, string[]>();
  for (const problem of deferred) {
    const reason = problem.reason ?? "unsupported_kind";
    const list = byReason.get(reason) ?? [];
    list.push(problem.slug);
    byReason.set(reason, list);
  }
  console.log("\nDeferred, by reason:");
  for (const [reason, slugs] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${reason} (${slugs.length}) — ${DEFER_REASON_LABEL[reason]}`);
    console.log(`    ${slugs.join(", ")}`);
  }

  const drafts = PROBLEMS.map((problem) => ({
    slug: problem.slug,
    issues: validateProblem(problem).filter((issue) => issue.includes("is still a draft")),
  })).filter((entry) => entry.issues.length > 0);

  if (drafts.length > 0) {
    console.log("\nDrafts that cannot seed:");
    for (const draft of drafts) {
      const markers = draft.issues.join(" ").split("replace the TODO marker in: ")[1] ?? "";
      console.log(`  ${draft.slug}: ${markers}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nNo draft markers in the authored catalog.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
