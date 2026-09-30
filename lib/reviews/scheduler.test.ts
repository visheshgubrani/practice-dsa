import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  emptyCard,
  restoreCard,
  scheduleRating,
  serializeCard,
  serializeLog,
  SCHEDULER_CONFIG_ID,
  SCHEDULER_VERSION,
} from "@/lib/reviews/scheduler";
import { REVIEW_RATINGS } from "@/lib/reviews/types";

const NOW = new Date("2026-01-02T03:04:05.000Z");

describe("FSRS scheduler adapter", () => {
  it("keeps the pinned package and versioned configuration together", () => {
    assert.equal(SCHEDULER_CONFIG_ID, "dsa-fsrs-v1");
    assert.equal(SCHEDULER_VERSION, "ts-fsrs@5.4.2/dsa-fsrs-v1");
  });

  it("schedules all four first-review ratings from the same empty card", () => {
    const dueByRating = new Map<string, string>();
    const grades = new Set<number>();
    for (const rating of REVIEW_RATINGS) {
      const scheduled = scheduleRating(emptyCard(NOW), rating, NOW);
      assert.equal(scheduled.log.review.toISOString(), NOW.toISOString());
      assert.equal(scheduled.card.last_review?.toISOString(), NOW.toISOString());
      assert.equal(scheduled.card.reps, 1);
      const stored = serializeCard(scheduled.card);
      assert.equal(restoreCard(stored).due.toISOString(), stored.due);
      assert.equal(serializeLog(scheduled.log).review, NOW.toISOString());
      dueByRating.set(rating, stored.due);
      grades.add(scheduled.log.rating);
    }
    assert.equal(dueByRating.size, 4);
    assert.equal(grades.size, 4);
  });

  it("uses deterministic day-scale scheduling and records lapses", () => {
    const first = scheduleRating(emptyCard(NOW), "good", NOW);
    const repeated = scheduleRating(emptyCard(NOW), "good", NOW);
    assert.deepEqual(serializeCard(first.card), serializeCard(repeated.card));
    assert.deepEqual(serializeLog(first.log), serializeLog(repeated.log));

    const earlyAt = new Date(NOW.getTime() + 60 * 60 * 1000);
    assert.ok(first.card.due.getTime() > earlyAt.getTime());
    const early = scheduleRating(first.card, "hard", earlyAt);
    assert.equal(early.log.review.toISOString(), earlyAt.toISOString());

    const later = new Date(first.card.due.getTime() + 3 * 24 * 60 * 60 * 1000);
    const lapse = scheduleRating(first.card, "again", later);
    assert.equal(lapse.card.reps, 2);
    assert.equal(lapse.card.lapses, 1);
    assert.equal(lapse.log.review.toISOString(), later.toISOString());
  });

  it("rejects malformed or incomplete persisted cards", () => {
    const card = serializeCard(emptyCard(NOW));
    assert.throws(() => restoreCard({ ...card, state: 9 }));
    assert.throws(() => restoreCard({ ...card, extra: true }));
    assert.throws(() => restoreCard({ ...card, due: "not a date" }));
  });
});
