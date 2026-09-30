import {
  emptyPersonalNotes,
  normalizePersonalNotes,
  notesEqual,
  type PersonalNotes,
} from "@/lib/practice/notes";

/**
 * Decide what the editor / notes should show after a successful GET, and
 * whether that buffer still needs to be written.
 *
 * A starter sitting in recovery is not unsaved work — treating it as such
 * would overwrite a real Postgres draft on first paint. Only a dirty recovery
 * copy is allowed to win over the server.
 *
 * Personal notes start empty. The fallback is that empty record, never the
 * catalog's approach guidance.
 */

export type LoadedBuffer<T> = {
  value: T;
  retrySave: boolean;
};

export function resolveLoadedSource(options: {
  server: string | null;
  recovery: string | null;
  starter: string;
  dirty: boolean;
}): LoadedBuffer<string> {
  const fallback = options.recovery ?? options.starter;
  if (options.dirty && options.recovery != null) {
    const baseline = options.server ?? options.starter;
    return {
      value: options.recovery,
      retrySave: options.recovery !== baseline,
    };
  }
  if (options.server != null) {
    return { value: options.server, retrySave: false };
  }
  return { value: fallback, retrySave: false };
}

export { notesEqual };

export function resolveLoadedNotes(options: {
  server: PersonalNotes | null;
  recovery: PersonalNotes | null;
  fallback: PersonalNotes;
  dirty: boolean;
}): LoadedBuffer<PersonalNotes> {
  const fallback = normalizePersonalNotes(options.fallback);
  const recovery =
    options.recovery == null ? null : normalizePersonalNotes(options.recovery);
  const server =
    options.server == null ? null : normalizePersonalNotes(options.server);
  const recovered = recovery ?? fallback;
  if (options.dirty && recovery != null) {
    return {
      value: recovery,
      retrySave: server == null || !notesEqual(recovery, server),
    };
  }
  if (server != null) {
    return { value: server, retrySave: false };
  }
  return { value: recovered, retrySave: false };
}

export { emptyPersonalNotes };
