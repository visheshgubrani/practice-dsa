import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decideReviewPrompt,
  reviewRatingAction,
  type ReviewCardStatus,
} from "./prompt";

const READY = {
  status: "ready" as ReviewCardStatus,
  enrolled: true,
  active: true,
  ratingPending: false,
  rated: false,
};

describe("reviewRatingAction", () => {
  it("offers Finish review for an active or unenrolled ready card", () => {
    assert.equal(reviewRatingAction(READY), "finish");
    assert.equal(
      reviewRatingAction({ ...READY, enrolled: false, active: false }),
      "finish",
    );
  });

  it("keeps an uncertain request on Retry rating", () => {
    assert.equal(
      reviewRatingAction({ ...READY, ratingPending: true }),
      "retry",
    );
    // Recovery remains reachable while loading or after a failed load.
    for (const status of ["loading", "error"] as const) {
      assert.equal(
        reviewRatingAction({ ...READY, status, ratingPending: true }),
        "retry",
      );
    }
  });

  it("hides the entry for paused, rated, loading, and failed cards", () => {
    assert.equal(reviewRatingAction({ ...READY, active: false }), null);
    assert.equal(reviewRatingAction({ ...READY, rated: true }), null);
    assert.equal(reviewRatingAction({ ...READY, status: "loading" }), null);
    assert.equal(reviewRatingAction({ ...READY, status: "error" }), null);
    // A saved rating wins over a stale pending request.
    assert.equal(
      reviewRatingAction({ ...READY, rated: true, ratingPending: true }),
      null,
    );
  });
});

describe("decideReviewPrompt", () => {
  const base = {
    pending: true,
    dialogOpen: false,
    status: "ready" as ReviewCardStatus,
    action: "finish" as const,
  };

  it("does nothing without a pending Submit", () => {
    assert.equal(decideReviewPrompt({ ...base, pending: false }), "idle");
  });

  it("opens once the ready card can be rated", () => {
    assert.equal(decideReviewPrompt(base), "open");
  });

  it("waits while the review card is still loading", () => {
    assert.equal(
      decideReviewPrompt({ ...base, status: "loading", action: null }),
      "wait",
    );
  });

  it("retires the prompt when this visit cannot rate the card", () => {
    for (const state of [
      { ...base, dialogOpen: true },
      { ...base, action: "retry" as const },
      { ...base, status: "error" as const, action: null },
      // Paused or already rated: the entry is hidden, so there is nothing to open.
      { ...base, action: null },
    ]) {
      assert.equal(decideReviewPrompt(state), "skip");
    }
  });
});
