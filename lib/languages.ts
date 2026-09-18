/**
 * Language registry.
 *
 * Two shapes live here, and the difference matters:
 *
 *   - `STORED_LANGUAGES` is what the database enum and a saved buffer can hold.
 *     All four are in Postgres, and a draft written before today can still carry
 *     one of them.
 *   - `LanguageId` is what the app can actually execute. It holds only Python,
 *     because only Python has a harness and this workbench is for practising in
 *     one language. Offering a language back up means writing its harness and
 *     adding one entry to `LANGUAGES` — no schema change.
 */

/** Every value the `language` Postgres enum accepts. */
export const STORED_LANGUAGES = ["cpp", "python", "java", "javascript"] as const;
export type StoredLanguageId = (typeof STORED_LANGUAGES)[number];

/** The languages the workspace offers: exactly those with a harness. */
export type LanguageId = "python";

export type Language = {
  id: LanguageId;
  /** Long label, used in selection UI. */
  label: string;
  /** Compact label, used in the editor toolbar. */
  short: string;
  monacoId: string;
  /** The engine's name for this language, sent to `POST /api/v2/execute`. */
  pistonName: string;
  extension: string;
};

export const LANGUAGES: readonly Language[] = [
  {
    id: "python",
    label: "Python 3",
    short: "Python",
    monacoId: "python",
    pistonName: "python",
    extension: "py",
  },
] as const;

export const DEFAULT_LANGUAGE: LanguageId = "python";

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === "string" && LANGUAGES.some((lang) => lang.id === value);
}

export function getLanguage(id: LanguageId): Language {
  const language = LANGUAGES.find((candidate) => candidate.id === id);
  if (!language) {
    throw new Error(`Unknown language: ${id}`);
  }
  return language;
}

/**
 * Narrow a stored language to one the app can run, or `undefined`.
 *
 * A draft or an accepted solution can name a language that is no longer offered;
 * the caller decides what to do about it, which is usually "use the default"
 * rather than throwing at a user who did nothing wrong.
 */
export function toLanguageId(value: unknown): LanguageId | undefined {
  return isLanguageId(value) ? value : undefined;
}

/** Monaco needs a literal font stack, not a CSS variable. */
export const MONACO_FONT_FAMILY =
  "'Geist Mono', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
