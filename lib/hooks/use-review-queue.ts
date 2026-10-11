"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { scheduleReviewBoundary } from "@/lib/reviews/boundary";
import {
  isReviewQueue,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "@/lib/reviews/client";
import type { ReviewQueue } from "@/lib/reviews/types";

/**
 * The study shell owns one loader. Consumers read its context, so the badge,
 * reminder, and hub share both the last good queue and any refresh error.
 *
 * `status` is about having data, not about the last request: a failed refresh
 * keeps the last good queue and reports the failure through `error`, while a
 * failure with nothing to show is the `error` status the caller must render as
 * unavailable rather than as an empty queue.
 */
export type ReviewQueueStatus = "loading" | "ready" | "error";

export type ReviewQueueState = {
  queue: ReviewQueue | null;
  status: ReviewQueueStatus;
  error: string | null;
  refreshing: boolean;
  /** Canonical queue after the refresh, or null when it could not be confirmed. */
  refresh: (silent?: boolean) => Promise<ReviewQueue | null>;
};

export const ReviewQueueContext = createContext<ReviewQueueState | null>(null);

export function useReviewQueue(): ReviewQueueState {
  const state = useContext(ReviewQueueContext);
  if (!state) throw new Error("Review queue requires ReviewQueueProvider.");
  return state;
}

async function responseError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    // Use the response status when the body is missing or malformed.
  }
  return `Review queue request failed (${response.status}).`;
}

/** Only ReviewQueueProvider calls this hook; consumers call useReviewQueue. */
export function useReviewQueueLoader(
  initial: ReviewQueue | null,
  initialError: string | null = null,
): ReviewQueueState {
  const [queue, setQueue] = useState<ReviewQueue | null>(initial);
  const [status, setStatus] = useState<ReviewQueueStatus>(
    initial ? "ready" : initialError ? "error" : "loading",
  );
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef<Promise<ReviewQueue | null> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const refreshAgainRef = useRef(false);
  const pathname = usePathname();

  const refresh = useCallback((silent = false): Promise<ReviewQueue | null> => {
    if (!silent) setRefreshing(true);
    refreshAgainRef.current = true;
    if (requestRef.current) return requestRef.current;

    const controller = new AbortController();
    controllerRef.current = controller;
    // Calls before the read starts share it. A write during a read queues a
    // fresh read afterward; every caller waits for that final canonical result.
    const request = Promise.resolve().then(async () => {
      let latest: ReviewQueue | null = null;
      try {
        do {
          refreshAgainRef.current = false;
          if (controller.signal.aborted) return null;
          try {
            const response = await fetch("/api/reviews", {
              cache: "no-store",
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(await responseError(response));
            const payload: unknown = await response.json();
            if (!isReviewQueue(payload)) {
              throw new Error("Review queue was not in the expected shape.");
            }
            if (controller.signal.aborted) return null;
            latest = payload;
            setQueue(payload);
            setStatus("ready");
            setError(null);
          } catch (cause) {
            if (controller.signal.aborted) return null;
            latest = null;
            setError(cause instanceof Error ? cause.message : "Could not load reviews.");
            setStatus((current) => (current === "ready" ? "ready" : "error"));
          }
        } while (refreshAgainRef.current);
        return latest;
      } finally {
        if (controllerRef.current === controller) {
          requestRef.current = null;
          controllerRef.current = null;
          if (!controller.signal.aborted) setRefreshing(false);
        }
      }
    });
    requestRef.current = request;
    return request;
  }, []);

  // Mount and navigation: a silent re-read keeps the count correct after the
  // client router moves between the study pages.
  useEffect(() => {
    const first = window.setTimeout(() => void refresh(true), 0);
    return () => window.clearTimeout(first);
  }, [pathname, refresh]);

  // Focus, visibility, and a review write anywhere in the app.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, refreshWhenVisible);

    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      requestRef.current = null;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(
        REVIEW_QUEUE_CHANGED_EVENT,
        refreshWhenVisible,
      );
    };
  }, [refresh]);

  // The due boundary: when the next active card comes due, the count changes
  // without any user action.
  const nextDueAt = queue?.nextDueAt ?? null;
  useEffect(() => {
    if (!nextDueAt) return;
    return scheduleReviewBoundary(nextDueAt, () => void refresh(true));
  }, [nextDueAt, refresh]);

  return { queue, status, error, refreshing, refresh };
}
