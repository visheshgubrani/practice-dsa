import {
  MORE_ACTIONS,
  PRIMARY_ACTIONS,
  type QuickAction,
} from "@/lib/ai/prompts";
import { messageText } from "./messages";
import type { ChatCompletionStatus, TutorUIMessage } from "./types";

/** A partial answer is not a completed explanation, including after restore. */
export function hasCompletedTutorReply(
  messages: readonly TutorUIMessage[],
  completions: Readonly<Record<string, ChatCompletionStatus>> = {},
): boolean {
  return messages.some((message) =>
    message.role === "assistant" &&
    (completions[message.id] ?? message.metadata?.completionStatus) === "completed" &&
    messageText(message.parts).trim().length > 0,
  );
}

/**
 * Which chat actions are pressable right now.
 *
 * The availability rule lives here rather than in the component so it can be
 * asserted without a DOM: everything is disabled while the tutor is answering,
 * and "Make it concrete" waits for a finished reply because there is nothing to
 * sharpen before one exists.
 */
export type ChatActionState = {
  action: QuickAction;
  disabled: boolean;
};

export function primaryActionStates({
  isStreaming,
  hasTutorReply,
}: {
  isStreaming: boolean;
  hasTutorReply: boolean;
}): ChatActionState[] {
  return PRIMARY_ACTIONS.map((action) => ({
    action,
    disabled: isStreaming || (action.id === "concrete" && !hasTutorReply),
  }));
}

export function moreActionStates({
  isStreaming,
}: {
  isStreaming: boolean;
}): ChatActionState[] {
  return MORE_ACTIONS.map((action) => ({ action, disabled: isStreaming }));
}
