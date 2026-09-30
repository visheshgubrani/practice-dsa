import { z } from "zod";

import { toTutorMessage } from "@/lib/chat/messages";
import type { ChatMessageView, TutorUIMessage } from "@/lib/chat/types";
import {
  ChatNotFoundError,
  ChatThreadMismatchError,
  getChatWorkspace,
} from "@/lib/db/queries/chat";
import { getProblem } from "@/lib/db/queries/problems";
import { getSubmission } from "@/lib/db/queries/submissions";
import { LANGUAGES, getLanguage, type Language } from "@/lib/languages";
import {
  APPROACH_MAX,
  COMPLEXITY_MAX,
  PITFALLS_MAX,
  STEPS_MAX,
  normalizePersonalNotes,
  type PersonalNotes,
} from "@/lib/practice/notes";
import type { Problem } from "@/lib/problems";
import type { SubmissionDetail } from "@/lib/submissions/types";

/**
 * Server-side assembly of the notes-draft request.
 *
 * Everything a preview may see is resolved here, by the same reads the tutor
 * uses. A conversation or a run is only context for the problem it belongs to:
 * a reference that does not match is rejected rather than mixed in, so a draft
 * can never summarize another problem's thread.
 */

const slugSchema = z.string().min(1).max(200);

export const notesGenerateBodySchema = z
  .object({
    slug: slugSchema,
    language: z.enum(LANGUAGES.map((language) => language.id)),
    source: z.string().max(200_000),
    notes: z
      .object({
        approach: z.string().max(APPROACH_MAX).optional(),
        steps: z.string().max(STEPS_MAX).optional(),
        pitfalls: z.string().max(PITFALLS_MAX).optional(),
        timeComplexity: z.string().max(COMPLEXITY_MAX).optional(),
        spaceComplexity: z.string().max(COMPLEXITY_MAX).optional(),
      })
      .strict()
      .optional(),
    threadId: z.string().uuid().optional(),
    submissionId: z.string().uuid().optional(),
  })
  .strict();

export type NotesGenerateBody = z.infer<typeof notesGenerateBodySchema>;

export type NotesContext = {
  problem: Problem;
  language: Language;
  /** The editor buffer being summarized. */
  source: string;
  /** Starter template, so an untouched buffer is not mistaken for work. */
  starter: string;
  notes: PersonalNotes;
  /** Bounded later; only completed assistant turns survive here. */
  messages: TutorUIMessage[];
  submission: SubmissionDetail | null;
};

export type NotesContextOutcome =
  | { ok: true; context: NotesContext }
  | { ok: false; status: number; error: string };

/**
 * Only finished assistant text is conversation evidence. A pending, failed, or
 * aborted turn is not something the user read, so a draft must not summarize it.
 * User messages are complete by definition.
 */
export function completedConversation(
  messages: readonly ChatMessageView[],
): TutorUIMessage[] {
  return messages
    .filter(
      (message) =>
        message.role === "user" || message.completionStatus === "completed",
    )
    .map(toTutorMessage);
}

/**
 * Resolve the problem, then the two optional references, each against that
 * problem. `getSubmission` already applies the hidden-case disclosure policy;
 * the slug check here is what keeps a run from another problem out of the
 * prompt.
 */
export async function loadNotesContext(
  body: NotesGenerateBody,
): Promise<NotesContextOutcome> {
  const problem = await getProblem(body.slug);
  if (!problem) {
    return { ok: false, status: 404, error: "Unknown problem." };
  }

  const language = getLanguage(body.language);

  let messages: TutorUIMessage[] = [];
  if (body.threadId) {
    try {
      const state = await getChatWorkspace(body.slug, body.threadId);
      messages = completedConversation(state?.thread?.messages ?? []);
    } catch (error) {
      if (
        error instanceof ChatNotFoundError ||
        error instanceof ChatThreadMismatchError
      ) {
        return { ok: false, status: 404, error: error.message };
      }
      throw error;
    }
  }

  let submission: SubmissionDetail | null = null;
  if (body.submissionId) {
    submission = await getSubmission(body.submissionId);
    if (!submission || submission.slug !== problem.slug) {
      return {
        ok: false,
        status: 404,
        error: "That run does not belong to this problem.",
      };
    }
  }

  return {
    ok: true,
    context: {
      problem,
      language,
      source: body.source,
      starter: problem.starterCode[language.id],
      notes: normalizePersonalNotes(body.notes),
      messages,
      submission,
    },
  };
}
