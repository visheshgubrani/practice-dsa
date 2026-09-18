"use client";

import { useCallback } from "react";

import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import type { LanguageId } from "@/lib/languages";

/** slug -> acceptance record, fed by Submit and read by the list and notes. */
export type Progress = Record<
  string,
  { status: "accepted"; language: LanguageId; at: string }
>;

const PROGRESS_KEY = "dsa.progress";
/** Module-level so the persisted-state hook sees a stable initial value. */
const EMPTY_PROGRESS: Progress = {};

export function useProgress() {
  const { value, setValue, hydrated } = usePersistedState<Progress>(
    PROGRESS_KEY,
    EMPTY_PROGRESS,
  );

  const markAccepted = useCallback(
    (slug: string, language: LanguageId) => {
      setValue((previous) => ({
        ...previous,
        [slug]: {
          status: "accepted",
          language,
          at: new Date().toISOString(),
        },
      }));
    },
    [setValue],
  );

  return { progress: value, hydrated, markAccepted };
}
