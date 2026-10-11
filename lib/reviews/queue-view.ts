import { UNCATEGORIZED } from "@/lib/progress/summary";
import type { ReviewQueue, ReviewSummary } from "@/lib/reviews/types";

/**
 * The reviews page's view state, as pure functions: which tab is showing, what
 * each tab holds, how the search and topic filter narrow it, and which problem
 * "Start next review" opens. Keeping this out of the component lets the rules
 * be pinned by tests.
 */

export const REVIEW_TABS = ["due", "upcoming", "paused"] as const;

export type ReviewTab = (typeof REVIEW_TABS)[number];

export const REVIEW_TAB_LABEL: Record<ReviewTab, string> = {
  due: "Due",
  upcoming: "Upcoming",
  paused: "Paused",
};

export const ALL_REVIEW_TOPICS = "all";

/** A blank topic column is its own group, as it is everywhere else. */
export function topicOf(item: ReviewSummary): string {
  return item.topic.trim() === "" ? UNCATEGORIZED : item.topic;
}

/** An unknown or stale `?tab=` value falls back to Due, never to nothing. */
export function parseReviewTab(value: string | null | undefined): ReviewTab {
  return REVIEW_TABS.includes(value as ReviewTab)
    ? (value as ReviewTab)
    : "due";
}

/** Due is first because it is the work; paused is last because it is parked. */
export function reviewTabItems(
  queue: ReviewQueue,
  tab: ReviewTab,
): ReviewSummary[] {
  switch (tab) {
    case "upcoming":
      return queue.upcoming;
    case "paused":
      return queue.paused;
    case "due":
    default:
      return queue.due;
  }
}

export function reviewTabCounts(queue: ReviewQueue): Record<ReviewTab, number> {
  return {
    due: queue.due.length,
    upcoming: queue.upcoming.length,
    paused: queue.paused.length,
  };
}

/** Every topic the queue mentions, in the order the rows already have. */
export function reviewTopicOptions(queue: ReviewQueue): string[] {
  const seen = new Set<string>();
  for (const item of [...queue.due, ...queue.upcoming, ...queue.paused]) {
    seen.add(topicOf(item));
  }
  return [...seen];
}

/**
 * Title or exact problem number, plus an optional topic. "Number" is exact on
 * purpose: typing 1 should not match 11, 12, and 108.
 */
export function filterReviewSummaries(
  items: readonly ReviewSummary[],
  {
    query = "",
    topic = ALL_REVIEW_TOPICS,
  }: { query?: string; topic?: string } = {},
): ReviewSummary[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (topic !== ALL_REVIEW_TOPICS && topicOf(item) !== topic) return false;
    if (needle.length === 0) return true;
    return (
      item.title.toLowerCase().includes(needle) ||
      String(item.number) === needle
    );
  });
}

/**
 * The first due problem in the server's order (due time, then catalog
 * position) — what "Start next review" opens.
 */
export function nextReview(
  items: readonly ReviewSummary[],
): ReviewSummary | null {
  return items[0] ?? null;
}
