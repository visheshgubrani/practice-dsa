"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { fetchPractice, patchPractice, PracticeConflict } from "@/lib/practice/client";
import {
  acceptedRecoveryKey,
  codeDirtyKey,
  codeRecoveryKey,
  languageRecoveryKey,
  notesDirtyKey,
  notesRecoveryKey,
} from "@/lib/practice/keys";
import { resolveLoadedNotes, resolveLoadedSource } from "@/lib/practice/load";
import { createSerialQueue } from "@/lib/practice/serial";
import {
  SAVE_DEBOUNCE_MS,
  type LegacySnapshot,
  type PracticeProgress,
  type PracticeState,
  type VerifiedAccepted,
} from "@/lib/practice/types";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import {
  DEFAULT_LANGUAGE,
  getLanguage,
  toLanguageId,
  type LanguageId,
} from "@/lib/languages";
import type { Problem, SolutionNotes } from "@/lib/problems";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type PracticeConflictState = {
  resource: "draft" | "progress";
  revision: number;
  updatedAt: string | null;
};

type DraftJob = { overwrite: boolean };
type ProgressJob = {
  overwrite: boolean;
  includeNotes: boolean;
  includeLanguage: boolean;
};

export type AcceptedRecord = {
  source: string;
  language: LanguageId;
  at: string;
} | null;

export type UsePracticeOptions = {
  /**
   * Revise mode: the editor works on a throwaway copy of the accepted solution
   * instead of the stored draft.
   *
   * The stored draft is the record of your first attempt and the accepted
   * source is the record of what worked, so a revisit must not overwrite
   * either. In this mode nothing is read from or written to the draft: the
   * buffer starts as the accepted code, edits live in memory for the visit, and
   * a refresh starts the pass over. Submits still record history.
   */
  revision?: boolean;
};

const TODO_PROGRESS: PracticeProgress = {
  status: "todo",
  preferredLanguage: null,
  solvedAt: null,
  revision: 0,
  updatedAt: null,
};

function mergeDraft(pending: DraftJob, next: DraftJob): DraftJob {
  return { overwrite: pending.overwrite || next.overwrite };
}

function mergeProgress(pending: ProgressJob, next: ProgressJob): ProgressJob {
  return {
    overwrite: pending.overwrite || next.overwrite,
    includeNotes: pending.includeNotes || next.includeNotes,
    includeLanguage: pending.includeLanguage || next.includeLanguage,
  };
}

function toAccepted(state: {
  latestAccepted: {
    source: string;
    language: string;
    at: string;
  } | null;
}): AcceptedRecord {
  const latest = state.latestAccepted;
  if (!latest) return null;
  const language = toLanguageId(latest.language);
  if (!language) return null;
  return { source: latest.source, language, at: latest.at };
}

/**
 * Postgres is the practice store. localStorage keys are a recovery copy for
 * unsaved edits, written on every keystroke, and never treated as a reason to
 * overwrite a real draft with a starter template.
 */
export function usePractice(
  problem: Problem,
  { revision = false }: UsePracticeOptions = {},
) {
  const languageState = usePersistedState<LanguageId>(
    languageRecoveryKey(problem.slug),
    DEFAULT_LANGUAGE,
  );
  const language = getLanguage(
    toLanguageId(languageState.value) ?? DEFAULT_LANGUAGE,
  );
  const starter = problem.starterCode[language.id];

  const codeState = usePersistedState<string>(
    codeRecoveryKey(problem.slug, language.id),
    starter,
  );
  const notesState = usePersistedState<SolutionNotes>(
    notesRecoveryKey(problem.slug),
    problem.notes,
  );
  const acceptedState = usePersistedState<AcceptedRecord>(
    acceptedRecoveryKey(problem.slug),
    null,
  );
  const codeDirty = usePersistedState<boolean>(
    codeDirtyKey(problem.slug, language.id),
    false,
  );
  const notesDirty = usePersistedState<boolean>(
    notesDirtyKey(problem.slug),
    false,
  );

  /**
   * The revise buffer. Null until the fetch that knows the accepted source
   * resolves, because the accepted code is server state and the first paint
   * has not seen it yet.
   */
  const [revisionSource, setRevisionSource] = useState<string | null>(null);
  const revisionSeeded = useRef(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<SaveStatus>("idle");
  const [notesStatus, setNotesStatus] = useState<SaveStatus>("idle");
  const [draftConflict, setDraftConflict] = useState<PracticeConflictState | null>(
    null,
  );
  const [notesConflict, setNotesConflict] = useState<PracticeConflictState | null>(
    null,
  );
  const [serverAccepted, setServerAccepted] = useState<AcceptedRecord>(null);
  const [legacySnapshot, setLegacySnapshot] = useState<LegacySnapshot | null>(
    null,
  );
  const [progress, setProgress] = useState<PracticeProgress>(TODO_PROGRESS);

  const setCodeDirty = codeDirty.setValue;
  const setNotesDirty = notesDirty.setValue;
  const setCode = codeState.setValue;
  const setNotes = notesState.setValue;
  const setLanguageRecovery = languageState.setValue;

  const live = useRef({
    starter,
    notesFallback: problem.notes,
    source: codeState.value,
    notes: notesState.value,
    language: language.id,
    slug: problem.slug,
    revision,
    ready: false,
    draftConflict: null as PracticeConflictState | null,
    notesConflict: null as PracticeConflictState | null,
    codeDirty: codeDirty.value,
    notesDirty: notesDirty.value,
    draftRevision: 0,
    progressRevision: 0,
    setCodeDirty,
    setNotesDirty,
    setCode,
    setNotes,
    setLanguageRecovery,
    setDraftStatus,
    setNotesStatus,
    setDraftConflict,
    setNotesConflict,
    setServerAccepted,
    setLegacySnapshot,
    setReady,
    setLoadError,
  });

  useLayoutEffect(() => {
    const current = live.current;
    current.starter = starter;
    current.notesFallback = problem.notes;
    current.source = codeState.value;
    current.notes = notesState.value;
    current.language = language.id;
    current.slug = problem.slug;
    current.revision = revision;
    current.ready = ready;
    current.draftConflict = draftConflict;
    current.notesConflict = notesConflict;
    current.codeDirty = codeDirty.value;
    current.notesDirty = notesDirty.value;
    current.setCodeDirty = setCodeDirty;
    current.setNotesDirty = setNotesDirty;
    current.setCode = setCode;
    current.setNotes = setNotes;
    current.setLanguageRecovery = setLanguageRecovery;
  });

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftQueueRef = useRef<ReturnType<
    typeof createSerialQueue<DraftJob>
  > | null>(null);
  const progressQueueRef = useRef<ReturnType<
    typeof createSerialQueue<ProgressJob>
  > | null>(null);

  const getDraftQueue = useCallback(() => {
    draftQueueRef.current ??= createSerialQueue(async (job: DraftJob) => {
      const current = live.current;
      if (!current.ready && !job.overwrite) return;
      if (current.draftConflict && !job.overwrite) return;
      if (!job.overwrite && !current.codeDirty) return;
      current.setDraftStatus("saving");
      try {
        const next = await patchPractice(
          current.slug,
          {
            language: current.language,
            draft: {
              source: current.source,
              ...(job.overwrite ? {} : { revision: current.draftRevision }),
            },
          },
          { keepalive: true },
        );
        current.draftRevision = next.draft?.revision ?? current.draftRevision;
        current.progressRevision = next.progress.revision;
        current.setCodeDirty(false);
        current.codeDirty = false;
        current.setDraftConflict(null);
        current.setDraftStatus("saved");
        current.setServerAccepted(toAccepted(next));
      } catch (error) {
        if (error instanceof PracticeConflict) {
          current.setDraftConflict({
            resource: error.resource,
            revision: error.revision,
            updatedAt: error.updatedAt,
          });
          current.setDraftStatus("error");
          return;
        }
        current.setDraftStatus("error");
      }
    }, mergeDraft);
    return draftQueueRef.current;
  }, []);

  const getProgressQueue = useCallback(() => {
    progressQueueRef.current ??= createSerialQueue(async (job: ProgressJob) => {
      const current = live.current;
      if (!current.ready && !job.overwrite) return;
      if (current.notesConflict && !job.overwrite) return;
      if (!job.overwrite && !job.includeLanguage && !current.notesDirty) {
        return;
      }
      current.setNotesStatus("saving");
      try {
        const notes = current.notes;
        const next = await patchPractice(
          current.slug,
          {
            ...(job.includeNotes
              ? {
                  notes: {
                    approach: notes.approach,
                    timeComplexity: notes.timeComplexity,
                    spaceComplexity: notes.spaceComplexity,
                  },
                }
              : {}),
            ...(job.includeLanguage
              ? { preferredLanguage: current.language }
              : {}),
            ...(job.overwrite
              ? {}
              : { progressRevision: current.progressRevision }),
          },
          { keepalive: true },
        );
        current.progressRevision = next.progress.revision;
        if (next.draft) current.draftRevision = next.draft.revision;
        current.setNotesDirty(false);
        current.notesDirty = false;
        current.setNotesConflict(null);
        current.setNotesStatus("saved");
        current.setServerAccepted(toAccepted(next));
      } catch (error) {
        if (error instanceof PracticeConflict) {
          current.setNotesConflict({
            resource: error.resource,
            revision: error.revision,
            updatedAt: error.updatedAt,
          });
          current.setNotesStatus("error");
          return;
        }
        current.setNotesStatus("error");
      }
    }, mergeProgress);
    return progressQueueRef.current;
  }, []);

  const scheduleDraft = useCallback(
    (overwrite = false) => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      const delay = overwrite ? 0 : SAVE_DEBOUNCE_MS;
      draftTimer.current = setTimeout(() => {
        draftTimer.current = null;
        void getDraftQueue().enqueue({ overwrite });
      }, delay);
    },
    [getDraftQueue],
  );

  const scheduleProgress = useCallback(
    (job: ProgressJob, immediate = false) => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      const delay = immediate || job.overwrite ? 0 : SAVE_DEBOUNCE_MS;
      progressTimer.current = setTimeout(() => {
        progressTimer.current = null;
        void getProgressQueue().enqueue(job);
      }, delay);
    },
    [getProgressQueue],
  );

  const flush = useCallback(async () => {
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
      progressTimer.current = null;
    }
    const current = live.current;
    const tasks: Promise<void>[] = [];
    if (current.codeDirty) {
      tasks.push(getDraftQueue().enqueue({ overwrite: false }));
    }
    if (current.notesDirty) {
      tasks.push(
        getProgressQueue().enqueue({
          overwrite: false,
          includeNotes: true,
          includeLanguage: false,
        }),
      );
    }
    await Promise.all(tasks);
  }, [getDraftQueue, getProgressQueue]);

  const applyServer = useCallback(
    (retryDraft: boolean, retryNotes: boolean) => {
      if (retryDraft) {
        live.current.codeDirty = true;
        live.current.setCodeDirty(true);
        scheduleDraft();
      }
      if (retryNotes) {
        live.current.notesDirty = true;
        live.current.setNotesDirty(true);
        scheduleProgress({
          overwrite: false,
          includeNotes: true,
          includeLanguage: false,
        });
      }
    },
    [scheduleDraft, scheduleProgress],
  );

  const applyLoadedState = useCallback(
    (state: PracticeState) => {
      const current = live.current;
      current.draftRevision = state.draft?.revision ?? 0;
      current.progressRevision = state.progress.revision;
      setServerAccepted(toAccepted(state));
      setLegacySnapshot(state.legacySnapshot);
      setProgress(state.progress);
      setLoadError(null);

      const preferred = toLanguageId(state.progress.preferredLanguage);
      if (preferred && preferred !== current.language && !current.revision) {
        current.setLanguageRecovery(preferred);
        return;
      }

      // Revise mode: the buffer is the accepted code, taken once from the first
      // load that knows it. Re-seeding on a later load would throw away edits in
      // progress, so this happens exactly once per visit.
      if (current.revision) {
        if (!revisionSeeded.current) {
          revisionSeeded.current = true;
          const source = toAccepted(state)?.source ?? current.source;
          current.source = source;
          setRevisionSource(source);
        }
        setLegacySnapshot(state.legacySnapshot);
        setLoadError(null);
        setDraftConflict(null);
        setNotesConflict(null);
        setReady(true);
        current.ready = true;
        return;
      }

      const loadedSource = resolveLoadedSource({
        server: state.draft?.source ?? null,
        recovery: current.source,
        starter: current.starter,
        dirty: current.codeDirty,
      });
      const loadedNotes = resolveLoadedNotes({
        server: state.notes,
        recovery: current.notes,
        fallback: current.notesFallback,
        dirty: current.notesDirty,
      });

      current.source = loadedSource.value;
      current.notes = loadedNotes.value;
      current.setCode(loadedSource.value);
      current.setNotes(loadedNotes.value);
      if (!loadedSource.retrySave) {
        current.codeDirty = false;
        current.setCodeDirty(false);
      }
      if (!loadedNotes.retrySave) {
        current.notesDirty = false;
        current.setNotesDirty(false);
      }
      setDraftConflict(null);
      setNotesConflict(null);
      setReady(true);
      current.ready = true;
      applyServer(loadedSource.retrySave, loadedNotes.retrySave);
    },
    [applyServer],
  );

  const onLoadFailed = useCallback((error: unknown) => {
    setReady(false);
    live.current.ready = false;
    setLoadError(
      error instanceof Error ? error.message : "Could not load saved work.",
    );
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const state = await fetchPractice(problem.slug, language.id, signal);
        if (signal?.aborted) return;
        applyLoadedState(state);
      } catch (error) {
        if (signal?.aborted) return;
        onLoadFailed(error);
      }
    },
    [applyLoadedState, language.id, onLoadFailed, problem.slug],
  );

  useEffect(() => {
    if (
      !codeState.hydrated ||
      !notesState.hydrated ||
      !codeDirty.hydrated ||
      !notesDirty.hydrated ||
      !languageState.hydrated
    ) {
      return;
    }
    const controller = new AbortController();
    const current = live.current;
    current.ready = false;
    fetchPractice(problem.slug, language.id, controller.signal).then(
      (state) => {
        if (controller.signal.aborted) return;
        applyLoadedState(state);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        onLoadFailed(error);
      },
    );
    return () => {
      controller.abort();
      current.ready = false;
    };
  }, [
    applyLoadedState,
    codeDirty.hydrated,
    codeState.hydrated,
    language.id,
    languageState.hydrated,
    notesDirty.hydrated,
    notesState.hydrated,
    onLoadFailed,
    problem.slug,
    // Switching into or out of a revise session changes what a load applies, so
    // it has to reload. The workspace also remounts on the switch.
    revision,
  ]);

  useEffect(() => {
    const onLeave = () => {
      void flush();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      void flush();
      if (draftTimer.current) clearTimeout(draftTimer.current);
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
  }, [flush]);

  useEffect(() => {
    if (draftStatus !== "saved") return;
    const timer = setTimeout(() => setDraftStatus("idle"), 1600);
    return () => clearTimeout(timer);
  }, [draftStatus]);

  useEffect(() => {
    if (notesStatus !== "saved") return;
    const timer = setTimeout(() => setNotesStatus("idle"), 1600);
    return () => clearTimeout(timer);
  }, [notesStatus]);

  const onCodeChange = useCallback(
    (value: string) => {
      const current = live.current;
      if (value === current.source) return;
      current.source = value;

      // A revise buffer is not the draft: keeping `codeDirty` false is what
      // stops the draft queue from writing it to Postgres.
      if (current.revision) {
        setRevisionSource(value);
        return;
      }

      current.codeDirty = true;
      current.setCode(value);
      current.setCodeDirty(true);
      if (current.ready && !current.draftConflict) {
        scheduleDraft();
      }
    },
    [scheduleDraft],
  );

  const onNotesChange = useCallback(
    (value: SolutionNotes) => {
      const current = live.current;
      current.notes = value;
      current.notesDirty = true;
      current.setNotes(value);
      current.setNotesDirty(true);
      if (current.ready && !current.notesConflict) {
        scheduleProgress({
          overwrite: false,
          includeNotes: true,
          includeLanguage: false,
        });
      }
    },
    [scheduleProgress],
  );

  const onLanguageChange = useCallback(
    (next: LanguageId) => {
      if (next === live.current.language) return;
      void flush().then(() => {
        live.current.setLanguageRecovery(next);
        live.current.language = next;
        if (live.current.ready && !live.current.notesConflict) {
          scheduleProgress(
            {
              overwrite: false,
              includeNotes: false,
              includeLanguage: true,
            },
            true,
          );
        }
      });
    },
    [flush, scheduleProgress],
  );

  const onReset = useCallback(() => {
    const current = live.current;
    current.source = current.starter;
    if (current.revision) {
      setRevisionSource(current.starter);
      return;
    }
    current.codeDirty = true;
    current.setCode(current.starter);
    current.setCodeDirty(true);
    if (current.ready && !current.draftConflict) {
      scheduleDraft();
    }
  }, [scheduleDraft]);

  const retryDraftSave = useCallback(() => {
    void getDraftQueue().enqueue({ overwrite: false });
  }, [getDraftQueue]);

  const retryNotesSave = useCallback(() => {
    void getProgressQueue().enqueue({
      overwrite: false,
      includeNotes: true,
      includeLanguage: false,
    });
  }, [getProgressQueue]);

  const overwriteDraft = useCallback(() => {
    void getDraftQueue().enqueue({ overwrite: true });
  }, [getDraftQueue]);

  const overwriteNotes = useCallback(() => {
    void getProgressQueue().enqueue({
      overwrite: true,
      includeNotes: true,
      includeLanguage: false,
    });
  }, [getProgressQueue]);

  const reloadDraft = useCallback(() => {
    live.current.codeDirty = false;
    live.current.setCodeDirty(false);
    void load();
  }, [load]);

  const reloadNotes = useCallback(() => {
    live.current.notesDirty = false;
    live.current.setNotesDirty(false);
    void load();
  }, [load]);

  const retryLoad = useCallback(() => {
    void load();
  }, [load]);

  const applyPersistedRun = useCallback(
    (update: {
      progress?: PracticeProgress;
      latestAccepted?: VerifiedAccepted | null;
    }) => {
      if (update.progress) {
        live.current.progressRevision = update.progress.revision;
        setProgress(update.progress);
      }
      if (update.latestAccepted !== undefined) {
        setServerAccepted(
          toAccepted({ latestAccepted: update.latestAccepted }),
        );
      }
    },
    [],
  );

  return {
    language,
    /**
     * What the editor shows. In revise mode that is the throwaway buffer, which
     * is seeded from the accepted code and never written back as a draft.
     */
    source: revision ? (revisionSource ?? codeState.value) : codeState.value,
    revision,
    notes: notesState.value,
    accepted: serverAccepted ?? acceptedState.value,
    legacySnapshot,
    hasVerifiedAccepted: serverAccepted !== null,
    progress,
    setAccepted: acceptedState.setValue,
    hydrated:
      codeState.hydrated && notesState.hydrated && languageState.hydrated,
    ready,
    loadError,
    draftStatus,
    notesStatus,
    draftConflict,
    notesConflict,
    onCodeChange,
    onNotesChange,
    onLanguageChange,
    onReset,
    retryLoad,
    applyPersistedRun,
    retryDraftSave,
    retryNotesSave,
    overwriteDraft,
    overwriteNotes,
    reloadDraft,
    reloadNotes,
  };
}
