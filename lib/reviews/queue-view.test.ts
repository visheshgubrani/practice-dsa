import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_REVIEW_TOPICS,
  filterReviewSummaries,
  nextReview,
  parseReviewTab,
  reviewTabCounts,
  reviewTabItems,
  reviewTopicOptions,
} from "@/lib/reviews/queue-view";
import type { ReviewQueue, ReviewSummary } from "@/lib/reviews/types";

function summary(
  slug: string,
  number: number,
  title: string,
  topic: string,
  dueAt: string,
): ReviewSummary {
  return {
    slug,
    number,
    title,
    difficulty: "easy",
    topic,
    dueAt,
    revision: 1,
  };
}

const FIRST = summary(
  "two-sum",
  1,
  "Two Sum",
  "Arrays & Hashing",
  "2026-10-01T09:00:00.000Z",
);
const SECOND = summary(
  "valid-anagram",
  2,
  "Valid Anagram",
  "Arrays & Hashing",
  "2026-10-02T09:00:00.000Z",
);
const THIRD = summary(
  "min-stack",
  155,
  "Min Stack",
  "Stack",
  "2026-10-09T09:00:00.000Z",
);
const PAUSED = summary(
  "word-ladder",
  127,
  "Word Ladder",
  "Graphs",
  "2026-09-20T09:00:00.000Z",
);

const QUEUE: ReviewQueue = {
  dueCount: 2,
  due: [FIRST, SECOND],
  upcoming: [THIRD],
  paused: [PAUSED],
  nextDueAt: THIRD.dueAt,
};

describe("reviewTabItems", () => {
  it("partitions due, upcoming, and paused without moving any row", () => {
    assert.deepEqual(reviewTabItems(QUEUE, "due"), [FIRST, SECOND]);
    assert.deepEqual(reviewTabItems(QUEUE, "upcoming"), [THIRD]);
    assert.deepEqual(reviewTabItems(QUEUE, "paused"), [PAUSED]);
  });

  it("counts each tab from the queue, not from the filtered view", () => {
    assert.deepEqual(reviewTabCounts(QUEUE), {
      due: 2,
      upcoming: 1,
      paused: 1,
    });
  });
});

describe("parseReviewTab", () => {
  it("defaults to Due for anything that is not a tab", () => {
    assert.equal(parseReviewTab(null), "due");
    assert.equal(parseReviewTab(""), "due");
    assert.equal(parseReviewTab("everything"), "due");
    assert.equal(parseReviewTab("paused"), "paused");
  });
});

describe("reviewTopicOptions", () => {
  it("lists each topic once in queue order", () => {
    assert.deepEqual(reviewTopicOptions(QUEUE), [
      "Arrays & Hashing",
      "Stack",
      "Graphs",
    ]);
  });

  it("folds a blank topic into Uncategorized", () => {
    const blank = summary("x", 9, "X", "  ", "2026-10-01T09:00:00.000Z");
    assert.deepEqual(
      reviewTopicOptions({ ...QUEUE, due: [blank], dueCount: 1 }),
      ["Uncategorized", "Stack", "Graphs"],
    );
  });
});

describe("filterReviewSummaries", () => {
  const items = [FIRST, SECOND, THIRD];

  it("returns everything with no query and no topic", () => {
    assert.deepEqual(filterReviewSummaries(items), items);
  });

  it("matches a title substring, case-insensitively", () => {
    assert.deepEqual(filterReviewSummaries(items, { query: "sum" }), [FIRST]);
  });

  it("matches a problem number exactly", () => {
    assert.deepEqual(filterReviewSummaries(items, { query: "2" }), [SECOND]);
    assert.deepEqual(filterReviewSummaries(items, { query: "1" }), [FIRST]);
  });

  it("composes the topic filter with the query", () => {
    assert.deepEqual(
      filterReviewSummaries(items, { topic: "Arrays & Hashing" }),
      [FIRST, SECOND],
    );
    assert.deepEqual(
      filterReviewSummaries(items, { topic: "Stack", query: "anagram" }),
      [],
    );
    assert.deepEqual(
      filterReviewSummaries(items, { topic: ALL_REVIEW_TOPICS, query: "155" }),
      [THIRD],
    );
  });
});

describe("nextReview", () => {
  it("picks the first row in server order", () => {
    assert.equal(nextReview([FIRST, SECOND]), FIRST);
  });

  it("has nothing to start when the list is empty", () => {
    assert.equal(nextReview([]), null);
  });
});
