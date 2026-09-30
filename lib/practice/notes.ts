import type { SolutionNotes } from "@/lib/problems";

/**
 * Personal notes. The catalog's `SolutionNotes` stay the three reference
 * fields; these add the two memory-aid fields and are what practice stores.
 *
 * A new problem starts empty. Catalog guidance is shown in the Solution tab
 * and is never copied into this shape.
 */

export const APPROACH_MAX = 20_000;
export const STEPS_MAX = 20_000;
export const PITFALLS_MAX = 20_000;
export const COMPLEXITY_MAX = 200;

export type PersonalNotes = SolutionNotes & {
  steps: string;
  pitfalls: string;
};

export const NOTE_FIELDS = [
  "approach",
  "steps",
  "pitfalls",
  "timeComplexity",
  "spaceComplexity",
] as const;

export type NoteField = (typeof NOTE_FIELDS)[number];

/**
 * The label shown for each field. Shared so the notes form and a draft preview
 * cannot drift apart. `approach` is stored and sent as `approach`; only the
 * label calls it the key idea.
 */
export const NOTE_FIELD_LABELS: Record<NoteField, string> = {
  approach: "Key idea",
  steps: "Steps",
  pitfalls: "What tripped me up",
  timeComplexity: "Time",
  spaceComplexity: "Space",
};

export const EMPTY_PERSONAL_NOTES: PersonalNotes = {
  approach: "",
  steps: "",
  pitfalls: "",
  timeComplexity: "",
  spaceComplexity: "",
};

const FIELD_MAX: Record<NoteField, number> = {
  approach: APPROACH_MAX,
  steps: STEPS_MAX,
  pitfalls: PITFALLS_MAX,
  timeComplexity: COMPLEXITY_MAX,
  spaceComplexity: COMPLEXITY_MAX,
};

export function emptyPersonalNotes(): PersonalNotes {
  return { ...EMPTY_PERSONAL_NOTES };
}

function clipField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

/** Old records omit `steps` and `pitfalls`. Missing fields become empty strings. */
export function normalizePersonalNotes(value: unknown): PersonalNotes {
  if (typeof value !== "object" || value === null) return emptyPersonalNotes();
  const record = value as Partial<Record<NoteField, unknown>>;
  return {
    approach: clipField(record.approach, FIELD_MAX.approach),
    steps: clipField(record.steps, FIELD_MAX.steps),
    pitfalls: clipField(record.pitfalls, FIELD_MAX.pitfalls),
    timeComplexity: clipField(record.timeComplexity, FIELD_MAX.timeComplexity),
    spaceComplexity: clipField(record.spaceComplexity, FIELD_MAX.spaceComplexity),
  };
}

export function notesEqual(a: PersonalNotes, b: PersonalNotes): boolean {
  return NOTE_FIELDS.every((field) => a[field] === b[field]);
}

/**
 * A save that finishes after more keystrokes must not clear the dirty flag,
 * or the later characters never reach Postgres.
 */
export function shouldClearNotesDirty(
  sent: PersonalNotes,
  current: PersonalNotes,
): boolean {
  return notesEqual(sent, current);
}

export function notesAreBlank(notes: PersonalNotes): boolean {
  return NOTE_FIELDS.every((field) => notes[field].trim().length === 0);
}

/**
 * Fill only fields that are still empty. An occupied field, including one
 * edited after the draft was requested, stays until an explicit replace.
 */
export function fillEmptyNoteFields(
  current: PersonalNotes,
  draft: PersonalNotes,
): PersonalNotes {
  const next = { ...current };
  for (const field of NOTE_FIELDS) {
    if (current[field].trim().length === 0 && draft[field].length > 0) {
      next[field] = draft[field];
    }
  }
  return next;
}

export function replaceNoteField(
  current: PersonalNotes,
  baseline: PersonalNotes,
  draft: PersonalNotes,
  field: NoteField,
  confirmed: boolean,
): { notes: PersonalNotes; stale: boolean } {
  if (current[field] !== baseline[field] && !confirmed) {
    return { notes: current, stale: true };
  }
  return {
    notes: { ...current, [field]: draft[field] },
    stale: false,
  };
}
