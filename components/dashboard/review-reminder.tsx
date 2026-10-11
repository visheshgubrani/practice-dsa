"use client";

import Link from "next/link";
import { ArrowRightIcon, RepeatIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useReviewQueue } from "@/lib/hooks/use-review-queue";
import { reviewDueLabel } from "@/lib/reviews/date";
import { cn } from "@/lib/utils";

/**
 * The dashboard's one line about reviews. Every list moved to `/reviews`; this
 * is the count and the way in, plus a Retry when the count itself could not be
 * read — a failed read must not look like "nothing due".
 */
export function ReviewReminder() {
  const { queue, status, error, refreshing, refresh } = useReviewQueue();

  const unavailable = status === "error";
  const dueCount = queue?.dueCount ?? null;
  const nextDue = queue?.due.length ? queue.due[0] : null;
  const due = dueCount !== null && dueCount > 0;

  const headline = unavailable
    ? "Review count unavailable"
    : dueCount === null
      ? "Checking reviews…"
      : due
        ? `${dueCount} review${dueCount === 1 ? "" : "s"} due`
        : "No reviews due";

  const supporting = unavailable
    ? (error ?? "The review queue could not be read.")
    : error
      ? `${error} Showing the last known count.`
      : nextDue
        ? `Start with ${nextDue.number}. ${nextDue.title} · ${reviewDueLabel(nextDue.dueAt)}`
        : queue?.nextDueAt
          ? `Next review ${reviewDueLabel(queue.nextDueAt)}`
          : "Add a problem to review from its Notes tab.";

  return (
    <section
      aria-labelledby="review-reminder-title"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3",
        due ? "border-primary/30 bg-primary/5" : "border-border bg-panel",
      )}
    >
      <RepeatIcon
        aria-hidden
        className={cn(
          "size-5 shrink-0",
          due ? "text-primary" : "text-muted-foreground",
        )}
      />

      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id="review-reminder-title" className="text-base font-medium">
          {headline}
        </h2>
        <p className="text-support text-muted-foreground">{supporting}</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {error ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="text-base"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? <Spinner data-icon="inline-start" /> : null}
            Retry
          </Button>
        ) : null}
        {due ? (
          <Button
            size="lg"
            className="text-base"
            render={<Link href="/reviews" />}
          >
            Open reviews
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="text-base"
            render={<Link href="/reviews" />}
          >
            Open reviews
          </Button>
        )}
      </div>
    </section>
  );
}
