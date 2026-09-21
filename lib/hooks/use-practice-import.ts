"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { importPractice } from "@/lib/practice/client";
import {
  collectBrowserPractice,
  isEmptyImport,
  isImportComplete,
  markImportComplete,
  summarizeImport,
} from "@/lib/practice/collect";
import type { PracticeImportPayload } from "@/lib/practice/types";

export type PracticeImportStatus = "idle" | "importing" | "error";

type ImportScan = {
  complete: boolean;
  payload: PracticeImportPayload;
};

const COMPLETE_SCAN: ImportScan = { complete: true, payload: {} };
const EMPTY_PENDING: ImportScan = { complete: false, payload: {} };

let cachedScan: ImportScan | undefined;

function readScan(): ImportScan {
  try {
    if (isImportComplete(window.localStorage)) return COMPLETE_SCAN;
    if (cachedScan) return cachedScan;
    const payload = collectBrowserPractice(window.localStorage);
    cachedScan = isEmptyImport(payload)
      ? EMPTY_PENDING
      : { complete: false, payload };
    return cachedScan;
  } catch {
    return COMPLETE_SCAN;
  }
}

function subscribe() {
  return () => {};
}

/**
 * One-time prompt to copy pre-Postgres `dsa.*` keys into the database.
 * Completion is stored only after a successful import; original keys stay.
 */
export function usePracticeImport(options?: { onImported?: () => void }) {
  const scan = useSyncExternalStore(subscribe, readScan, () => COMPLETE_SCAN);
  const payload =
    scan.complete || isEmptyImport(scan.payload) ? null : scan.payload;

  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<PracticeImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const onImported = options?.onImported;

  useEffect(() => {
    if (scan.complete || !isEmptyImport(scan.payload)) return;
    markImportComplete(window.localStorage);
  }, [scan]);

  const runImport = useCallback(async () => {
    if (!payload) return;
    setStatus("importing");
    setError(null);
    try {
      await importPractice(payload);
      markImportComplete(window.localStorage);
      cachedScan = COMPLETE_SCAN;
      setDone(true);
      setStatus("idle");
      onImported?.();
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not import practice data.",
      );
    }
  }, [onImported, payload]);

  return {
    visible: payload !== null && !dismissed && !done,
    summary: payload ? summarizeImport(payload) : "",
    status,
    error,
    importNow: () => {
      void runImport();
    },
    dismiss: () => setDismissed(true),
  };
}
