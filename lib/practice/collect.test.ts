import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectBrowserPractice,
  isEmptyImport,
  isImportComplete,
  markImportComplete,
  summarizeImport,
} from "@/lib/practice/collect";
import { IMPORT_COMPLETE_KEY } from "@/lib/practice/keys";

function memoryStore(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  const store = {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(map);
    },
  };
  return store;
}

describe("collectBrowserPractice", () => {
  it("imports valid code, notes, preferences, and accepted records", () => {
    const store = memoryStore({
      "dsa.code.two-sum.python": JSON.stringify("class Solution:\n    pass\n"),
      "dsa.notes.two-sum": JSON.stringify({
        approach: "hash map",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
      }),
      "dsa.language.two-sum": JSON.stringify("python"),
      "dsa.accepted.two-sum": JSON.stringify({
        source: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n",
        language: "python",
        at: "2026-01-01T00:00:00.000Z",
      }),
    });

    const before = store.snapshot();
    const payload = collectBrowserPractice(store);

    assert.deepEqual(payload, {
      drafts: [
        {
          slug: "two-sum",
          language: "python",
          source: "class Solution:\n    pass\n",
        },
      ],
      notes: [
        {
          slug: "two-sum",
          approach: "hash map",
          timeComplexity: "O(n)",
          spaceComplexity: "O(n)",
        },
      ],
      preferences: [{ slug: "two-sum", language: "python" }],
      legacyAccepted: [
        {
          slug: "two-sum",
          language: "python",
          source:
            "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n",
          at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    assert.deepEqual(store.snapshot(), before);
  });

  it("skips invalid values, dirty flags, and dsa.progress", () => {
    const payload = collectBrowserPractice(
      memoryStore({
        "dsa.progress": JSON.stringify({
          "two-sum": {
            status: "accepted",
            language: "python",
            at: "2026-01-01T00:00:00.000Z",
          },
        }),
        "dsa.unsaved.code.two-sum.python": JSON.stringify(true),
        "dsa.unsaved.notes.two-sum": JSON.stringify(true),
        "dsa.code.two-sum.python": "not-json",
        "dsa.code.missing-lang.python": JSON.stringify(42),
        "dsa.notes.two-sum": JSON.stringify("plain string"),
        "dsa.language.two-sum": JSON.stringify("haskell"),
        "dsa.accepted.two-sum": JSON.stringify({ language: "python" }),
        "dsa.accepted.valid-parentheses": JSON.stringify({
          source: "class Solution:\n    pass\n",
          language: "python",
        }),
      }),
    );

    assert.equal(payload.drafts, undefined);
    assert.equal(payload.notes, undefined);
    assert.equal(payload.preferences, undefined);
    assert.deepEqual(payload.legacyAccepted, [
      {
        slug: "valid-parentheses",
        language: "python",
        source: "class Solution:\n    pass\n",
      },
    ]);
  });

  it("summarizes a payload and treats an empty scan as empty", () => {
    assert.equal(isEmptyImport({}), true);
    assert.equal(
      summarizeImport({
        drafts: [{ slug: "two-sum", language: "python", source: "x" }],
        legacyAccepted: [
          { slug: "two-sum", language: "python", source: "y" },
        ],
      }),
      "1 draft, 1 accepted snapshot",
    );
  });
});

describe("import completion flag", () => {
  it("is false until markImportComplete writes the key", () => {
    const store = memoryStore({
      "dsa.code.two-sum.python": JSON.stringify("x"),
    });
    assert.equal(isImportComplete(store), false);
    markImportComplete(store);
    assert.equal(isImportComplete(store), true);
    assert.equal(store.getItem("dsa.code.two-sum.python"), JSON.stringify("x"));
    assert.equal(store.getItem(IMPORT_COMPLETE_KEY), JSON.stringify(true));
  });
});
