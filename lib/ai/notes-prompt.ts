import {
  boundConversation,
  CASE_FIELD_LIMIT,
  discloseCaseForTutor,
  truncateForContext,
} from "@/lib/ai/prompts";
import { messageText } from "@/lib/chat/messages";
import type { TutorUIMessage } from "@/lib/chat/types";
import type { Language } from "@/lib/languages";
import { notesAreBlank, type PersonalNotes } from "@/lib/practice/notes";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

/**
 * A memory aid drawn from the session, not a solution write-up.
 *
 * Catalog approach notes and reference-solution source are not inputs. Hidden
 * successes stay status-only, the same disclosure the tutor already uses. The
 * editor and a referenced run are kept apart so a failed attempt is never
 * described as working code.
 */

export const NOTES_DRAFT_UNAVAILABLE =
  "There isn't a session to summarize yet. Try the problem or talk it through, then draft again.";

/**
 * Whether anything happened in this session worth remembering. An untouched
 * starter buffer, blank notes, an empty thread, and no stored run means the only
 * thing left to summarize would be invented.
 */
export function notesSessionIsEmpty(input: {
  starter: string;
  source: string;
  notes: PersonalNotes;
  messages: readonly TutorUIMessage[];
  submission: SubmissionDetail | null;
}): boolean {
  const moved =
    input.source.trim().length > 0 && input.source.trim() !== input.starter.trim();
  const chat = input.messages.some((message) => messageText(message.parts).length > 0);
  return !moved && notesAreBlank(input.notes) && !chat && input.submission == null;
}

/**
 * Only completed assistant turns are readable conversation. A pending, failed,
 * or aborted reply is not something the user read, so it is dropped here as well
 * as at the loader.
 */
function formatConversation(messages: readonly TutorUIMessage[]): {
  text: string;
  truncated: boolean;
  omitted: number;
} {
  const completed = messages.filter(
    (message) =>
      message.role === "user" ||
      message.metadata?.completionStatus === "completed",
  );
  const bounded = boundConversation(completed);
  const text = bounded.messages
    .map((message) => {
      const body = messageText(message.parts);
      if (body.length === 0) return "";
      const role = message.role === "assistant" ? "Tutor" : "You";
      return `${role}: ${body}`;
    })
    .filter((line) => line.length > 0)
    .join("\n\n");
  return { text, truncated: bounded.truncated, omitted: bounded.omitted };
}

function formatAttempt(
  submission: SubmissionDetail,
  editorMatches: boolean,
): string {
  const verified =
    submission.mode === "submit" &&
    submission.runner === "piston" &&
    submission.verdict === "accepted";
  const lines = [
    verified
      ? "Verified working submit: a real Piston Submit accepted this code."
      : `Not a verified solve. Verdict ${submission.verdict}, mode ${submission.mode}, runner ${submission.runner}. Treat this as an incomplete or failed attempt unless the editor clearly moved past it.`,
    `Passed ${submission.passedCount}/${submission.totalCount}.`,
    editorMatches
      ? "The editor still holds the code this result came from."
      : "The editor has changed since this run. The verdict describes the submitted code, not the current editor, so do not present the editor as already passing.",
    `Submitted source:\n${truncateForContext(submission.source).text}`,
  ];
  if (submission.compileOutput) {
    lines.push(`Compile diagnostics: ${truncateForContext(submission.compileOutput, CASE_FIELD_LIMIT).text}`);
  }
  for (const entry of submission.cases) {
    const disclosed = discloseCaseForTutor(entry);
    if (disclosed.hidden && disclosed.status === "accepted") {
      lines.push(`Hidden case ${disclosed.index + 1}: accepted.`);
      continue;
    }
    const detail = [
      disclosed.input ? `input ${disclosed.input}` : null,
      disclosed.expected ? `expected ${disclosed.expected}` : null,
      disclosed.stdout ? `output ${disclosed.stdout}` : null,
      disclosed.debug ? `debug ${disclosed.debug}` : null,
      disclosed.stderr ? `diagnostics ${disclosed.stderr}` : null,
    ]
      .filter((part): part is string => part != null)
      .map((part) => truncateForContext(part, CASE_FIELD_LIMIT).text);
    lines.push(
      `${disclosed.hidden ? "Revealed hidden" : "Visible"} case ${disclosed.index + 1}: ${disclosed.status}${
        detail.length > 0 ? ` (${detail.join("; ")})` : ""
      }.`,
    );
  }
  return lines.join("\n");
}

/**
 * The user's own text is context, not the subject: each field is clipped to the
 * same per-field budget the tutor uses for a disclosed case.
 */
function noteLine(label: string, value: string): string {
  if (value.trim().length === 0) return `${label}: (blank)`;
  return `${label}: ${truncateForContext(value, CASE_FIELD_LIMIT).text}`;
}

export function buildNotesDraftPrompt(input: {
  problem: Problem;
  language: Language;
  source: string;
  notes: PersonalNotes;
  messages: readonly TutorUIMessage[];
  submission: SubmissionDetail | null;
}): string {
  const code = truncateForContext(input.source);
  const conversation = formatConversation(input.messages);
  const conversationBlock = [
    conversation.text.length > 0
      ? `Conversation:\n${conversation.text}`
      : "Conversation: (none)",
    conversation.truncated
      ? `(Earlier messages were dropped to fit the context budget${
          conversation.omitted > 0 ? `: ${conversation.omitted} omitted` : ""
        }. Do not claim the session said something that is not above.)`
      : "",
  ]
    .filter((part) => part.length > 0)
    .join("\n");
  const examples = input.problem.examples
    .map((example, index) => {
      const explanation = example.explanation ? `\n${example.explanation}` : "";
      return `Example ${index + 1}:\n${example.input}\n${example.output}${explanation}`;
    })
    .join("\n\n");

  return [
    "Write a short memory aid for a later review of this problem.",
    "Summarize the approach actually discussed or attempted in the session below.",
    "Aim for roughly 150–250 words across all fields together.",
    "Fields: approach is the key idea, steps is the order of moves, pitfalls is what tripped you up, timeComplexity and spaceComplexity are the costs.",
    "Record a personal mistake only when the code or the conversation supports it. Leave a field blank when it is not supported, including a complexity you are not sure of.",
    "Distinguish an incomplete or failed attempt from verified working code. Do not describe a failed attempt as a solution that works.",
    "Do not include a full solution or a complete code listing. A memory aid names the idea and the steps, not the implementation.",
    "Do not substitute a generic textbook approach for what this session actually did, and do not invent constraints, examples, or a session that is not in the context.",
    "",
    `Problem ${input.problem.number}. ${input.problem.title} (${input.problem.difficulty})`,
    input.problem.statement,
    examples.length > 0 ? examples : "",
    input.problem.constraints.length > 0
      ? `Constraints:\n${input.problem.constraints.join("\n")}`
      : "",
    `Language: ${input.language.label}`,
    "",
    "Current editor:",
    code.text.length > 0 ? code.text : "(empty)",
    "",
    "Current personal notes:",
    noteLine("Key idea", input.notes.approach),
    noteLine("Steps", input.notes.steps),
    noteLine("What tripped me up", input.notes.pitfalls),
    noteLine("Time", input.notes.timeComplexity),
    noteLine("Space", input.notes.spaceComplexity),
    "",
    conversationBlock,
    "",
    input.submission
      ? formatAttempt(input.submission, input.submission.source === input.source)
      : "No stored attempt is attached.",
  ]
    .filter((part) => part !== "")
    .join("\n");
}
