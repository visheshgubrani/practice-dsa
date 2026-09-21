import type { UIMessage } from "ai";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, timestamps } from "./columns";
import {
  chatCompletionStatusEnum,
  chatRoleEnum,
  languageEnum,
} from "./enums";
import { problems } from "./problems";
import { submissions } from "./submissions";

/**
 * The tutor's transcripts.
 *
 * A thread belongs to one problem (many per problem, one per attempt) and every
 * message carries the context the model was given: the editor buffer, the
 * language, and the run it was asking about. Storing that snapshot is what makes
 * "why did this fail?" replayable months later, when the draft has moved on.
 */

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    title: text("title"),
    /** e.g. "deepseek-flash"; null while the thread has no assistant turn yet. */
    model: text("model"),
    ...timestamps,
  },
  (t) => [
    index("chat_threads_problem_updated_idx").on(t.problemId, t.updatedAt.desc()),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    /**
     * Per-thread ordinal. Assigned inside a transaction that first locks the
     * parent thread row, then takes `max(seq) + 1`. Without that lock two
     * concurrent writers can pick the same seq and collide on the unique index.
     */
    seq: integer("seq").notNull(),
    /** The AI SDK's own `UIMessage.id`, so a streamed turn reconciles with its row. */
    uiId: text("ui_id"),
    role: chatRoleEnum("role").notNull(),
    /**
     * `UIMessage.parts`, stored verbatim: text, reasoning and (later) tool
     * parts survive a round trip through the transport. Type-only import, so the
     * AI SDK is never loaded by migrations or the seed.
     */
    parts: jsonb("parts")
      .$type<UIMessage["parts"]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Flattened text, for previews and search — `parts` is the source of truth. */
    text: text("text").notNull().default(""),
    // --- Context snapshot -------------------------------------------------
    language: languageEnum("language"),
    /** The editor buffer as it was when this turn was sent. */
    draftSource: text("draft_source"),
    /** One-line summary of the run the message refers to. */
    runSummary: text("run_summary"),
    /** Set when the run was stored; survives submission deletion as null. */
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "set null",
    }),
    // --- Assistant metadata -----------------------------------------------
    /**
     * Distinguishes a finished answer from a Stop, a provider error, or a
     * placeholder written before generation. Restored history can then show the
     * interrupted turn instead of pretending it never happened.
     */
    completionStatus: chatCompletionStatusEnum("completion_status")
      .notNull()
      .default("pending"),
    /** Provider-specific payload (finish details, extra usage fields). */
    providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>(),
    /** Set when generation failed; null on completed and aborted turns. */
    error: text("error"),
    model: text("model"),
    finishReason: text("finish_reason"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    createdAt,
  },
  (t) => [
    uniqueIndex("chat_messages_thread_seq_key").on(t.threadId, t.seq),
    uniqueIndex("chat_messages_ui_id_key").on(t.uiId),
    index("chat_messages_thread_created_idx").on(t.threadId, t.createdAt),
  ],
);
