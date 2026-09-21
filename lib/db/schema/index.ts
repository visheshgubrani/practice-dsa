import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { chatMessages, chatThreads } from "./chat";
import { drafts, legacyAccepted, problemProgress } from "./practice";
import {
  problemExamples,
  problemStarterCode,
  problemTestcases,
  problems,
} from "./problems";
import { submissionCases, submissions } from "./submissions";

export * from "./columns";
export * from "./chat";
export * from "./enums";
export * from "./practice";
export * from "./problems";
export * from "./submissions";

/**
 * Schema barrel: every table, plus the row types the app passes around.
 *
 * `lib/db/relations.ts` imports this namespace to build the relational config.
 * drizzle-kit does not: `drizzle.config.ts` lists the table modules explicitly,
 * so the same table is never handed to the diff engine twice.
 */

export type Problem = InferSelectModel<typeof problems>;
export type NewProblem = InferInsertModel<typeof problems>;
export type ProblemExample = InferSelectModel<typeof problemExamples>;
export type ProblemTestcase = InferSelectModel<typeof problemTestcases>;
export type ProblemStarterCode = InferSelectModel<typeof problemStarterCode>;

export type Draft = InferSelectModel<typeof drafts>;
export type ProblemProgress = InferSelectModel<typeof problemProgress>;
export type LegacyAccepted = InferSelectModel<typeof legacyAccepted>;

export type Submission = InferSelectModel<typeof submissions>;
export type NewSubmission = InferInsertModel<typeof submissions>;
export type SubmissionCase = InferSelectModel<typeof submissionCases>;

export type ChatThread = InferSelectModel<typeof chatThreads>;
export type ChatMessage = InferSelectModel<typeof chatMessages>;
export type NewChatMessage = InferInsertModel<typeof chatMessages>;

/** Every table, for `defineRelations` and for server code that needs the set. */
export const schema = {
  problems,
  problemExamples,
  problemTestcases,
  problemStarterCode,
  drafts,
  problemProgress,
  legacyAccepted,
  submissions,
  submissionCases,
  chatThreads,
  chatMessages,
};
