import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatReviewDateTime,
  formatReviewTime,
  reviewDueLabel,
} from "@/lib/reviews/date";

/**
 * The labels are locale-dependent for their date part, so the assertions pin
 * the parts the app decides: which of the three shapes is used, and that a
 * malformed instant never renders as "Invalid Date".
 */

const NOW = new Date("2026-10-10T12:00:00.000Z");

describe("reviewDueLabel", () => {
  it("reads a later day as an upcoming due date", () => {
    const label = reviewDueLabel("2026-10-12T09:00:00.000Z", NOW);
    assert.ok(label.startsWith("Due ") && !label.startsWith("Due today"));
    assert.ok(!label.includes("Overdue"));
  });

  it("reads a later instant today as due today", () => {
    const later = new Date(NOW.getTime() + 3 * 60 * 60 * 1000).toISOString();
    assert.ok(reviewDueLabel(later, NOW).startsWith("Due today,"));
  });

  it("reads an earlier instant today as due earlier today", () => {
    const earlier = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    assert.equal(reviewDueLabel(earlier, NOW), "Due earlier today");
  });

  it("reads an earlier day as overdue since that day", () => {
    const label = reviewDueLabel("2026-10-05T09:00:00.000Z", NOW);
    assert.ok(label.startsWith("Overdue since "));
  });

  it("never renders an invalid date", () => {
    assert.equal(reviewDueLabel("not-a-date", NOW), "date unavailable");
    assert.equal(formatReviewDateTime("not-a-date"), "date unavailable");
    assert.equal(formatReviewTime("not-a-date"), "date unavailable");
  });
});
