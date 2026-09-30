"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { LanguageId } from "@/lib/languages";
import { requestNotesDraft } from "@/lib/notes/client";
import {
  fillEmptyNoteFields,
  normalizePersonalNotes,
  replaceNoteField,
  type NoteField,
  type PersonalNotes,
} from "@/lib/practice/notes";

/**
 * The AI draft preview for one problem.
 *
 * Nothing here writes notes by itself. Generation fills a preview; a field only
 * reaches Postgres when the user applies it, and that goes through the ordinary
 * `onNotesChange` autosave path. The preview lives above the tabs so switching
 * to the statement and back does not throw it away, and it dies with the
 * workspace, which cancels an in-flight generation.
 */

type NotesDraftState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "insufficient"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; baseline: PersonalNotes; draft: PersonalNotes };

export type NotesDraftRequestInput = {
  language: LanguageId;
  /** The editor buffer, exactly as it stands. */
  source: string;
  threadId?: string;
  submissionId?: string;
};

export type NotesDraftController = {
  status: NotesDraftState["status"];
  /** Why a draft is unavailable: insufficient context, or the failure reason. */
  message: string | null;
  /** The proposal, editable before it is applied. Null unless a draft is ready. */
  draft: PersonalNotes | null;
  /** Fields already applied through the notes save path. */
  applied: readonly NoteField[];
  /** A field whose text changed while the draft was being generated. */
  staleField: NoteField | null;
  generate: (input: NotesDraftRequestInput) => void;
  retry: () => void;
  cancel: () => void;
  discard: () => void;
  fillEmpty: () => void;
  useField: (field: NoteField) => void;
  confirmField: (field: NoteField) => void;
  keepField: () => void;
  setDraftField: (field: NoteField, value: string) => void;
};

export function useNotesDraft(input: {
  slug: string;
  /** The current notes, so an apply never writes over a newer keystroke. */
  notes: PersonalNotes;
  /** The normal notes change handler; this is the only write path. */
  onNotesChange: (notes: PersonalNotes) => void;
}): NotesDraftController {
  const [state, setState] = useState<NotesDraftState>({ status: "idle" });
  const [applied, setApplied] = useState<readonly NoteField[]>([]);
  const [staleField, setStaleField] = useState<NoteField | null>(null);

  const live = useRef(input);
  useLayoutEffect(() => {
    live.current = input;
  });

  const stateRef = useRef<NotesDraftState>(state);
  const update = useCallback((next: NotesDraftState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const lastRequest = useRef<NotesDraftRequestInput | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);

  // Leaving the problem aborts a generation in flight. There is no partial
  // write to undo, which is the point of previewing instead of saving.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      requestRef.current += 1;
    },
    [],
  );

  const generate = useCallback(
    (request: NotesDraftRequestInput) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const id = requestRef.current + 1;
      requestRef.current = id;

      lastRequest.current = request;
      const baseline = normalizePersonalNotes(live.current.notes);
      setApplied([]);
      setStaleField(null);
      update({ status: "generating" });

      void (async () => {
        let outcome: Awaited<ReturnType<typeof requestNotesDraft>>;
        try {
          outcome = await requestNotesDraft(
            {
              slug: live.current.slug,
              language: request.language,
              source: request.source,
              notes: baseline,
              threadId: request.threadId,
              submissionId: request.submissionId,
            },
            controller.signal,
          );
        } catch (error) {
          // The request module reports failures rather than throwing, but a
          // preview must never leave the panel stuck on "generating".
          if (id !== requestRef.current) return;
          update({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "The draft could not be generated.",
          });
          return;
        }

        // A slower earlier request must never replace a newer preview.
        if (id !== requestRef.current) return;
        if (!outcome.ok) {
          update(
            outcome.aborted
              ? { status: "idle" }
              : { status: "error", message: outcome.error },
          );
          return;
        }
        if (outcome.result.status === "insufficient") {
          update({ status: "insufficient", message: outcome.result.message });
          return;
        }
        update({ status: "ready", baseline, draft: outcome.result.notes });
      })();
    },
    [update],
  );

  const retry = useCallback(() => {
    const request = lastRequest.current;
    if (request) generate(request);
  }, [generate]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    requestRef.current += 1;
    update({ status: "idle" });
  }, [update]);

  const discard = useCallback(() => {
    setApplied([]);
    setStaleField(null);
    update({ status: "idle" });
  }, [update]);

  const setDraftField = useCallback(
    (field: NoteField, value: string) => {
      const current = stateRef.current;
      if (current.status !== "ready") return;
      update({
        ...current,
        draft: { ...current.draft, [field]: value },
      });
    },
    [update],
  );

  const applyNotes = useCallback((next: PersonalNotes, fields: NoteField[]) => {
    if (fields.length === 0) return;
    setApplied((previous) => [
      ...previous,
      ...fields.filter((field) => !previous.includes(field)),
    ]);
    live.current.onNotesChange(next);
  }, []);

  const fillEmpty = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "ready") return;
    const notes = normalizePersonalNotes(live.current.notes);
    const merged = fillEmptyNoteFields(notes, current.draft);
    const filled = (Object.keys(merged) as NoteField[]).filter(
      (field) => merged[field] !== notes[field],
    );
    applyNotes(merged, filled);
  }, [applyNotes]);

  const useField = useCallback(
    (field: NoteField) => {
      const current = stateRef.current;
      if (current.status !== "ready") return;
      const result = replaceNoteField(
        normalizePersonalNotes(live.current.notes),
        current.baseline,
        current.draft,
        field,
        false,
      );
      // The field moved while the draft was being generated. Show both versions
      // and let the user decide; never overwrite an edit they just made.
      if (result.stale) {
        setStaleField(field);
        return;
      }
      setStaleField(null);
      applyNotes(result.notes, [field]);
    },
    [applyNotes],
  );

  const confirmField = useCallback(
    (field: NoteField) => {
      const current = stateRef.current;
      if (current.status !== "ready") return;
      const result = replaceNoteField(
        normalizePersonalNotes(live.current.notes),
        current.baseline,
        current.draft,
        field,
        true,
      );
      setStaleField(null);
      applyNotes(result.notes, [field]);
    },
    [applyNotes],
  );

  const keepField = useCallback(() => {
    setStaleField(null);
  }, []);

  return useMemo(
    () => ({
      status: state.status,
      message:
        state.status === "error" || state.status === "insufficient"
          ? state.message
          : null,
      draft: state.status === "ready" ? state.draft : null,
      applied,
      staleField,
      generate,
      retry,
      cancel,
      discard,
      fillEmpty,
      useField,
      confirmField,
      keepField,
      setDraftField,
    }),
    [
      applied,
      cancel,
      confirmField,
      discard,
      fillEmpty,
      generate,
      keepField,
      retry,
      setDraftField,
      staleField,
      state,
      useField,
    ],
  );
}
