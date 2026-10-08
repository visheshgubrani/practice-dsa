"use client";

import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { useReviewCard } from "@/lib/hooks/use-review-card";

type ReviewSchedule = ReturnType<typeof useReviewCard>;

function dueLabel(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  if (due.getTime() > now.getTime()) {
    return `Due ${due.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  }

  const today =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  return today
    ? "Due today"
    : `Overdue · ${due.toLocaleDateString(undefined, {
        dateStyle: "medium",
      })}`;
}

export function ReviewNotesControls({
  slug,
  schedule,
  onOpenRating,
}: {
  slug: string;
  schedule: ReviewSchedule;
  onOpenRating: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const { card, status, error, saving, refresh, resume, pause } = schedule;

  return (
    <section
      aria-labelledby="review-schedule-title"
      className="flex flex-col gap-2 rounded-lg border border-border bg-panel-2 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3
            id="review-schedule-title"
            tabIndex={-1}
            className="font-mono text-xs font-medium"
          >
            Review schedule
          </h3>
          {status === "loading" ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner /> Checking review schedule…
            </span>
          ) : status === "error" ? (
            <p className="text-xs text-muted-foreground">
              Review state could not be loaded.
            </p>
          ) : card.enrolled ? (
            <p className="text-xs text-muted-foreground">
              {card.active
                ? card.dueAt
                  ? dueLabel(card.dueAt)
                  : "Review date unavailable"
                : `Reviews paused${card.dueAt ? ` · ${dueLabel(card.dueAt)}` : ""}`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add this problem when you want it in your recall queue.
            </p>
          )}
        </div>

        {schedule.ratingPending ? (
          <DialogTrigger
            render={
              <Button type="button" size="sm" disabled={schedule.ratingSaving} />
            }
            onClick={onOpenRating}
          >
            Retry rating
          </DialogTrigger>
        ) : status === "ready" && card.enrolled ? (
          <div className="flex flex-wrap items-center gap-2">
            {card.active ? (
              <Link
                href={`/problems/${slug}?review=1`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "font-mono text-xs",
                )}
              >
                Review now
              </Link>
            ) : null}
            {card.active && card.lastRating === null ? (
              <DialogTrigger
                render={
                  <Button type="button" size="sm" variant="outline" />
                }
                onClick={onOpenRating}
              >
                Rate first attempt
              </DialogTrigger>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => void (card.active ? pause() : resume())}
            >
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {card.active ? "Pause reviews" : "Resume reviews"}
            </Button>
          </div>
        ) : status === "ready" ? (
          <DialogTrigger
            render={
              <Button
                type="button"
                size="sm"
                disabled={saving}
              />
            }
            onClick={onOpenRating}
          >
            Add to review
          </DialogTrigger>
        ) : status === "error" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle className="text-xs">Review schedule unavailable</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

export function AcceptedReviewOffer({
  schedule,
  onOpenRating,
}: {
  schedule: ReviewSchedule;
  onOpenRating: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const { card, status, error, refresh } = schedule;

  if (status === "ready" && card.enrolled) return null;

  return (
    <Alert className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <AlertTitle>Accepted. Add this problem to review?</AlertTitle>
        <AlertDescription>
          Rate how your first attempt went to add it and schedule a review. The
          rating does not change solved status.
          {status === "error" && error ? ` ${error}` : ""}
        </AlertDescription>
      </div>
      {status === "ready" ? (
        <DialogTrigger
          render={<Button type="button" size="sm" />}
          onClick={onOpenRating}
        >
          Add to review
        </DialogTrigger>
      ) : status === "loading" ? (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner data-icon="inline-start" /> Checking…
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
        >
          Retry
        </Button>
      )}
    </Alert>
  );
}
