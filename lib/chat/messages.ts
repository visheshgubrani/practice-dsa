import type { UIMessage } from "ai";

import type {
  ChatCompletionStatus,
  ChatMessageView,
  TutorUIMessage,
} from "./types";

export const THREAD_TITLE_MAX = 72;

export function messageText(parts: UIMessage["parts"]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export function threadTitleFrom(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return "New conversation";
  if (collapsed.length <= THREAD_TITLE_MAX) return collapsed;
  return `${collapsed.slice(0, THREAD_TITLE_MAX - 1)}…`;
}

export function toTutorMessage(message: ChatMessageView): TutorUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: { completionStatus: message.completionStatus },
  };
}

export function completionFromStream(input: {
  isAborted: boolean;
  outcomeStatus: string;
}): ChatCompletionStatus {
  if (input.isAborted || input.outcomeStatus === "aborted") return "aborted";
  if (input.outcomeStatus === "failed") return "failed";
  return "completed";
}
