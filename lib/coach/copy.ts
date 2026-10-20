import type {
  CoachEmptyReason,
  CoachItemKind,
  CoachMinutes,
  CoachPlanItem,
  CoachPlanState,
  CoachTone,
} from "./types";

/**
 * All day-level wording for the coach card. Keeping it out of the planner and
 * the component makes the states testable and stops the UI from re-deriving
 * counts. The fallback note never contains digits: the facts are rendered
 * separately, so the prose cannot contradict them.
 */

export type NewBlockedBy =
  | "none"
  | "heavy-reviews"
  | "time"
  | "scheduled"
  | "quota";

export type PlanCopyInput = {
  state: CoachPlanState;
  emptyReason: CoachEmptyReason | null;
  tone: CoachTone;
  minutes: CoachMinutes;
  practicedToday: boolean;
  currentStreak: number;
  items: readonly CoachPlanItem[];
  reviewsDueNow: number;
  reviewsDone: number;
  reviewsRemaining: number;
  newDone: number;
  newRemaining: number;
  estimatedMinutes: number;
  pausedCount: number;
  upcomingCount: number;
  nextReviewAt: string | null;
  unsolved: number;
  newBlockedBy: NewBlockedBy;
  hardSkipped: boolean;
};

export type PlanCopy = {
  headline: string;
  summary: string;
  progressLine: string | null;
  fallbackNote: string;
  defer: string[];
  minimum: string | null;
};

function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function remainingHeadline(reviews: number, newProblems: number): string {
  const parts: string[] = [];
  if (reviews > 0) parts.push(countLabel(reviews, "review"));
  if (newProblems > 0) {
    parts.push(countLabel(newProblems, "new problem"));
  }
  return parts.join(" + ");
}

function estimateLine(estimated: number, budget: CoachMinutes): string {
  if (estimated <= 0) return "";
  if (estimated < budget - 5) {
    return `About ${estimated} minutes. The rest of the ${budget} is yours.`;
  }
  if (estimated >= budget - 2) {
    return `About ${estimated} minutes. That fills the ${budget}.`;
  }
  return `About ${estimated} minutes.`;
}

function activeFocusLine(input: PlanCopyInput, startedToday: boolean): string {
  if (startedToday) {
    return "You're already underway. Take the next item; the rest can wait.";
  }
  if (input.practicedToday) {
    return "You've already practised today. The rest of the plan is optional.";
  }
  switch (input.tone) {
    case "start":
      return "Start small. One problem is enough to begin.";
    case "comeback":
      return "A light restart: the first item is small on purpose.";
    case "push":
      return "You have momentum; keep the order and stop when the plan is done.";
    case "steady":
    default:
      if (input.reviewsRemaining > 0 && input.newRemaining > 0) {
        return "Reviews first; the new problem is the main event.";
      }
      if (input.reviewsRemaining > 0) {
        return "Reviews only; the backlog can wait.";
      }
      return "One new problem; nothing else is scheduled.";
  }
}

function emptySummary(input: PlanCopyInput): string {
  if (input.emptyReason === "caught-up") {
    if (input.nextReviewAt) {
      return "Nothing is due today. Your next review is already scheduled.";
    }
    if (input.pausedCount > 0) {
      return "Nothing is due. Your paused reviews are waiting on the Reviews page.";
    }
    if (input.upcomingCount > 0) {
      return "Nothing is due today. Upcoming reviews are scheduled.";
    }
    return "Nothing is due today. Rest, or revisit a topic if you feel like it.";
  }

  if (input.newBlockedBy === "scheduled") {
    return "The unsolved problems left already have reviews scheduled. Nothing new today.";
  }
  if (input.minutes === 15) {
    return "No easy problem fits 15 minutes. Try 30 minutes or open the problem list.";
  }
  return "No easy or medium problem fits today's plan. Open the problem list if you want a challenge.";
}

function fallbackNote(input: PlanCopyInput, startedToday: boolean): string {
  if (input.state === "done") {
    return "That's the plan. Close the app without adding more; anything else is optional.";
  }
  if (input.state === "empty") {
    return input.emptyReason === "caught-up"
      ? "Nothing is due. Rest, or revisit a topic if you feel like it."
      : "No problem fits this session. Try more time, or pick one yourself from the list.";
  }
  if (startedToday) {
    return "You already started. Take the next item; the rest can wait.";
  }
  if (input.practicedToday) {
    return "You've already practised today. The rest of the plan is optional.";
  }
  if (input.tone === "comeback") {
    return "Coming back is the hard part. The first item is small on purpose; do only that if the rest feels heavy.";
  }
  if (input.tone === "start") {
    return "You don't need to plan the whole session. Open the first item and write one line.";
  }
  if (input.tone === "push") {
    return "You have momentum. Keep the order; stop when the plan is done.";
  }

  const firstKind: CoachItemKind | undefined = input.items[0]?.kind;
  if (firstKind === "review") {
    return "Start with the first review. It's short, and it makes the next step easier to begin.";
  }
  if (firstKind === "continue") {
    return "Pick the problem back up. The draft is already there; writing one line is enough to start.";
  }
  return "Open the first problem and read it once. Writing the first line is enough to start.";
}

function minimumLine(input: PlanCopyInput): string | null {
  if (input.state !== "active" || input.items.length === 0) return null;
  return input.items[0]?.kind === "review"
    ? "One item is enough: start with the first review."
    : "One item is enough: open the first problem and write one line.";
}

function deferLines(input: PlanCopyInput, startedToday: boolean): string[] {
  const lines: string[] = [];
  const dueRemaining = Math.max(0, input.reviewsDueNow - input.reviewsRemaining);

  if (dueRemaining > 0) {
    lines.push(
      `${countLabel(dueRemaining, "more review")} ${
        dueRemaining === 1 ? "is" : "are"
      } due and stays for another day. Today's plan is a slice, not the backlog.`,
    );
  }

  if (
    input.state === "active" &&
    !input.practicedToday &&
    input.currentStreak > 0
  ) {
    lines.push(
      input.newRemaining > 0
        ? "Reviews are not a practice day; the new problem's Submit keeps the streak."
        : "Reviews are not a practice day. If you want the streak, open a problem and Submit.",
    );
  }

  switch (input.newBlockedBy) {
    case "heavy-reviews":
      lines.push("No new problem today; the review load is high.");
      break;
    case "time":
      lines.push("No new problem in 15 minutes; reviews first.");
      break;
    case "scheduled":
      lines.push(
        "No new problem today; the unsolved ones already have reviews scheduled.",
      );
      break;
    case "quota":
      if (input.state === "active") {
        lines.push("New-problem goal met; the rest is reviews.");
      }
      break;
    case "none":
    default:
      break;
  }

  if (input.state === "active" && input.hardSkipped && !startedToday) {
    lines.push("Hard problems are not picked automatically.");
  }

  return lines.slice(0, 3);
}

export function buildPlanCopy(input: PlanCopyInput): PlanCopy {
  const startedToday = input.reviewsDone + input.newDone > 0;

  let headline: string;
  let summary: string;
  if (input.state === "done") {
    headline = "Done for today";
    summary = "You finished today's plan. Anything else is optional.";
  } else if (input.state === "empty") {
    headline = "Nothing scheduled today";
    summary = emptySummary(input);
  } else {
    headline = remainingHeadline(
      input.reviewsRemaining,
      input.newRemaining,
    );
    summary = [estimateLine(input.estimatedMinutes, input.minutes), activeFocusLine(input, startedToday)]
      .filter((part) => part.length > 0)
      .join(" ");
  }

  const doneParts: string[] = [];
  if (input.reviewsDone > 0) {
    doneParts.push(countLabel(input.reviewsDone, "review"));
  }
  if (input.newDone > 0) {
    doneParts.push(countLabel(input.newDone, "new problem"));
  }
  const progressLine =
    doneParts.length > 0 ? `Done today: ${doneParts.join(" · ")}.` : null;

  return {
    headline,
    summary,
    progressLine,
    fallbackNote: fallbackNote(input, startedToday),
    defer: deferLines(input, startedToday),
    minimum: minimumLine(input),
  };
}
