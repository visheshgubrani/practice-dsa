"use client";

import Link from "next/link";
import {
  CirclePlayIcon,
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { reviewDueLabel } from "@/lib/reviews/date";
import { topicOf, type ReviewTab } from "@/lib/reviews/queue-view";
import type { ReviewSummary } from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

/**
 * One review in a list. The actions depend on the tab because the state does:
 * a due card can be started or parked, an upcoming one can be pulled forward,
 * and a paused one can only be resumed or opened.
 */
export function ReviewRow({
  problem,
  tab,
  updating,
  onSetActive,
}: {
  problem: ReviewSummary;
  tab: ReviewTab;
  /** True while this row's own pause/resume is in flight. */
  updating: boolean;
  onSetActive: (problem: ReviewSummary, active: boolean) => void;
}) {
  const reviewHref = `/problems/${problem.slug}?review=1`;
  const openHref = `/problems/${problem.slug}`;
  const linkLock = {
    "aria-disabled": updating || undefined,
    tabIndex: updating ? -1 : undefined,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (updating) event.preventDefault();
    },
  };

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            {...linkLock}
            href={reviewHref}
            className="min-w-0 text-base font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <span className="text-muted-foreground tabular-nums">
              {problem.number}.
            </span>{" "}
            {problem.title}
          </Link>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-support text-muted-foreground">
          <span className="truncate">{topicOf(problem)}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {reviewDueLabel(problem.dueAt)}
          </span>
          {tab === "paused" ? (
            <>
              <span aria-hidden>·</span>
              <span>Paused</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab === "due" ? (
          <Link
            {...linkLock}
            href={reviewHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "text-support",
            )}
          >
            <CirclePlayIcon data-icon="inline-start" />
            Start review
          </Link>
        ) : null}

        {tab === "upcoming" ? (
          <Link
            {...linkLock}
            href={reviewHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "text-support",
            )}
          >
            <PlayIcon data-icon="inline-start" />
            Review early
          </Link>
        ) : null}

        {tab === "paused" ? (
          <>
            <Button
              type="button"
              size="lg"
              className="text-support"
              disabled={updating}
              aria-busy={updating}
              onClick={() => onSetActive(problem, true)}
            >
              {updating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              Resume reviews
            </Button>
            <Link
              {...linkLock}
              href={openHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "text-support",
              )}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              Open problem
            </Link>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="text-support"
            disabled={updating}
            aria-busy={updating}
            onClick={() => onSetActive(problem, false)}
          >
            {updating ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PauseIcon data-icon="inline-start" />
            )}
            Pause reviews
          </Button>
        )}
      </div>
    </li>
  );
}
