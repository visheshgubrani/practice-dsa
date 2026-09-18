import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

/**
 * Relational config for drizzle's query API (`db.query.problems.findMany({ with:
 * { examples: true } })`).
 *
 * Both sides of every relation are declared: drizzle v1 needs the `one` side to
 * name the foreign key, and the `many` side to be reachable the other way. The
 * `many` side infers its columns from that single foreign key, which is why the
 * tables here have exactly one path to their parent.
 *
 * Foreign keys themselves live in the table definitions (`.references()`), which
 * is what the migration generator reads.
 */
export const relations = defineRelations(schema, (r) => ({
  problems: {
    examples: r.many.problemExamples(),
    testcases: r.many.problemTestcases(),
    starterCode: r.many.problemStarterCode(),
    drafts: r.many.drafts(),
    progress: r.many.problemProgress(),
    submissions: r.many.submissions(),
    chatThreads: r.many.chatThreads(),
  },
  problemExamples: {
    problem: r.one.problems({
      from: r.problemExamples.problemId,
      to: r.problems.id,
    }),
  },
  problemTestcases: {
    problem: r.one.problems({
      from: r.problemTestcases.problemId,
      to: r.problems.id,
    }),
  },
  problemStarterCode: {
    problem: r.one.problems({
      from: r.problemStarterCode.problemId,
      to: r.problems.id,
    }),
  },
  drafts: {
    problem: r.one.problems({ from: r.drafts.problemId, to: r.problems.id }),
  },
  problemProgress: {
    problem: r.one.problems({
      from: r.problemProgress.problemId,
      to: r.problems.id,
    }),
  },
  submissions: {
    problem: r.one.problems({ from: r.submissions.problemId, to: r.problems.id }),
    cases: r.many.submissionCases(),
  },
  submissionCases: {
    submission: r.one.submissions({
      from: r.submissionCases.submissionId,
      to: r.submissions.id,
    }),
  },
  chatThreads: {
    problem: r.one.problems({ from: r.chatThreads.problemId, to: r.problems.id }),
    messages: r.many.chatMessages(),
  },
  chatMessages: {
    thread: r.one.chatThreads({
      from: r.chatMessages.threadId,
      to: r.chatThreads.id,
    }),
    /**
     * Optional: `submission_id` is nullable and becomes null if the run it
     * describes is deleted, so a transcript never loses its history.
     */
    submission: r.one.submissions({
      from: r.chatMessages.submissionId,
      to: r.submissions.id,
    }),
  },
}));
