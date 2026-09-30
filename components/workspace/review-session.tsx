"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  EMPTY_REVIEW_CARD,
  RATING_MEANING,
  REVIEW_RATINGS,
  type ReviewCardState,
  type ReviewRateResult,
  type ReviewRating,
} from "@/lib/reviews/types";
import {
  isReviewCardState,
  notifyReviewQueueChanged,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "@/lib/reviews/client";
import { scheduleReviewBoundary } from "@/lib/reviews/boundary";

function isRateResult(value: unknown): value is ReviewRateResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<ReviewRateResult>;
  return (
    typeof result.dueAt === "string" &&
    typeof result.revision === "number" &&
    typeof result.requestId === "string" &&
    typeof result.reviewedAt === "string" &&
    typeof result.rating === "string" &&
    REVIEW_RATINGS.includes(result.rating as ReviewRating) &&
    (result.next === null ||
      (typeof result.next === "object" &&
        typeof result.next.slug === "string" &&
        typeof result.next.number === "number" &&
        typeof result.next.title === "string"))
  );
}

async function apiError(response: Response): Promise<string> {
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
    // Use the status below when an error body is absent or malformed.
  }
  return `Review request failed (${response.status}).`;
}

function dueLabel(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type PendingRating = {
  rating: ReviewRating;
  requestId: string;
  expectedRevision: number;
  submissionId: string | null;
};

export function ReviewSession({
  slug,
  submissionId,
}: {
  slug: string;
  submissionId?: string;
}) {
  const [card, setCard] = useState<ReviewCardState>(EMPTY_REVIEW_CARD);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(null);
  const [pending, setPending] = useState<PendingRating | null>(null);
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<ReviewRateResult | null>(null);
  const [now, setNow] = useState(0);

  const loadCard = useCallback(async (): Promise<ReviewCardState> => {
    const response = await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await apiError(response));
    const payload: unknown = await response.json();
    if (!isReviewCardState(payload)) {
      throw new Error("Review state was not in the expected shape.");
    }
    return payload;
  }, [slug]);

  const refreshCard = useCallback(async () => {
    try {
      const payload = await loadCard();
      setNow(Date.now());
      setCard(payload);
      setLoadError(null);
      setLoadStatus("ready");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load review state.",
      );
      setLoadStatus("error");
    }
  }, [loadCard]);

  useEffect(() => {
    const refresh = () => void refreshCard();
    window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, refresh);
  }, [refreshCard]);

  useEffect(() => {
    let cancelled = false;
    void loadCard()
      .then((payload) => {
        if (cancelled) return;
        setNow(Date.now());
        setCard(payload);
        setLoadError(null);
        setLoadStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load review state.",
        );
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadCard]);

  useEffect(() => {
    if (!card.active || !card.dueAt || now === 0) return;
    if (Date.parse(card.dueAt) <= now) return;
    return scheduleReviewBoundary(card.dueAt, () => setNow(Date.now()));
  }, [card.active, card.dueAt, now]);

  const enrollOrResume = useCallback(async () => {
    setEnrolling(true);
    setLoadError(null);
    try {
      const response = card.enrolled
        ? await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: true, expectedRevision: card.revision }),
          })
        : await fetch(`/api/reviews/${encodeURIComponent(slug)}`, {
            method: "PUT",
          });
      if (!response.ok) throw new Error(await apiError(response));
      const payload: unknown = await response.json();
      if (!isReviewCardState(payload)) {
        throw new Error("Review state was not in the expected shape.");
      }
      setNow(Date.now());
      setCard(payload);
      setLoadStatus("ready");
      setPending(null);
      setSaveError(null);
      setConflictMessage(null);
      notifyReviewQueueChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update review state.";
      if (error instanceof Error && error.message.includes("another tab")) {
        await refreshCard();
      }
      // Refreshing canonical state must not erase the mutation conflict.
      setLoadError(message);
    } finally {
      setEnrolling(false);
    }
  }, [card.enrolled, card.revision, refreshCard, slug]);

  const selectRating = (value: string[]) => {
    const rating = value[0] as ReviewRating | undefined;
    setSelectedRating(rating ?? null);
    setPending(null);
    setSaveError(null);
    setConflictMessage(null);
  };

  const saveRating = useCallback(async () => {
    if (!selectedRating || !card.enrolled || !card.active || saving) return;

    // A retry after a transport/server failure must reuse the request ID. A
    // conflict clears `pending`, so the user has to choose and save again
    // against the refreshed revision with a new request ID.
    const request =
      pending?.rating === selectedRating
        ? pending
        : {
            rating: selectedRating,
            requestId: crypto.randomUUID(),
            expectedRevision: card.revision,
            submissionId: submissionId ?? null,
          };
    setPending(request);
    setSaving(true);
    setSaveError(null);
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
        const message = await apiError(response);
        setSelectedRating(null);
        setPending(null);
        setSaveError(null);
        setConflictMessage(
          `${message} Your rating was not saved. The review state has been refreshed; choose a rating again if you still want to record it.`,
        );
        await refreshCard();
        return;
      }
      if (!response.ok) throw new Error(await apiError(response));

      const payload: unknown = await response.json();
      if (!isRateResult(payload)) {
        throw new Error("Saved review was not in the expected shape.");
      }
      setNow(Date.now());
      setSaved(payload);
      setCard((current) => ({
        ...current,
        enrolled: true,
        active: true,
        dueAt: payload.dueAt,
        lastRating: payload.rating,
        revision: payload.revision,
      }));
      setPending(null);
      setSaveError(null);
      setConflictMessage(null);
      notifyReviewQueueChanged();
    } catch (error) {
      // Keep both the selected rating and request ID so Retry is idempotent.
      setSaveError(
        error instanceof Error ? error.message : "Could not save this rating.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    card.active,
    card.enrolled,
    card.revision,
    refreshCard,
    pending,
    saving,
    selectedRating,
    slug,
    submissionId,
  ]);

  const busy = saving || enrolling;
  const dueStatus = !card.dueAt
    ? null
    : !card.active
      ? "Paused · next due"
      : now > 0 && new Date(card.dueAt).getTime() <= now
        ? "Due"
        : "Next due";
  const dueDateLabel = card.dueAt ? dueLabel(card.dueAt) : null;

  return (
    <section
      aria-labelledby="review-session-title"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            id="review-session-title"
            className="font-mono text-xs font-medium"
          >
            Review recall
          </h2>
          {loadStatus === "ready" && card.enrolled && dueStatus && dueDateLabel ? (
            <p className="text-xs text-muted-foreground">
              {dueStatus}: {dueDateLabel}
            </p>
          ) : null}
          {loadStatus === "ready" && !card.enrolled ? (
            <p className="text-xs text-muted-foreground">
              Not in your review schedule.
            </p>
          ) : null}
          {loadStatus === "ready" && card.enrolled && !card.active ? (
            <p className="text-xs text-muted-foreground">
              Resume reviews before saving a rating.
            </p>
          ) : null}
        </div>
        {!finished && !saved ? (
          <Button size="sm" onClick={() => setFinished(true)}>
            Finish review
          </Button>
        ) : null}
      </div>

      {loadStatus === "loading" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Loading review state…
        </p>
      ) : null}
      {loadStatus === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Review state could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setLoadStatus("loading");
                setLoadError(null);
                void refreshCard();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {finished && !saved ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Choose how recall felt. Your rating is separate from the judge result.
          </p>

          {loadStatus === "ready" && (!card.enrolled || !card.active) ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void enrollOrResume()}
              >
                {enrolling ? <Spinner data-icon="inline-start" /> : null}
                {card.enrolled ? "Resume reviews" : "Add to review"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {card.enrolled
                  ? "Resuming keeps your existing schedule; no rating is recorded yet."
                  : "Adding starts this problem as due now; no rating is recorded yet."}
              </span>
            </div>
          ) : null}

          {loadStatus === "ready" && card.enrolled && card.active ? (
            <>
              <ToggleGroup
                aria-label="Recall rating"
                value={selectedRating ? [selectedRating] : []}
                onValueChange={selectRating}
                orientation="vertical"
                className="w-full items-stretch"
                spacing={1}
              >
                {REVIEW_RATINGS.map((rating) => (
                  <ToggleGroupItem
                    key={rating}
                    value={rating}
                    disabled={busy}
                    className="h-auto min-h-12 w-full flex-col items-start justify-center gap-0.5 px-3 py-2 text-left"
                  >
                    <span className="font-medium capitalize">{rating}</span>
                    <span className="whitespace-normal text-xs font-normal text-muted-foreground">
                      {RATING_MEANING[rating]}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={!selectedRating || busy}
                  onClick={() => void saveRating()}
                >
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  {saving
                    ? "Saving rating…"
                    : pending
                      ? "Retry rating"
                      : "Save rating"}
                </Button>
                {pending && !saving ? (
                  <span className="text-xs text-muted-foreground">
                    Retry uses the same request so the schedule cannot advance twice.
                  </span>
                ) : null}
              </div>
            </>
          ) : null}

          {conflictMessage ? (
            <Alert>
              <AlertTitle>Review state changed</AlertTitle>
              <AlertDescription>{conflictMessage}</AlertDescription>
            </Alert>
          ) : null}
          {saveError || loadError ? (
            <Alert variant="destructive">
              <AlertTitle>
                {saveError
                  ? "Rating was not confirmed"
                  : "Review action was not confirmed"}
              </AlertTitle>
              <AlertDescription>{saveError ?? loadError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {saved ? (
        <Alert>
          <AlertTitle>Review saved · next due {dueLabel(saved.dueAt)}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {saved.next ? (
              <Link
                href={`/problems/${saved.next.slug}?review=1`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Next due problem: {saved.next.number}. {saved.next.title}
              </Link>
            ) : (
              <Link
                href="/"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Back to dashboard
              </Link>
            )}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
