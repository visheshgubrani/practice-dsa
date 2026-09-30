import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLoadedNotes, resolveLoadedSource } from "@/lib/practice/load";
import { emptyPersonalNotes, type PersonalNotes } from "@/lib/practice/notes";

const NOTES: PersonalNotes = {
  approach: "hash map",
  steps: "store complements",
  pitfalls: "same index twice",
  timeComplexity: "O(n)",
  spaceComplexity: "O(n)",
};

const REFERENCE: PersonalNotes = {
  approach: "reference",
  steps: "",
  pitfalls: "",
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
};

describe("resolveLoadedSource", () => {
  it("prefers the server draft over a starter sitting in recovery", () => {
    const loaded = resolveLoadedSource({
      server: "class Solution:\n    def twoSum(self, nums, target):\n        ...\n",
      recovery: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n",
      starter: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n",
      dirty: false,
    });
    assert.equal(loaded.retrySave, false);
    assert.match(loaded.value, /def twoSum[\s\S]*\.\.\./);
  });

  it("keeps a dirty recovery copy and retries the save", () => {
    const loaded = resolveLoadedSource({
      server: "server draft",
      recovery: "unsaved local edits",
      starter: "starter",
      dirty: true,
    });
    assert.deepEqual(loaded, {
      value: "unsaved local edits",
      retrySave: true,
    });
  });

  it("keeps a dirty reset-to-starter so it can be saved as the new draft", () => {
    const loaded = resolveLoadedSource({
      server: "previous draft",
      recovery: "starter",
      starter: "starter",
      dirty: true,
    });
    assert.deepEqual(loaded, { value: "starter", retrySave: true });
  });

  it("uses recovery when there is no server row", () => {
    const loaded = resolveLoadedSource({
      server: null,
      recovery: "local copy",
      starter: "starter",
      dirty: false,
    });
    assert.deepEqual(loaded, { value: "local copy", retrySave: false });
  });

  it("retries a dirty recovery copy after a failed save", () => {
    const loaded = resolveLoadedSource({
      server: null,
      recovery: "unsaved local edits",
      starter: "starter",
      dirty: true,
    });
    assert.deepEqual(loaded, {
      value: "unsaved local edits",
      retrySave: true,
    });
  });
});

describe("resolveLoadedNotes", () => {
  it("prefers stored notes over the reference fallback", () => {
    const loaded = resolveLoadedNotes({
      server: NOTES,
      recovery: REFERENCE,
      fallback: REFERENCE,
      dirty: false,
    });
    assert.deepEqual(loaded, { value: NOTES, retrySave: false });
  });

  it("keeps dirty local notes and retries", () => {
    const loaded = resolveLoadedNotes({
      server: NOTES,
      recovery: { ...NOTES, approach: "two pointers" },
      fallback: REFERENCE,
      dirty: true,
    });
    assert.equal(loaded.retrySave, true);
    assert.equal(loaded.value.approach, "two pointers");
  });

  it("keeps an intentionally empty saved approach", () => {
    const saved: PersonalNotes = {
      ...emptyPersonalNotes(),
      timeComplexity: "O(n)",
    };
    const loaded = resolveLoadedNotes({
      server: saved,
      recovery: { ...NOTES, approach: "local edit" },
      fallback: emptyPersonalNotes(),
      dirty: false,
    });
    assert.equal(loaded.value.approach, "");
    assert.equal(loaded.value.timeComplexity, "O(n)");
    assert.equal(loaded.retrySave, false);
  });

  it("starts from empty notes when nothing is stored", () => {
    const loaded = resolveLoadedNotes({
      server: null,
      recovery: null,
      fallback: emptyPersonalNotes(),
      dirty: false,
    });
    assert.deepEqual(loaded, { value: emptyPersonalNotes(), retrySave: false });
    assert.equal(loaded.value.approach, "");
  });

  it("fills steps and pitfalls missing from an older recovery copy", () => {
    const loaded = resolveLoadedNotes({
      server: null,
      recovery: {
        approach: "hash map",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
      } as PersonalNotes,
      fallback: emptyPersonalNotes(),
      dirty: true,
    });
    assert.equal(loaded.value.steps, "");
    assert.equal(loaded.value.pitfalls, "");
    assert.equal(loaded.retrySave, true);
  });
});
