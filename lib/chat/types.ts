import type { UIMessage } from "ai";

/**
 * JSON shapes for `/api/chat`. Kept free of the database client so the
 * workspace can import them.
 */

export const CHAT_COMPLETION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "aborted",
] as const;

export type ChatCompletionStatus = (typeof CHAT_COMPLETION_STATUSES)[number];

export type ChatMessageMetadata = {
  completionStatus: ChatCompletionStatus;
};

export type TutorUIMessage = UIMessage<ChatMessageMetadata>;

export type ChatThreadSummary = {
  id: string;
  title: string | null;
  model: string | null;
  updatedAt: string;
};

export type ChatMessageView = {
  id: string;
  role: TutorUIMessage["role"];
  parts: TutorUIMessage["parts"];
  text: string;
  completionStatus: ChatCompletionStatus;
  createdAt: string;
};

export type ChatThreadDetail = {
  id: string;
  title: string | null;
  model: string | null;
  updatedAt: string;
  messages: ChatMessageView[];
};

export type ChatWorkspaceState = {
  slug: string;
  thread: ChatThreadDetail | null;
  threads: ChatThreadSummary[];
};
