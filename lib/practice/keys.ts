import type { LanguageId } from "@/lib/languages";

/**
 * Browser recovery keys. Phase 3.4 imports the same `dsa.code.*` /
 * `dsa.notes.*` / `dsa.language.*` / `dsa.accepted.*` strings; dirty flags sit
 * beside them so an unsaved reset-to-starter is not mistaken for "never edited".
 *
 * `IMPORT_COMPLETE_KEY` is written only after a successful import transaction.
 * Original `dsa.*` values stay in place as the recovery copy.
 */

export const IMPORT_COMPLETE_KEY = "dsa.import.complete";

export function codeRecoveryKey(slug: string, language: LanguageId): string {
  return `dsa.code.${slug}.${language}`;
}

export function notesRecoveryKey(slug: string): string {
  return `dsa.notes.${slug}`;
}

export function languageRecoveryKey(slug: string): string {
  return `dsa.language.${slug}`;
}

export function acceptedRecoveryKey(slug: string): string {
  return `dsa.accepted.${slug}`;
}

export function codeDirtyKey(slug: string, language: LanguageId): string {
  return `dsa.unsaved.code.${slug}.${language}`;
}

export function notesDirtyKey(slug: string): string {
  return `dsa.unsaved.notes.${slug}`;
}
