import type { CoachMinutes } from "./types";

/**
 * Browser-local coach state. Neither value is practice data, and neither is
 * imported by the one-time `dsa.*` practice recovery scan.
 */

export const COACH_MINUTES_KEY = "dsa.coach.minutes";
export const COACH_NOTE_KEY = "dsa.coach.note";

type CoachStorage = Pick<Storage, "getItem" | "setItem">;

function storageOrNull(storage?: CoachStorage | null): CoachStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isDisplayableNote(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 400 &&
    !/\d/.test(value) &&
    !/[?#*`_[\]<>]/.test(value) &&
    !/\n/.test(value)
  );
}

/** The note cached for this exact plan, or null. Corrupt/old values are ignored. */
export function readCachedNote(
  fingerprint: string,
  storage?: CoachStorage | null,
): string | null {
  const store = storageOrNull(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(COACH_NOTE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("fingerprint" in parsed) ||
      !("note" in parsed)
    ) {
      return null;
    }
    const value = parsed as { fingerprint?: unknown; note?: unknown };
    if (value.fingerprint !== fingerprint) return null;
    const note = isDisplayableNote(value.note) ? value.note.trim() : null;
    return note;
  } catch {
    return null;
  }
}

/** Overwrite the one cached note. A failure (private mode/quota) is silent. */
export function writeCachedNote(
  fingerprint: string,
  note: string,
  storage?: CoachStorage | null,
): void {
  const store = storageOrNull(storage);
  if (!store || !isDisplayableNote(note)) return;
  try {
    store.setItem(
      COACH_NOTE_KEY,
      JSON.stringify({ fingerprint, note: note.trim() }),
    );
  } catch {
    // Cache is optional; the fallback note remains available.
  }
}

/** Keep the same validation as the client guard, for hooks and tests. */
export function isCoachMinutesValue(value: unknown): value is CoachMinutes {
  return value === 15 || value === 30 || value === 60;
}
