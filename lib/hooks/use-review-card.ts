"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isReviewCardState,
  notifyReviewQueueChanged,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "@/lib/reviews/client";
import {
  EMPTY_REVIEW_CARD,
  type ReviewCardState,
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
      if (status !== "ready" || saving) return;

      setSaving(true);
      setError(null);
      try {
        const response = card.enrolled
          ? await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active, expectedRevision: card.revision }),
            })
          : await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
              method: "PUT",
            });

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
        // A concurrent tab may have changed this card. Reload its canonical
        // state, then keep the conflict visible so the user can choose again.
        try {
          setCard(await readCard());
          setStatus("ready");
        } catch {
          // Preserve the original mutation error if the refresh also fails.
        }
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [card.enrolled, card.revision, readCard, saving, slug, status],
  );

  const addOrResume = useCallback(() => {
    if (card.enrolled && card.active) return;
    return setActive(true);
  }, [card.active, card.enrolled, setActive]);

  const pause = useCallback(() => {
    if (!card.enrolled || !card.active) return;
    return setActive(false);
  }, [card.active, card.enrolled, setActive]);

  return { card, status, error, saving, refresh, addOrResume, pause };
}
