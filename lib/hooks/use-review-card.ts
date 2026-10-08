"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isReviewCardState,
  isReviewRateResult,
  notifyReviewQueueChanged,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "@/lib/reviews/client";
import {
  EMPTY_REVIEW_CARD,
  type ReviewCardState,
  type ReviewRateRequest,
  type ReviewRateResult,
  type ReviewRating,
  type ReviewRatingContext,
} from "@/lib/reviews/types";

type LoadStatus = "loading" | "ready" | "error";

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
    // Use the status when the response has no readable error body.
  }
  return `Review request failed (${response.status}).`;
}

export function useReviewCard(slug: string) {
  const [card, setCard] = useState<ReviewCardState>(EMPTY_REVIEW_CARD);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ratingContext, setRatingContext] =
    useState<ReviewRatingContext | null>(null);
  const [ratingPending, setRatingPending] =
    useState<ReviewRateRequest | null>(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingCanRetry, setRatingCanRetry] = useState(false);
  const [ratingConflict, setRatingConflict] = useState<string | null>(null);
  const [ratingResult, setRatingResult] =
    useState<ReviewRateResult | null>(null);
  const ratingContextRef = useRef<ReviewRatingContext | null>(null);
  const ratingPendingRef = useRef<ReviewRateRequest | null>(null);
  const ratingInFlightRef = useRef(false);
  const ratingConflictNeedsRefreshRef = useRef(false);
  const activeUpdateRef = useRef(false);

  const readCard = useCallback(async (): Promise<ReviewCardState> => {
    const response = await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await responseError(response));
    const payload: unknown = await response.json();
    if (!isReviewCardState(payload)) {
      throw new Error("Review state was not in the expected shape.");
    }
    return payload;
  }, [slug]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setError(null);
      setStatus((current) => (current === "ready" ? "ready" : "loading"));
    }
    try {
      const latest = await readCard();
      setCard(latest);
      setStatus("ready");
      if (ratingConflictNeedsRefreshRef.current) {
        const previous = ratingContextRef.current;
        if (previous) {
          const refreshedContext = Object.freeze({
            ...previous,
            expectedRevision: latest.revision,
          });
          ratingContextRef.current = refreshedContext;
          setRatingContext(refreshedContext);
        }
        ratingConflictNeedsRefreshRef.current = false;
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load review state.",
      );
      setStatus("error");
    }
  }, [readCard]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(true), 0);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, refreshWhenVisible);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, refreshWhenVisible);
    };
  }, [refresh]);

  const setActive = useCallback(
    async (active: boolean) => {
      if (
        status !== "ready" ||
        saving ||
        activeUpdateRef.current ||
        ratingInFlightRef.current ||
        ratingPendingRef.current ||
        !card.enrolled
      ) {
        return;
      }

      activeUpdateRef.current = true;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reviews/${encodeURIComponent(slug)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active, expectedRevision: card.revision }),
          },
        );

        if (!response.ok) throw new Error(await responseError(response));
        const payload: unknown = await response.json();
        if (!isReviewCardState(payload)) {
          throw new Error("Review state was not in the expected shape.");
        }
        setCard(payload);
        setStatus("ready");
        notifyReviewQueueChanged();
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Could not update review state.";
        try {
          setCard(await readCard());
          setStatus("ready");
        } catch {
          // Keep the original mutation error if the refresh also fails.
        }
        setError(message);
      } finally {
        activeUpdateRef.current = false;
        setSaving(false);
      }
    },
    [card.enrolled, card.revision, readCard, saving, slug, status],
  );

  const openRating = useCallback(
    (mode: ReviewRatingContext["mode"], submissionId?: string | null) => {
      // Keep an uncertain request and its original context when reopening.
      if (ratingPendingRef.current) return;
      if (status !== "ready") return;
      const context = Object.freeze({
        mode,
        expectedRevision: card.revision,
        submissionId: submissionId ?? null,
      });
      ratingContextRef.current = context;
      setRatingContext(context);
      setRatingResult(null);
      setRatingError(null);
      setRatingCanRetry(false);
      setRatingConflict(null);
    },
    [card.revision, status],
  );

  const closeRating = useCallback(() => {
    if (ratingInFlightRef.current) return false;
    // An uncertain request remains available for an exact retry next time.
    if (!ratingPendingRef.current) {
      ratingContextRef.current = null;
      setRatingContext(null);
      setRatingError(null);
      setRatingCanRetry(false);
      setRatingConflict(null);
    }
    return true;
  }, []);

  const sendRating = useCallback(
    async (request: ReviewRateRequest) => {
      if (ratingInFlightRef.current) return;
      ratingInFlightRef.current = true;
      setRatingSaving(true);
      setRatingError(null);
      setRatingCanRetry(false);
      setRatingConflict(null);

      try {
        const response = await fetch(
          `/api/reviews/${encodeURIComponent(slug)}/rate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          },
        );

        if (response.status === 409) {
          const message = await responseError(response);
          ratingPendingRef.current = null;
          setRatingPending(null);
          setRatingCanRetry(false);
          ratingConflictNeedsRefreshRef.current = true;
          setRatingConflict(
            `${message} Your rating was not saved. The review state has been refreshed; choose a rating again if you still want to record it.`,
          );
          try {
            const latest = await readCard();
            setCard(latest);
            setStatus("ready");
            const previous = ratingContextRef.current;
            if (previous) {
              const refreshedContext = Object.freeze({
                ...previous,
                expectedRevision: latest.revision,
              });
              ratingContextRef.current = refreshedContext;
              setRatingContext(refreshedContext);
            }
            ratingConflictNeedsRefreshRef.current = false;
          } catch {
            setStatus("error");
          }
          return;
        }

        if (!response.ok) {
          const message = await responseError(response);
          if (response.status >= 500 || response.status === 408) {
            throw new Error(message);
          }
          ratingPendingRef.current = null;
          setRatingPending(null);
          setRatingError(`${message} Rating was not saved.`);
          return;
        }

        const payload: unknown = await response.json();
        if (
          !isReviewRateResult(payload) ||
          payload.requestId !== request.requestId ||
          payload.rating !== request.rating
        ) {
          throw new Error("Saved review was not in the expected shape.");
        }

        setRatingResult(payload);
        ratingPendingRef.current = null;
        setRatingPending(null);
        setRatingError(null);
        setRatingCanRetry(false);

        // The result is persisted evidence. It remains safe to show even if a
        // following canonical read fails; a successful read replaces it.
        setCard((current) => ({
          ...current,
          enrolled: true,
          active: true,
          dueAt: payload.dueAt,
          lastRating: payload.rating,
          revision: payload.revision,
        }));
        try {
          const latest = await readCard();
          setCard(latest);
          setStatus("ready");
        } catch {
          // Keep the server-confirmed result as the current displayed state.
        }
        notifyReviewQueueChanged();
      } catch (cause) {
        setRatingError(
          cause instanceof Error ? cause.message : "Could not save this rating.",
        );
        setRatingCanRetry(true);
      } finally {
        ratingInFlightRef.current = false;
        setRatingSaving(false);
      }
    },
    [readCard, slug],
  );

  const rate = useCallback(
    (rating: ReviewRating) => {
      if (
        ratingInFlightRef.current ||
        ratingPendingRef.current ||
        status !== "ready"
      ) {
        return;
      }
      const context = ratingContextRef.current;
      if (!context) return;
      const request: ReviewRateRequest = Object.freeze({
        rating,
        requestId: crypto.randomUUID(),
        expectedRevision: context.expectedRevision,
        submissionId: context.submissionId,
      });
      ratingPendingRef.current = request;
      setRatingPending(request);
      void sendRating(request);
    },
    [sendRating, status],
  );

  const retryRating = useCallback(() => {
    const request = ratingPendingRef.current;
    if (!request || ratingInFlightRef.current) return;
    void sendRating(request);
  }, [sendRating]);

  const pause = useCallback(() => {
    if (!card.enrolled || !card.active) return;
    return setActive(false);
  }, [card.active, card.enrolled, setActive]);

  const resume = useCallback(() => {
    if (!card.enrolled || card.active) return;
    return setActive(true);
  }, [card.active, card.enrolled, setActive]);

  return {
    card,
    status,
    error,
    saving,
    refresh,
    pause,
    resume,
    ratingContext,
    ratingPending,
    ratingSaving,
    ratingError,
    ratingCanRetry,
    ratingConflict,
    ratingResult,
    openRating,
    closeRating,
    rate,
    retryRating,
  };
}
