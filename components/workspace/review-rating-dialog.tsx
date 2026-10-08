"use client";

import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { useReviewCard } from "@/lib/hooks/use-review-card";
import {
  RATING_MEANING,
  REVIEW_RATINGS,
  type ReviewRating,
} from "@/lib/reviews/types";

type ReviewSchedule = ReturnType<typeof useReviewCard>;

const FIRST_ATTEMPT_MEANING: Record<ReviewRating, string> = {
  again: "Couldn't solve",
  hard: "Struggled",
  good: "Solved",
  easy: "Effortless",
};

function localDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ReviewRatingDialog({
  problem,
  schedule,
  onOpenChange,
}: {
  problem: { number: number; title: string };
  schedule: ReviewSchedule;
  onOpenChange: (open: boolean) => void;
}) {
  const context = schedule.ratingContext;
  if (!context) return null;

  const saved = schedule.ratingResult;
  const busy = schedule.ratingSaving;
  const pending = schedule.ratingPending;
  const descriptions =
    context.mode === "initial" ? FIRST_ATTEMPT_MEANING : RATING_MEANING;
  const prompt =
    context.mode === "initial"
      ? "How did your first attempt go?"
      : "How did recall feel?";

  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-md overflow-y-auto"
    >
      <DialogHeader className="gap-3 pr-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {problem.number}.
          </span>
          <span className="min-w-0 text-sm font-medium">{problem.title}</span>
          {context.mode === "initial" ? (
            <Badge variant="secondary">New</Badge>
          ) : null}
        </div>
        <DialogTitle>{prompt}</DialogTitle>
        <DialogDescription>
          {saved ? (
            "Your self-rating is saved. It does not change solved status."
          ) : context.mode === "initial" ? (
            "Choose a rating to add this problem and schedule its next review. This is a self-assessment and does not change solved status."
          ) : (
            "Your rating is a self-assessment and is separate from the judge result. It does not change solved status."
          )}
        </DialogDescription>
      </DialogHeader>

      {saved ? (
        <div className="flex flex-col gap-3">
          <Alert>
            <AlertTitle>
              {context.mode === "initial" ? "Added to review" : "Review saved"}
              {" · next due "}
              {localDateTime(saved.dueAt)}
            </AlertTitle>
            {context.mode === "recall" ? (
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
            ) : null}
          </Alert>
          <DialogFooter className="border-0 bg-transparent p-0">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Review rating"
            value={pending ? [pending.rating] : []}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const choices = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button[data-slot="toggle-group-item"]:not([aria-disabled="true"])',
                ),
              );
              if (choices.length === 0) return;
              const current = choices.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const delta = event.key === "ArrowDown" ? 1 : -1;
              const next =
                current < 0
                  ? delta > 0
                    ? 0
                    : choices.length - 1
                  : (current + delta + choices.length) % choices.length;
              event.preventDefault();
              choices[next]?.focus();
            }}
            onValueChange={(value) => {
              const rating = value[0] as ReviewRating | undefined;
              if (rating && REVIEW_RATINGS.includes(rating)) {
                schedule.rate(rating);
              }
            }}
            orientation="vertical"
            className="w-full items-stretch"
            spacing={1}
          >
            {REVIEW_RATINGS.map((rating) => (
              <ToggleGroupItem
                key={rating}
                value={rating}
                disabled={
                  schedule.status !== "ready" ||
                  busy ||
                  pending !== null ||
                  schedule.ratingResult !== null
                }
                className="h-auto min-h-12 w-full flex-col items-start justify-center gap-0.5 px-3 py-2 text-left"
              >
                <span className="font-medium capitalize">{rating}</span>
                <span className="whitespace-normal text-xs font-normal text-muted-foreground">
                  {descriptions[rating]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Spinner /> Saving rating…
            </p>
          ) : null}

          {schedule.ratingError ? (
            <Alert variant="destructive">
              <AlertTitle>
                {schedule.ratingCanRetry
                  ? "Rating was not confirmed"
                  : "Rating was not saved"}
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>{schedule.ratingError}</span>
                {schedule.ratingCanRetry ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={schedule.retryRating}
                  >
                    Retry
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {schedule.ratingConflict ? (
            <Alert>
              <AlertTitle>Review state changed</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>{schedule.ratingConflict}</span>
                {schedule.status === "error" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void schedule.refresh()}
                  >
                    Refresh review state
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter className="border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}
