import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeProgressImport,
  parseOptionalDate,
  practiceImportSchema,
  practicePatchSchema,
} from "@/lib/db/queries/practice";

describe("practicePatchSchema", () => {
  it("accepts a draft, notes, or preferred language", () => {
    assert.equal(
      practicePatchSchema.safeParse({ draft: { source: "class Solution:\n    pass\n" } })
        .success,
      true,
    );
    assert.equal(
      practicePatchSchema.safeParse({ notes: { approach: "two pointers" } }).success,
      true,
    );
    assert.equal(
      practicePatchSchema.safeParse({ preferredLanguage: "python" }).success,
      true,
    );
  });

  it("rejects an empty body", () => {
    const parsed = practicePatchSchema.safeParse({});
    assert.equal(parsed.success, false);
  });

  it("rejects arbitrary solved writes", () => {
    for (const body of [
      { solved: true, notes: { approach: "x" } },
      { status: "solved", notes: { approach: "x" } },
      { solvedAt: "2026-01-01T00:00:00.000Z", draft: { source: "x" } },
      { notes: { approach: "x", status: "solved" } },
    ]) {
      const parsed = practicePatchSchema.safeParse(body);
      assert.equal(parsed.success, false, JSON.stringify(body));
    }
  });
});

describe("practiceImportSchema", () => {
  it("accepts the browser-shaped payload and rejects extras", () => {
    assert.equal(practiceImportSchema.safeParse({}).success, true);
    assert.equal(
      practiceImportSchema.safeParse({
        drafts: [{ slug: "two-sum", language: "python", source: "x" }],
        notes: [{ slug: "two-sum", approach: "hash map" }],
        preferences: [{ slug: "two-sum", language: "python" }],
        legacyAccepted: [
          {
            slug: "two-sum",
            language: "python",
            source: "class Solution:\n    pass\n",
            at: "2026-01-01T00:00:00.000Z",
          },
        ],
      }).success,
      true,
    );
    assert.equal(
      practiceImportSchema.safeParse({ solved: true }).success,
      false,
    );
  });
});

describe("mergeProgressImport", () => {
  it("fills only empty columns and never overwrites stored values", () => {
    const existing = {
      preferredLanguage: "python" as const,
      userNotesApproach: "mine",
      userNotesTimeComplexity: null,
      userNotesSpaceComplexity: "",
    };
    const merged = mergeProgressImport(existing, {
      preferredLanguage: "cpp",
      notes: {
        approach: "imported",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
      },
    });

    assert.equal(merged.writes, true);
    assert.deepEqual(merged.fields, {
      preferredLanguage: "python",
      userNotesApproach: "mine",
      userNotesTimeComplexity: "O(n)",
      userNotesSpaceComplexity: "",
    });
  });

  it("is a no-op when every column already has a value", () => {
    const merged = mergeProgressImport(
      {
        preferredLanguage: "python",
        userNotesApproach: "mine",
        userNotesTimeComplexity: "O(n)",
        userNotesSpaceComplexity: "O(1)",
      },
      {
        preferredLanguage: "cpp",
        notes: { approach: "imported" },
      },
    );
    assert.equal(merged.writes, false);
  });

  it("writes a new row from incoming fields", () => {
    const merged = mergeProgressImport(null, {
      preferredLanguage: "python",
      notes: { approach: "hash map" },
    });
    assert.equal(merged.writes, true);
    assert.equal(merged.fields.preferredLanguage, "python");
    assert.equal(merged.fields.userNotesApproach, "hash map");
  });

  it("does not invent a row from an empty import", () => {
    const merged = mergeProgressImport(null, {});
    assert.equal(merged.writes, false);
  });
});

describe("parseOptionalDate", () => {
  it("keeps a valid ISO timestamp and drops garbage", () => {
    const at = "2026-01-01T00:00:00.000Z";
    assert.equal(parseOptionalDate(at)?.toISOString(), at);
    assert.equal(parseOptionalDate("not-a-date"), null);
    assert.equal(parseOptionalDate(undefined), null);
  });
});
