import {
  STORED_LANGUAGES,
  type StoredLanguageId,
} from "@/lib/languages";
import { IMPORT_COMPLETE_KEY } from "@/lib/practice/keys";
import type { PracticeImportPayload } from "@/lib/practice/types";

/**
 * Read browser `dsa.*` keys into the import payload. Invalid values are
 * dropped; `dsa.progress` and dirty flags are ignored so a mock accept cannot
 * become verified solved status.
 */

const STORED_LANGUAGE_SET = new Set<string>(STORED_LANGUAGES);

const SLUG_MAX = 200;
const SOURCE_MAX = 200_000;
const APPROACH_MAX = 20_000;
const COMPLEXITY_MAX = 200;
const ENTRIES_MAX = 200;

const CODE_KEY = /^dsa\.code\.(.+)\.(cpp|python|java|javascript)$/;
const NOTES_KEY = /^dsa\.notes\.(.+)$/;
const LANGUAGE_KEY = /^dsa\.language\.(.+)$/;
const ACCEPTED_KEY = /^dsa\.accepted\.(.+)$/;

export type BrowserStore = Pick<Storage, "length" | "key" | "getItem"> &
  Partial<Pick<Storage, "setItem">>;

function isStoredLanguageId(value: unknown): value is StoredLanguageId {
  return typeof value === "string" && STORED_LANGUAGE_SET.has(value);
}

function isUsableSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX;
}

function parseJson(raw: string | null): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function readKey(store: BrowserStore, index: number): string | null {
  try {
    return store.key(index);
  } catch {
    return null;
  }
}

function readItem(store: BrowserStore, key: string): unknown {
  try {
    return parseJson(store.getItem(key));
  } catch {
    return undefined;
  }
}

function clipString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length > max) return undefined;
  return value;
}

function notesEntry(
  slug: string,
  value: unknown,
): NonNullable<PracticeImportPayload["notes"]>[number] | null {
  if (typeof value !== "object" || value === null) return null;
  const notes = value as Record<string, unknown>;
  const approach = clipString(notes.approach, APPROACH_MAX);
  const timeComplexity = clipString(notes.timeComplexity, COMPLEXITY_MAX);
  const spaceComplexity = clipString(notes.spaceComplexity, COMPLEXITY_MAX);
  if (
    approach === undefined &&
    timeComplexity === undefined &&
    spaceComplexity === undefined
  ) {
    return null;
  }
  return {
    slug,
    ...(approach !== undefined ? { approach } : {}),
    ...(timeComplexity !== undefined ? { timeComplexity } : {}),
    ...(spaceComplexity !== undefined ? { spaceComplexity } : {}),
  };
}

function acceptedEntry(
  slug: string,
  value: unknown,
): NonNullable<PracticeImportPayload["legacyAccepted"]>[number] | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const source = clipString(record.source, SOURCE_MAX);
  if (source === undefined || !isStoredLanguageId(record.language)) return null;
  const at = clipString(record.at, 40);
  return {
    slug,
    language: record.language,
    source,
    ...(at !== undefined ? { at } : {}),
  };
}

function cap<T>(entries: T[]): T[] | undefined {
  if (entries.length === 0) return undefined;
  return entries.slice(0, ENTRIES_MAX);
}

export function isEmptyImport(payload: PracticeImportPayload): boolean {
  return (
    (payload.drafts?.length ?? 0) === 0 &&
    (payload.notes?.length ?? 0) === 0 &&
    (payload.preferences?.length ?? 0) === 0 &&
    (payload.legacyAccepted?.length ?? 0) === 0
  );
}

export function summarizeImport(payload: PracticeImportPayload): string {
  const parts: string[] = [];
  const counts: Array<[number, string, string]> = [
    [payload.drafts?.length ?? 0, "draft", "drafts"],
    [payload.notes?.length ?? 0, "note", "notes"],
    [payload.preferences?.length ?? 0, "language preference", "language preferences"],
    [payload.legacyAccepted?.length ?? 0, "accepted snapshot", "accepted snapshots"],
  ];
  for (const [count, singular, plural] of counts) {
    if (count > 0) parts.push(`${count} ${count === 1 ? singular : plural}`);
  }
  return parts.join(", ");
}

export function isImportComplete(store: BrowserStore): boolean {
  const value = readItem(store, IMPORT_COMPLETE_KEY);
  return value === true;
}

export function markImportComplete(store: BrowserStore): void {
  try {
    store.setItem?.(IMPORT_COMPLETE_KEY, JSON.stringify(true));
  } catch {
    // Storage unavailable: the next visit will offer import again.
  }
}

export function collectBrowserPractice(store: BrowserStore): PracticeImportPayload {
  const drafts: NonNullable<PracticeImportPayload["drafts"]> = [];
  const notes: NonNullable<PracticeImportPayload["notes"]> = [];
  const preferences: NonNullable<PracticeImportPayload["preferences"]> = [];
  const legacyAccepted: NonNullable<PracticeImportPayload["legacyAccepted"]> = [];

  let length = 0;
  try {
    length = store.length;
  } catch {
    return {};
  }

  for (let index = 0; index < length; index += 1) {
    const key = readKey(store, index);
    if (!key) continue;

    const codeMatch = CODE_KEY.exec(key);
    if (codeMatch) {
      const slug = codeMatch[1];
      const language = codeMatch[2];
      if (!isUsableSlug(slug) || !isStoredLanguageId(language)) continue;
      const source = clipString(readItem(store, key), SOURCE_MAX);
      if (source === undefined) continue;
      drafts.push({ slug, language, source });
      continue;
    }

    const notesMatch = NOTES_KEY.exec(key);
    if (notesMatch) {
      const slug = notesMatch[1];
      if (!isUsableSlug(slug)) continue;
      const entry = notesEntry(slug, readItem(store, key));
      if (entry) notes.push(entry);
      continue;
    }

    const languageMatch = LANGUAGE_KEY.exec(key);
    if (languageMatch) {
      const slug = languageMatch[1];
      if (!isUsableSlug(slug)) continue;
      const language = readItem(store, key);
      if (!isStoredLanguageId(language)) continue;
      preferences.push({ slug, language });
      continue;
    }

    const acceptedMatch = ACCEPTED_KEY.exec(key);
    if (acceptedMatch) {
      const slug = acceptedMatch[1];
      if (!isUsableSlug(slug)) continue;
      const entry = acceptedEntry(slug, readItem(store, key));
      if (entry) legacyAccepted.push(entry);
    }
  }

  return {
    drafts: cap(drafts),
    notes: cap(notes),
    preferences: cap(preferences),
    legacyAccepted: cap(legacyAccepted),
  };
}
