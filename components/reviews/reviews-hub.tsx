"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CirclePlayIcon, RefreshCwIcon, SearchIcon } from "lucide-react";

import { ReviewRow } from "@/components/reviews/review-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReviewQueue } from "@/lib/hooks/use-review-queue";
import { isReviewCardState, notifyReviewQueueChanged } from "@/lib/reviews/client";
import {
  ALL_REVIEW_TOPICS,
  filterReviewSummaries,
  nextReview,
  parseReviewTab,
  reviewTabCounts,
  reviewTabItems,
  reviewTopicOptions,
  REVIEW_TAB_LABEL,
  REVIEW_TABS,
  type ReviewTab,
} from "@/lib/reviews/queue-view";
import type { ReviewSummary } from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

function readError(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return null;
}

const TAB_NOUN: Record<ReviewTab, string> = {
  due: "due",
  upcoming: "scheduled",
  paused: "paused",
};

/**
 * The reviews page. Everything scheduled lives here — due, upcoming, and
 * paused — so the dashboard can stay an overview. The queue comes from the
 * shared loader, which means the sidebar badge and this page cannot disagree.
 */
export function ReviewsHub() {
  const { queue, status, error, refreshing, refresh } = useReviewQueue();
  const searchParams = useSearchParams();
  const pendingRef = useRef(new Set<string>());
  const [updating, setUpdating] = useState<ReadonlySet<string>>(() => new Set());
  const [actionError, setActionError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const tab = parseReviewTab(searchParams.get("tab"));
  const query = searchParams.get("q") ?? "";
  const topics = queue ? reviewTopicOptions(queue) : [];
  const requestedTopic = searchParams.get("topic");
  const topic =
    requestedTopic && topics.includes(requestedTopic)
      ? requestedTopic
      : ALL_REVIEW_TOPICS;

  /**
   * The tab and the topic are history entries, so Back returns to the previous
   * view. The search box replaces the current entry instead: a history entry
   * per keystroke would make Back unusable.
   */
  const updateUrl = useCallback(
    (next: Record<string, string | null>, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const search = params.toString();
      const url = search ? `?${search}` : "?";
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [searchParams],
  );

  const setActive = useCallback(
    async (problem: ReviewSummary, active: boolean) => {
      if (pendingRef.current.has(problem.slug)) return;
      pendingRef.current.add(problem.slug);
      setUpdating(new Set(pendingRef.current));
      setActionError(null);
      try {
        const response = await fetch(
          `/api/reviews/${encodeURIComponent(problem.slug)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              active,
              expectedRevision: problem.revision,
            }),
          },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            readError(payload) ??
            `That review could not be updated (${response.status}).`;
          // A transport/server failure may have happened after commit. Only
          // explicit client rejections establish that this write was rejected.
          if (response.status >= 500 || response.status === 408) {
            throw new Error(message);
          }
          const latest = await refresh(true);
          setActionError({
            title: response.status === 409
              ? "Review changed in another tab"
              : "That change was not saved",
            message: latest
              ? `${message} Your change was not saved. The list shows the current server state — check it before trying again.`
              : `${message} Your change was not saved, and the latest list could not be read. Refresh the list before trying again.`,
          });
          return;
        }
        if (
          !isReviewCardState(payload) ||
          !payload.enrolled ||
          payload.active !== active
        ) {
          throw new Error("The review update could not be confirmed from its response.");
        }
        notifyReviewQueueChanged();
        if (!(await refresh(true))) {
          setActionError({
            title: "Change saved; list not refreshed",
            message: "The server confirmed the change, but the review list could not be read. Refresh to see the latest schedule.",
          });
        }
      } catch (cause) {
        const latest = await refresh(true);
        const confirmed = latest && (active
          ? [...latest.due, ...latest.upcoming].some((item) => item.slug === problem.slug)
          : latest.paused.some((item) => item.slug === problem.slug));
        if (!confirmed) {
          const message = cause instanceof Error ? cause.message : "The connection was interrupted.";
          setActionError({
            title: "Change could not be confirmed",
            message: latest
              ? `${message} The list shows the current server state. Check it before trying again.`
              : `${message} The latest state could not be read. Refresh the list before trying again.`,
          });
        }
      } finally {
        pendingRef.current.delete(problem.slug);
        setUpdating(new Set(pendingRef.current));
      }
    },
    [refresh],
  );

  const counts = queue ? reviewTabCounts(queue) : null;
  const topicItems = [
    { value: ALL_REVIEW_TOPICS, label: "All topics" },
    ...topics.map((value) => ({ value, label: value })),
  ];

  function panel(forTab: ReviewTab) {
    const items = queue ? reviewTabItems(queue, forTab) : [];
    const filtered = filterReviewSummaries(items, { query, topic });
    const startNext = forTab === "due" ? nextReview(filtered) : null;
    const noun = TAB_NOUN[forTab];

    if (!queue) {
      return (
        <TabsContent key={forTab} value={forTab}>
          {status === "loading" ? (
            <p role="status" className="flex items-center gap-2 text-support text-muted-foreground">
              <Spinner /> Loading reviews…
            </p>
          ) : null}
        </TabsContent>
      );
    }

    return (
      <TabsContent
        key={forTab}
        value={forTab}
        className="flex flex-col gap-4 outline-none"
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-support text-muted-foreground tabular-nums">
            {filtered.length === items.length
              ? `${items.length} ${noun}`
              : `${filtered.length} of ${items.length} ${noun}`}
          </p>
          {startNext ? (
            <Button
              size="lg"
              className="ml-auto text-base"
              disabled={updating.has(startNext.slug)}
              render={<Link href={`/problems/${startNext.slug}?review=1`} />}
            >
              <CirclePlayIcon data-icon="inline-start" />
              Start next review
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <Empty className="rounded-xl border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>
                {forTab === "due"
                  ? "Nothing due"
                  : forTab === "upcoming"
                    ? "Nothing scheduled ahead"
                    : "No paused reviews"}
              </EmptyTitle>
              <EmptyDescription>
                {forTab === "due"
                  ? queue?.nextDueAt
                    ? "You are caught up. The next review comes due on its own — it will appear here."
                    : "Add a problem to review from its Notes tab, then rate your first recall."
                  : forTab === "upcoming"
                    ? "Every enrolled problem is either due now or paused."
                    : "Pausing a review keeps its schedule and stops it counting as due."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="rounded-xl border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>No reviews match those filters</EmptyTitle>
              <EmptyDescription>
                {items.length} {noun} in this tab. Clear the search and topic to
                see them.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  updateUrl({ q: null, topic: null }, "replace")
                }
              >
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-panel px-4">
            {filtered.map((problem) => (
              <ReviewRow
                key={problem.slug}
                problem={problem}
                tab={forTab}
                updating={updating.has(problem.slug)}
                onSetActive={(target, active) => void setActive(target, active)}
              />
            ))}
          </ul>
        )}
      </TabsContent>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        updateUrl({ tab: value === "due" ? null : value })
      }
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 border-b border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-2 px-4 py-3 md:px-8">
          <TabsList className="h-9 group-data-horizontal/tabs:h-9">
            {REVIEW_TABS.map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="gap-2 px-3 text-support"
              >
                {REVIEW_TAB_LABEL[item]}
                <span className="text-support text-muted-foreground tabular-nums">
                  {counts ? counts[item] : "–"}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="relative min-w-56 flex-1 sm:max-w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) =>
                updateUrl({ q: event.target.value }, "replace")
              }
              placeholder="Search title or number"
              aria-label="Search reviews"
              className="h-9 w-full pl-9 text-base"
            />
          </div>

          <Select
            items={topicItems}
            value={topic}
            onValueChange={(value) =>
              updateUrl({
                topic:
                  (value as string) === ALL_REVIEW_TOPICS
                    ? null
                    : (value as string),
              })
            }
          >
            <SelectTrigger
              className="h-9 text-support"
              aria-label="Filter reviews by topic"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Refresh reviews"
            title="Refresh reviews"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? (
              <Spinner />
            ) : (
              <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
            )}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4 pb-16 md:px-8">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>The review list could not be refreshed</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert variant="destructive">
              <AlertTitle>{actionError.title}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{actionError.message}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  Refresh list
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {REVIEW_TABS.map((item) => panel(item))}
        </div>
      </div>
    </Tabs>
  );
}
