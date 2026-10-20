import type {
  CoachItemKind,
  CoachNoteRequest,
  CoachPlanState,
  CoachTone,
} from "@/lib/coach/types";

/**
 * The coach-note prompt. The planner has already decided the day; this prompt
 * only asks for a short, calm nudge over structured facts. It contains no
 * problem title, slug, statement, source, chat, or personal note, so the model
 * cannot name a problem the plan did not choose or leak hidden content.
 */

export const COACH_NOTE_PROMPT_VERSION = 1;

const STATE_LABEL: Record<CoachPlanState, string> = {
  active: "There is a plan to start.",
  done: "The plan is finished.",
  empty: "Nothing is scheduled.",
};

const TONE_LABEL: Record<CoachTone, string> = {
  start: "This is their first real session.",
  comeback: "They are returning after a gap.",
  steady: "A normal practice day.",
  push: "They have been consistent recently.",
};

function kindLabel(kind: CoachItemKind): string {
  return kind === "review" ? "a review" : "a problem";
}

function itemLines(items: CoachNoteRequest["items"]): string[] {
  if (items.length === 0) return ["Remaining items: none."];
  return [
    "Remaining items:",
    ...items.map(
      (item) =>
        `- ${kindLabel(item.kind)} (${item.difficulty}, about ${item.minutes} minutes)`,
    ),
  ];
}

function doneLine(request: CoachNoteRequest): string {
  const parts: string[] = [];
  if (request.reviewsDone > 0) parts.push("a review");
  if (request.newDone > 0) parts.push("a problem");
  return parts.length > 0
    ? `Already done today: ${parts.join(" and ")}.`
    : "Nothing has been done today yet.";
}

function minimumLine(request: CoachNoteRequest): string {
  if (request.minimumKind === null) return "No minimum item.";
  return `Low-energy minimum: ${kindLabel(request.minimumKind)}.`;
}

export function buildCoachNotePrompt(request: CoachNoteRequest): string {
  return [
    "Write a short note for the top of a personal algorithm-practice dashboard.",
    "The app has already decided the plan below. Do not change it, reorder it, add to it, or remove from it.",
    "",
    "Voice: calm, concrete, friendly. No cheerleading, no guilt, no diagnosis, no clinical labels. The reader finds a long list hard to start; make the first move feel small.",
    "",
    "Rules for the note:",
    "- Two or three short sentences, at most 320 characters.",
    "- Plain text only. No numerals or counts: the app shows them. No problem titles, topics, or algorithm names. Refer to the first review, the first problem, or the plan.",
    "- No markdown, no emoji, no questions, no line breaks.",
    "- Do not mention a streak or practice-day rules; the app shows practice progress separately.",
    "- Do not add tasks, challenges, or a second problem. Do not tell them to do more than the plan.",
    "- Use the minimum to give permission to stop. If the plan is done, give permission to close the session. If it is empty, do not invent work.",
    "- Do not use should, must, just, or easy.",
    "",
    "Plan facts:",
    `- State: ${STATE_LABEL[request.state]}`,
    `- Tone: ${TONE_LABEL[request.tone]}`,
    `- Time available: ${request.minutes} minutes.`,
    request.practicedToday
      ? "- They have already practised today."
      : "- They have not practised today.",
    doneLine(request),
    ...itemLines(request.items),
    minimumLine(request),
  ].join("\n");
}
