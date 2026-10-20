"use client";

import Link from "next/link";
import { RepeatIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useReviewQueue } from "@/lib/hooks/use-review-queue";
import { cn } from "@/lib/utils";

/**
 * The live review queue in one line. The plan owns the recommendations; this
 * only says how much is waiting and gives the one way into `/reviews`. It
 * replaces the dashboard's old review reminder so the shared queue keeps its
 * single client owner and a failed read never looks like "nothing due".
 */
export function ReviewQueueSummary({ className }: { className?: string }) {
  const { queue, status, error, refreshing, refresh } = useReviewQueue();

  if (!queue) {
    if (status === "loading") {
      return (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-support text-muted-foreground",
            className,
          )}
        >
          <Spinner /> Checking reviews…
        </p>
      );
    }
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 text-support",
          className,
        )}
      >
        <span className="text-muted-foreground">Review count unavailable</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-support"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? <Spinner data-icon="inline-start" /> : null}
          Retry
        </Button>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-support"
          render={<Link href="/reviews" />}
        >
          All reviews
        </Button>
      </div>
    );
  }

  const due = queue.dueCount > 0;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 text-support",
        className,
      )}
    >
      <span className="flex items-center gap-2 tabular-nums">
        <RepeatIcon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            due ? "text-primary" : "text-muted-foreground",
          )}
        />
        {due
          ? `${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due`
          : "No reviews due"}
      </span>
      {error ? (
        <span className="text-muted-foreground">
          Showing the last known count
        </span>
      ) : null}
      {error ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-support"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? <Spinner data-icon="inline-start" /> : null}
          Retry
        </Button>
      ) : null}
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0 text-support"
        render={<Link href="/reviews" />}
      >
        All reviews
      </Button>
    </div>
  );
}
