"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  isReviewQueue,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "@/lib/reviews/client";
import type { ReviewQueue, ReviewSummary } from "@/lib/reviews/types";
import { scheduleReviewBoundary } from "@/lib/reviews/boundary";
import { cn } from "@/lib/utils";

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

function dateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function dueLabel(value: string): string {
  const due = new Date(value);
  const now = new Date();
  if (due.getTime() > now.getTime()) return `Due ${dateTime(value)}`;

  const today =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  return today
    ? "Due today"
    : `Overdue · ${due.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

function ReviewRow({ problem }: { problem: ReviewSummary }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={`/problems/${problem.slug}?review=1`}
            className="min-w-0 break-words text-sm font-medium underline-offset-4 hover:underline"
          >
            <span className="font-mono text-muted-foreground">
              {problem.number}.
            </span>{" "}
            {problem.title}
          </Link>
          <Badge variant="outline" className="capitalize">
            {problem.difficulty}
          </Badge>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {dueLabel(problem.dueAt)}
        </p>
      </div>
      <Link
        href={`/problems/${problem.slug}?review=1`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "w-fit font-mono text-xs",
        )}
      >
        Start review
      </Link>
    </li>
  );
}

export function ReviewQueueSection({
  initialQueue,
}: {
  initialQueue: ReviewQueue;
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (silent = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (!silent) {
      setRefreshing(true);
      setError(null);
    }
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
      if (!controller.signal.aborted) {
        setQueue(payload);
        setError(null);
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error ? cause.message : "Could not load reviews.",
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setRefreshing(false);
      }
    }
  }, []);

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
      requestRef.current?.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, refreshWhenVisible);
    };
  }, [refresh]);

  const nextDueAt = queue.nextDueAt;
  useEffect(() => {
    if (!nextDueAt) return;
    return scheduleReviewBoundary(nextDueAt, () => void refresh());
  }, [nextDueAt, refresh]);

  return (
    <section
      aria-labelledby="review-due-title"
      className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="review-due-title" className="font-mono text-sm font-medium">
            Review due
          </h2>
          <Badge variant={queue.dueCount > 0 ? "secondary" : "outline"}>
            {queue.dueCount} due
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh review queue"
          title="Refresh review queue"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Review queue could not be refreshed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {queue.due.length > 0 ? (
        <ul className="divide-y divide-border">
          {queue.due.map((problem) => (
            <ReviewRow key={problem.slug} problem={problem} />
          ))}
        </ul>
      ) : (
        <Empty className="min-h-0 flex-none rounded-md border border-dashed border-border px-4 py-5">
          <EmptyHeader>
            <EmptyTitle>
              {error ? "Review status unavailable" : "No reviews due"}
            </EmptyTitle>
            <EmptyDescription>
              {error
                ? "The last queue could not be confirmed. Retry to check the server state."
                : queue.nextDueAt
                  ? `Next scheduled review: ${dateTime(queue.nextDueAt)}.`
                  : "Add and rate a problem from its Notes tab to schedule its first review, or resume paused reviews there."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {queue.upcoming.length > 0 ? (
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Upcoming reviews ({queue.upcoming.length})
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {queue.upcoming.map((problem) => (
              <ReviewRow key={problem.slug} problem={problem} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
