/**
 * Rating entry and recall-prompt rules for a review visit.
 *
 * The review card, the banner entry, and the workspace's automatic prompt all
 * read these decisions, so no surface can offer a rating the others hide.
 */

export type ReviewCardStatus = "loading" | "ready" | "error";

/** Which rating control the card and the banner show, if any. */
export type ReviewRatingAction = "retry" | "finish" | null;

export function reviewRatingAction(state: {
  status: ReviewCardStatus;
  enrolled: boolean;
  active: boolean;
  /** An uncertain request is still waiting; only an exact retry is safe. */
  ratingPending: boolean;
  /** A rating was already saved during this visit. */
  rated: boolean;
}): ReviewRatingAction {
  if (state.rated) return null;
  if (state.ratingPending) return "retry";
  if (state.status !== "ready") return null;
  // Paused cards keep their schedule and cannot be rated until resumed.
  if (state.enrolled && !state.active) return null;
  return "finish";
}

export type ReviewPromptDecision = "idle" | "wait" | "open" | "skip";

/**
 * Whether a completed Submit in review mode should open the rating dialog.
 *
 * Wait while the card loads; a Submit can land before the review fetch does.
 * Everything else is a decision this visit cannot change on its own, so the
 * caller may retire the pending prompt.
 */
export function decideReviewPrompt(state: {
  pending: boolean;
  dialogOpen: boolean;
  status: ReviewCardStatus;
  action: ReviewRatingAction;
}): ReviewPromptDecision {
  if (!state.pending) return "idle";
  if (state.dialogOpen) return "skip";
  // Keep the captured uncertain request reachable through its Retry control.
  if (state.action === "retry") return "skip";
  if (state.status === "loading") return "wait";
  if (state.status === "error") return "skip";
  return state.action === "finish" ? "open" : "skip";
}
