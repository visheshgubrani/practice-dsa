import type { SolutionNotes } from "@/lib/problems";

/**
 * Decide what the editor / notes should show after a successful GET, and
 * whether that buffer still needs to be written.
 *
 * A starter (or reference notes) sitting in recovery is not unsaved work —
 * treating it as such would overwrite a real Postgres draft on first paint.
 * Only a dirty recovery copy is allowed to win over the server.
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

export function notesEqual(a: SolutionNotes, b: SolutionNotes): boolean {
  return (
    a.approach === b.approach &&
    a.timeComplexity === b.timeComplexity &&
    a.spaceComplexity === b.spaceComplexity
  );
}

export function resolveLoadedNotes(options: {
  server: SolutionNotes | null;
  recovery: SolutionNotes | null;
  fallback: SolutionNotes;
  dirty: boolean;
}): LoadedBuffer<SolutionNotes> {
  const recovery = options.recovery ?? options.fallback;
  if (options.dirty && options.recovery != null) {
    return {
      value: options.recovery,
      retrySave:
        options.server == null || !notesEqual(options.recovery, options.server),
    };
  }
  if (options.server != null) {
    return { value: options.server, retrySave: false };
  }
  return { value: recovery, retrySave: false };
}
