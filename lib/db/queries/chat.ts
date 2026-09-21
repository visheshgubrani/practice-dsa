import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import type { UIMessage } from "ai";

import { messageText, threadTitleFrom, toTutorMessage } from "@/lib/chat/messages";
import type {
  ChatCompletionStatus,
  ChatMessageView,
  ChatThreadDetail,
  ChatThreadSummary,
  ChatWorkspaceState,
  TutorUIMessage,
} from "@/lib/chat/types";
import { STORED_LANGUAGES, type StoredLanguageId } from "@/lib/languages";

import { db } from "../index";
import { chatMessages, chatThreads } from "../schema";

export type {
  ChatCompletionStatus,
  ChatMessageView,
  ChatThreadDetail,
  ChatThreadSummary,
  ChatWorkspaceState,
  TutorUIMessage,
} from "@/lib/chat/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const uuidSchema = z.string().uuid();
const messageIdSchema = z.string().min(1).max(128);
const slugSchema = z.string().min(1).max(200);

export const chatGetQuerySchema = z.object({
  slug: slugSchema,
  threadId: uuidSchema.optional(),
});

export const chatPostBodySchema = z
  .object({
    /** AI SDK chat id; the client sets this to the thread UUID. */
    id: uuidSchema.optional(),
    threadId: uuidSchema.optional(),
    messages: z.array(z.unknown()).min(1),
    trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
    /** Assistant `ui_id` when regenerating a turn. */
    messageId: messageIdSchema.optional(),
    problemSlug: slugSchema,
    language: z.enum(["python"]),
    code: z.string().max(200_000).optional(),
    runSummary: z.string().max(4000).optional(),
    submissionId: uuidSchema.optional(),
  })
  .refine((body) => body.threadId != null || body.id != null, {
    message: "threadId is required.",
  });

export type ChatPostBody = z.infer<typeof chatPostBodySchema>;

export class ChatNotFoundError extends Error {
  readonly kind: "problem" | "thread";

  constructor(kind: "problem" | "thread") {
    super(kind === "problem" ? "Unknown problem." : "Unknown conversation.");
    this.name = "ChatNotFoundError";
    this.kind = kind;
  }
}

export class ChatThreadMismatchError extends Error {
  constructor() {
    super("That conversation does not belong to this problem.");
    this.name = "ChatThreadMismatchError";
  }
}

const REUSABLE_ASSISTANT = new Set<ChatCompletionStatus>([
  "pending",
  "failed",
  "aborted",
]);

function toSummary(row: {
  id: string;
  title: string | null;
  model: string | null;
  updatedAt: Date;
}): ChatThreadSummary {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageView(row: {
  id: string;
  uiId: string | null;
  role: TutorUIMessage["role"];
  parts: UIMessage["parts"];
  text: string;
  completionStatus: ChatCompletionStatus;
  createdAt: Date;
}): ChatMessageView {
  return {
    id: row.uiId ?? row.id,
    role: row.role,
    parts: row.parts,
    text: row.text,
    completionStatus: row.completionStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

async function lockThread(tx: Tx, threadId: string): Promise<void> {
  await tx.execute(
    sql`select id from chat_threads where id = ${threadId} for update`,
  );
}

async function nextSeq(tx: Tx, threadId: string): Promise<number> {
  const [row] = await tx
    .select({
      max: sql<number>`coalesce(max(${chatMessages.seq}), 0)`,
    })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId));
  return Number(row?.max ?? 0) + 1;
}

async function problemIdBySlug(slug: string) {
  return db.query.problems.findFirst({
    where: { slug },
    columns: { id: true, slug: true },
  });
}

async function listThreadSummaries(
  tx: Tx | typeof db,
  problemId: string,
): Promise<ChatThreadSummary[]> {
  const rows = await tx
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      model: chatThreads.model,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .where(eq(chatThreads.problemId, problemId))
    .orderBy(desc(chatThreads.updatedAt))
    .limit(50);
  return rows.map(toSummary);
}

async function loadMessages(
  tx: Tx | typeof db,
  threadId: string,
): Promise<ChatMessageView[]> {
  const rows = await tx
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.seq));
  return rows.map(toMessageView);
}

async function loadThreadDetail(
  tx: Tx | typeof db,
  thread: {
    id: string;
    title: string | null;
    model: string | null;
    updatedAt: Date;
  },
): Promise<ChatThreadDetail> {
  return {
    ...toSummary(thread),
    messages: await loadMessages(tx, thread.id),
  };
}

async function resolveSubmissionId(
  tx: Tx,
  problemId: string,
  submissionId: string | null,
): Promise<string | null> {
  if (!submissionId) return null;
  const row = await tx.query.submissions.findFirst({
    where: { id: submissionId },
    columns: { id: true, problemId: true },
  });
  if (!row || row.problemId !== problemId) return null;
  return row.id;
}

async function ensureLockedThread(
  tx: Tx,
  threadId: string,
  problemId: string,
) {
  await tx
    .insert(chatThreads)
    .values({ id: threadId, problemId })
    .onConflictDoNothing({ target: chatThreads.id });
  await lockThread(tx, threadId);
  const thread = await tx.query.chatThreads.findFirst({
    where: { id: threadId },
  });
  if (!thread) {
    throw new Error("Could not create the conversation.");
  }
  if (thread.problemId !== problemId) {
    throw new ChatThreadMismatchError();
  }
  return thread;
}

async function persistUserMessage(
  tx: Tx,
  input: {
    threadId: string;
    uiId: string;
    parts: UIMessage["parts"];
    language: StoredLanguageId;
    draftSource: string | null;
    runSummary: string | null;
    submissionId: string | null;
  },
) {
  const existing = await tx.query.chatMessages.findFirst({
    where: { uiId: input.uiId },
  });
  if (existing) {
    if (existing.threadId !== input.threadId || existing.role !== "user") {
      throw new Error("That message id is already in use.");
    }
    return { row: existing, created: false };
  }

  const seq = await nextSeq(tx, input.threadId);
  const inserted = await tx
    .insert(chatMessages)
    .values({
      threadId: input.threadId,
      seq,
      uiId: input.uiId,
      role: "user",
      parts: input.parts,
      text: messageText(input.parts),
      language: input.language,
      draftSource: input.draftSource,
      runSummary: input.runSummary,
      submissionId: input.submissionId,
      completionStatus: "completed",
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Could not store the user message.");
  return { row, created: true };
}

async function persistAssistantPlaceholder(
  tx: Tx,
  input: {
    threadId: string;
    userSeq: number;
    requestedUiId?: string;
    model: string;
  },
) {
  if (input.requestedUiId) {
    const existing = await tx.query.chatMessages.findFirst({
      where: { uiId: input.requestedUiId },
    });
    if (existing) {
      if (existing.threadId !== input.threadId || existing.role !== "assistant") {
        throw new Error("That message id is already in use.");
      }
      const [updated] = await tx
        .update(chatMessages)
        .set({
          parts: [],
          text: "",
          completionStatus: "pending",
          model: input.model,
          finishReason: null,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          providerMetadata: null,
          error: null,
        })
        .where(eq(chatMessages.id, existing.id))
        .returning();
      if (!updated) throw new Error("Could not reset the assistant turn.");
      return updated;
    }
  }

  const following = await tx
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.threadId, input.threadId),
        gt(chatMessages.seq, input.userSeq),
      ),
    )
    .orderBy(asc(chatMessages.seq));
  const reusable = following.find(
    (row) =>
      row.role === "assistant" &&
      REUSABLE_ASSISTANT.has(row.completionStatus),
  );
  if (reusable) {
    const [updated] = await tx
      .update(chatMessages)
      .set({
        uiId: input.requestedUiId ?? reusable.uiId,
        parts: [],
        text: "",
        completionStatus: "pending",
        model: input.model,
        finishReason: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        providerMetadata: null,
        error: null,
      })
      .where(eq(chatMessages.id, reusable.id))
      .returning();
    if (!updated) throw new Error("Could not reset the assistant turn.");
    return updated;
  }

  const seq = await nextSeq(tx, input.threadId);
  const [inserted] = await tx
    .insert(chatMessages)
    .values({
      threadId: input.threadId,
      seq,
      uiId: input.requestedUiId ?? crypto.randomUUID(),
      role: "assistant",
      parts: [],
      text: "",
      completionStatus: "pending",
      model: input.model,
    })
    .returning();
  if (!inserted) throw new Error("Could not store the assistant placeholder.");
  return inserted;
}

function historyForModel(
  rows: Awaited<ReturnType<typeof loadMessages>>,
  assistantUiId: string,
): TutorUIMessage[] {
  return rows
    .filter((row) => {
      if (row.id === assistantUiId) return false;
      if (row.role === "assistant") return row.completionStatus === "completed";
      return true;
    })
    .map(toTutorMessage);
}

export async function getChatWorkspace(
  slug: string,
  threadId?: string,
): Promise<ChatWorkspaceState | null> {
  const problem = await problemIdBySlug(slug);
  if (!problem) return null;

  const threads = await listThreadSummaries(db, problem.id);
  if (threadId) {
    const thread = await db.query.chatThreads.findFirst({
      where: { id: threadId },
    });
    if (!thread || thread.problemId !== problem.id) {
      throw new ChatNotFoundError("thread");
    }
    return {
      slug: problem.slug,
      thread: await loadThreadDetail(db, thread),
      threads,
    };
  }

  const latest = threads[0];
  if (!latest) {
    return { slug: problem.slug, thread: null, threads };
  }
  const thread = await db.query.chatThreads.findFirst({
    where: { id: latest.id },
  });
  return {
    slug: problem.slug,
    thread: thread ? await loadThreadDetail(db, thread) : null,
    threads,
  };
}

export type BeginChatTurnInput = {
  threadId: string;
  problemSlug: string;
  user: {
    uiId: string;
    parts: UIMessage["parts"];
  };
  assistantUiId?: string;
  language: StoredLanguageId;
  draftSource: string | null;
  runSummary: string | null;
  submissionId: string | null;
  model: string;
};

export type BeginChatTurnResult = {
  threadId: string;
  assistantUiId: string;
  history: TutorUIMessage[];
  originalMessages: TutorUIMessage[];
};

/**
 * Persist the user turn (idempotent on `ui_id`) and an assistant placeholder
 * before generation. History returned here is loaded from Postgres, not from
 * the client payload.
 */
export async function beginChatTurn(
  input: BeginChatTurnInput,
): Promise<BeginChatTurnResult> {
  const problem = await problemIdBySlug(input.problemSlug);
  if (!problem) throw new ChatNotFoundError("problem");

  if (!STORED_LANGUAGES.includes(input.language)) {
    throw new Error("Unsupported language.");
  }

  return db.transaction(async (tx) => {
    const thread = await ensureLockedThread(tx, input.threadId, problem.id);
    const submissionId = await resolveSubmissionId(
      tx,
      problem.id,
      input.submissionId,
    );
    const user = await persistUserMessage(tx, {
      threadId: thread.id,
      uiId: input.user.uiId,
      parts: input.user.parts,
      language: input.language,
      draftSource: input.draftSource,
      runSummary: input.runSummary,
      submissionId,
    });
    const assistant = await persistAssistantPlaceholder(tx, {
      threadId: thread.id,
      userSeq: user.row.seq,
      requestedUiId: input.assistantUiId,
      model: input.model,
    });
    const title = thread.title ?? threadTitleFrom(user.row.text);
    await tx
      .update(chatThreads)
      .set({
        title,
        model: input.model,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, thread.id));

    const messages = await loadMessages(tx, thread.id);
    const assistantUiId = assistant.uiId ?? assistant.id;
    const history = historyForModel(messages, assistantUiId);
    const placeholder: TutorUIMessage = {
      id: assistantUiId,
      role: "assistant",
      parts: [],
      metadata: { completionStatus: "pending" },
    };
    return {
      threadId: thread.id,
      assistantUiId,
      history,
      originalMessages: [...history, placeholder],
    };
  });
}

export type CompleteChatTurnInput = {
  threadId: string;
  assistantUiId: string;
  parts: UIMessage["parts"];
  completionStatus: ChatCompletionStatus;
  model: string;
  finishReason?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  providerMetadata?: Record<string, unknown> | null;
  error?: string | null;
};

export async function completeChatTurn(
  input: CompleteChatTurnInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockThread(tx, input.threadId);
    const existing = await tx.query.chatMessages.findFirst({
      where: { uiId: input.assistantUiId },
    });
    if (!existing || existing.threadId !== input.threadId) {
      throw new ChatNotFoundError("thread");
    }
    await tx
      .update(chatMessages)
      .set({
        parts: input.parts,
        text: messageText(input.parts),
        completionStatus: input.completionStatus,
        model: input.model,
        finishReason: input.finishReason ?? null,
        promptTokens: input.promptTokens ?? null,
        completionTokens: input.completionTokens ?? null,
        totalTokens: input.totalTokens ?? null,
        providerMetadata: input.providerMetadata ?? null,
        error: input.error ?? null,
      })
      .where(eq(chatMessages.id, existing.id));
    await tx
      .update(chatThreads)
      .set({
        model: input.model,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, input.threadId));
  });
}

/** Test helper: count rows for a thread without going through the public DTO. */
export async function countThreadMessages(threadId: string): Promise<number> {
  const rows = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId));
  return rows.length;
}
