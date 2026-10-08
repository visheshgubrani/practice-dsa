"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { useReviewCard } from "@/lib/hooks/use-review-card";
import { scheduleReviewBoundary } from "@/lib/reviews/boundary";

type ReviewSchedule = ReturnType<typeof useReviewCard>;

function dueLabel(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ReviewSession({
  schedule,
  onFinishReview,
}: {
  schedule: ReviewSchedule;
  onFinishReview: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const { card, status, error, refresh, ratingResult } = schedule;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!card.active || !card.dueAt) return;
    if (Date.parse(card.dueAt) <= now) return;
    return scheduleReviewBoundary(card.dueAt, () => setNow(Date.now()));
  }, [card.active, card.dueAt, now]);

  const dueStatus = !card.dueAt
    ? null
    : !card.active
      ? "Paused · next due"
      : now > 0 && new Date(card.dueAt).getTime() <= now
        ? "Due"
        : "Next due";

  return (
    <section
      aria-labelledby="review-session-title"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            id="review-session-title"
            tabIndex={-1}
            className="font-mono text-xs font-medium"
          >
            Review recall
          </h2>
          {status === "ready" && card.enrolled && dueStatus && card.dueAt ? (
            <p className="text-xs text-muted-foreground">
              {dueStatus}: {dueLabel(card.dueAt)}
            </p>
          ) : null}
          {status === "ready" && !card.enrolled ? (
            <p className="text-xs text-muted-foreground">
              Not in your review schedule yet. Finish review to add and rate it.
            </p>
          ) : null}
          {status === "ready" && card.enrolled && !card.active ? (
            <p className="text-xs text-muted-foreground">
              Resume reviews from Notes before rating this paused card.
            </p>
          ) : null}
        </div>
        {!ratingResult &&
        (schedule.ratingPending ||
          (status === "ready" && (!card.enrolled || card.active))) ? (
          <DialogTrigger
            render={
              <Button type="button" size="sm" disabled={schedule.ratingSaving} />
            }
            onClick={onFinishReview}
          >
            {schedule.ratingPending ? "Retry rating" : "Finish review"}
          </DialogTrigger>
        ) : null}
      </div>

      {status === "loading" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Loading review state…
        </p>
      ) : null}
      {status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Review state could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {ratingResult ? (
        <Alert>
          <AlertTitle>
            Review saved · next due {dueLabel(ratingResult.dueAt)}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {ratingResult.next ? (
              <Link
                href={`/problems/${ratingResult.next.slug}?review=1`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Next due problem: {ratingResult.next.number}. {ratingResult.next.title}
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
