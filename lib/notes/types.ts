import type { LanguageId } from "@/lib/languages";
import { NOTE_FIELDS, type PersonalNotes } from "@/lib/practice/notes";

/**
 * JSON shapes for `POST /api/notes/generate`.
 *
 * Personal notes themselves live in `lib/practice/notes.ts`; this module is the
 * preview request and response only. Kept free of the database client so the
 * workspace can import it.
 *
 * Generation never writes. A preview is applied field by field through the
 * normal notes autosave path, so the response carries text and nothing else.
 */

export type NotesDraftRequest = {
  slug: string;
  /** The executable language of the buffer being summarized. */
  language: LanguageId;
  /** The editor buffer, exactly as it stands. */
  source: string;
  /** What the user has already written, so a draft can leave it alone. */
  notes: PersonalNotes;
  /** The conversation to summarize. Omitted when none is selected. */
  threadId?: string;
  /** A stored run to describe. Omitted when there is nothing persisted. */
  submissionId?: string;
};

/** A validated memory aid, not yet written anywhere. */
export type NotesDraftPreview = {
  status: "draft";
  notes: PersonalNotes;
};

/** Too little session evidence to personalize; no draft is invented. */
export type NotesDraftInsufficient = {
  status: "insufficient";
  message: string;
};

export type NotesDraftResult = NotesDraftPreview | NotesDraftInsufficient;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasNoteFields(value: unknown): value is PersonalNotes {
  if (!isRecord(value)) return false;
  return NOTE_FIELDS.every((field) => typeof value[field] === "string");
}

export function isNotesDraftResult(value: unknown): value is NotesDraftResult {
  if (!isRecord(value)) return false;
  if (value.status === "draft") return hasNoteFields(value.notes);
  if (value.status === "insufficient") return typeof value.message === "string";
  return false;
}
