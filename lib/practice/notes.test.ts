import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPROACH_MAX,
  emptyPersonalNotes,
  fillEmptyNoteFields,
  normalizePersonalNotes,
  notesAreBlank,
  notesEqual,
  replaceNoteField,
  shouldClearNotesDirty,
  type PersonalNotes,
} from "@/lib/practice/notes";

const NOTES: PersonalNotes = {
  approach: "hash map",
  steps: "store complements",
  pitfalls: "same index twice",
  timeComplexity: "O(n)",
  spaceComplexity: "O(n)",
};

describe("normalizePersonalNotes", () => {
  it("turns missing steps and pitfalls into empty strings", () => {
    const notes = normalizePersonalNotes({
      approach: "hash map",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    });
    assert.deepEqual(notes, {
      approach: "hash map",
      steps: "",
      pitfalls: "",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    });
  });

  it("keeps an intentionally empty approach", () => {
    const notes = normalizePersonalNotes({
      approach: "",
      steps: "outline",
      pitfalls: "",
      timeComplexity: "",
      spaceComplexity: "",
    });
    assert.equal(notes.approach, "");
    assert.equal(notes.steps, "outline");
  });

  it("clips a field that is past the save limit", () => {
    const notes = normalizePersonalNotes({
      approach: "a".repeat(APPROACH_MAX + 5),
    });
    assert.equal(notes.approach.length, APPROACH_MAX);
  });

  it("returns an empty record for a non-object", () => {
    assert.deepEqual(normalizePersonalNotes(null), emptyPersonalNotes());
    assert.deepEqual(normalizePersonalNotes("notes"), emptyPersonalNotes());
  });
});

describe("shouldClearNotesDirty", () => {
  it("clears only when the saved text is still what is on screen", () => {
    assert.equal(shouldClearNotesDirty(NOTES, NOTES), true);
    assert.equal(
      shouldClearNotesDirty(NOTES, { ...NOTES, steps: "newer outline" }),
      false,
    );
    assert.equal(notesEqual(NOTES, { ...NOTES }), true);
  });
});

describe("applying a draft", () => {
  it("fills only the fields that are still empty", () => {
    const current: PersonalNotes = {
      ...emptyPersonalNotes(),
      approach: "mine, already written",
    };
    const filled = fillEmptyNoteFields(current, NOTES);

    assert.equal(filled.approach, "mine, already written");
    assert.equal(filled.steps, NOTES.steps);
    assert.equal(filled.pitfalls, NOTES.pitfalls);
    assert.equal(filled.timeComplexity, "O(n)");
  });

  it("leaves a blank draft field alone rather than clearing the note", () => {
    const current: PersonalNotes = { ...NOTES, steps: "" };
    const filled = fillEmptyNoteFields(current, {
      ...NOTES,
      steps: "",
      pitfalls: "",
    });

    assert.equal(filled.steps, "");
    assert.equal(filled.approach, NOTES.approach);
  });

  it("stops an explicit replace when the field moved since generation began", () => {
    const baseline: PersonalNotes = { ...NOTES, steps: "" };
    const current: PersonalNotes = { ...baseline, steps: "typed while drafting" };
    const draft: PersonalNotes = { ...NOTES, steps: "drafted steps" };

    const guarded = replaceNoteField(current, baseline, draft, "steps", false);
    assert.equal(guarded.stale, true);
    assert.equal(guarded.notes.steps, "typed while drafting");

    const confirmed = replaceNoteField(current, baseline, draft, "steps", true);
    assert.equal(confirmed.stale, false);
    assert.equal(confirmed.notes.steps, "drafted steps");

    const untouched = replaceNoteField(current, baseline, draft, "approach", false);
    assert.equal(untouched.stale, false);
    assert.equal(untouched.notes.approach, draft.approach);
  });
});

describe("notesAreBlank", () => {
  it("ignores whitespace-only fields", () => {
    assert.equal(notesAreBlank(emptyPersonalNotes()), true);
    assert.equal(
      notesAreBlank({ ...emptyPersonalNotes(), steps: "   \n " }),
      true,
    );
    assert.equal(notesAreBlank({ ...emptyPersonalNotes(), steps: "x" }), false);
  });
});
