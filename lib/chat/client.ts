import type {
  ChatWorkspaceState,
  ChatThreadDetail,
  ChatThreadSummary,
  ChatMessageView,
} from "./types";
import { CHAT_COMPLETION_STATUSES } from "./types";

export type {
  ChatCompletionStatus,
  ChatMessageView,
  ChatThreadDetail,
  ChatThreadSummary,
  ChatWorkspaceState,
  TutorUIMessage,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isThreadSummary(value: unknown): value is ChatThreadSummary {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.updatedAt === "string";
}

function isMessageView(value: unknown): value is ChatMessageView {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.role === "user" ||
      value.role === "assistant" ||
      value.role === "system") &&
    Array.isArray(value.parts) &&
    typeof value.text === "string" &&
    typeof value.completionStatus === "string" &&
    CHAT_COMPLETION_STATUSES.includes(
      value.completionStatus as (typeof CHAT_COMPLETION_STATUSES)[number],
    ) &&
    typeof value.createdAt === "string"
  );
}

function isThreadDetail(value: unknown): value is ChatThreadDetail {
  return (
    isThreadSummary(value) &&
    Array.isArray((value as ChatThreadDetail).messages) &&
    (value as ChatThreadDetail).messages.every(isMessageView)
  );
}

export function isChatWorkspaceState(
  value: unknown,
): value is ChatWorkspaceState {
  if (!isRecord(value)) return false;
  return (
    typeof value.slug === "string" &&
    Array.isArray(value.threads) &&
    value.threads.every(isThreadSummary) &&
    (value.thread === null || isThreadDetail(value.thread))
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

export async function fetchChatWorkspace(
  slug: string,
  options?: { threadId?: string; signal?: AbortSignal },
): Promise<ChatWorkspaceState> {
  const params = new URLSearchParams({ slug });
  if (options?.threadId) params.set("threadId", options.threadId);
  const response = await fetch(`/api/chat?${params}`, {
    signal: options?.signal,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      errorMessage(payload, `Could not load conversations (${response.status}).`),
    );
  }
  if (!isChatWorkspaceState(payload)) {
    throw new Error("Conversations were not in the expected shape.");
  }
  return payload;
}
