import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { compileForSeed } from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";

const seedSource = readFileSync("lib/db/seed.ts", "utf8");

describe("repeat seed", () => {
  it("upserts catalog rows by slug so a second run keeps problem IDs", () => {
    assert.match(seedSource, /onConflictDoUpdate/);
    assert.match(seedSource, /target:\s*problems\.slug/);
    assert.match(seedSource, /db\.transaction/);
  });

  it("recompiles the same catalog shape on every run", () => {
    for (const problem of PROBLEMS) {
      assert.deepEqual(compileForSeed(problem), compileForSeed(problem));
    }
  });
});

describe("preserved practice data", () => {
  it("does not import drafts, progress, submissions, or chat tables", () => {
    const schemaImport = seedSource.match(
      /import\s*\{([^}]+)\}\s*from "\.\/schema"/,
    );
    assert.ok(schemaImport, "seed must import catalog tables from ./schema");
    const names = schemaImport[1] ?? "";
    for (const forbidden of [
      "drafts",
      "problemProgress",
      "legacyAccepted",
      "submissions",
      "submissionCases",
      "chatThreads",
      "chatMessages",
    ]) {
      assert.doesNotMatch(names, new RegExp(`\\b${forbidden}\\b`));
    }
    assert.match(names, /\bproblems\b/);
    assert.match(names, /\bproblemTestcases\b/);
    assert.match(seedSource, /never touched/);
  });

  it("documents fresh-install coverage without wiping this database", () => {
    assert.match(seedSource, /pnpm db:migrate && pnpm db:seed/);
    assert.match(seedSource, /empty volume/);
  });
});
