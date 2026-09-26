import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planSubmissionDayBackfill } from "@/lib/db/backfill-days";

/**
 * A row written before the day column has no recorded offset, so it is stamped
 * with offset 0 — the UTC day of its own timestamp. Getting this wrong is
 * invisible in the UI (the calendar just moves a day) and wrong in the streak,
 * so the boundary is pinned here.
 */

describe("planSubmissionDayBackfill", () => {
  it("stamps each row with its own day", () => {
    const plan = planSubmissionDayBackfill([
      { id: "a", createdAt: new Date("2026-09-21T13:33:27.969Z"), utcOffsetMinutes: 0 },
      { id: "b", createdAt: new Date("2026-09-25T13:12:19.274Z"), utcOffsetMinutes: 0 },
    ]);

    assert.deepEqual(plan, [
      { id: "a", day: "2026-09-21" },
      { id: "b", day: "2026-09-25" },
    ]);
  });

  it("keeps the row's own offset when one was recorded", () => {
    // 19:30 UTC is the next day in IST — the reason the offset is stored at all.
    const plan = planSubmissionDayBackfill([
      {
        id: "a",
        createdAt: new Date("2026-09-21T19:30:00.000Z"),
        utcOffsetMinutes: 330,
      },
      {
        id: "b",
        createdAt: new Date("2026-09-21T19:30:00.000Z"),
        utcOffsetMinutes: 0,
      },
    ]);

    assert.deepEqual(plan, [
      { id: "a", day: "2026-09-22" },
      { id: "b", day: "2026-09-21" },
    ]);
  });

  it("plans nothing for no rows", () => {
    assert.deepEqual(planSubmissionDayBackfill([]), []);
  });
});
