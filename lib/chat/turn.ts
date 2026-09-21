import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  streamText,
  validateUIMessages,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";

import { loadTutorSubmission } from "@/lib/ai/context";
import { writeDemoAnswer } from "@/lib/ai/demo";
import { assembleTutorTurn, buildDemoAnswer } from "@/lib/ai/prompts";
import { completionFromStream, messageText } from "@/lib/chat/messages";
import {
  beginChatTurn,
  ChatNotFoundError,
  ChatThreadMismatchError,
  completeChatTurn,
  type ChatPostBody,
} from "@/lib/db/queries/chat";
import { getProblem } from "@/lib/db/queries/problems";
import { getLanguage } from "@/lib/languages";

export const LIVE_MODEL = "deepseek-flash";
export const DEMO_MODEL = "demo";

function lastUserMessage(messages: UIMessage[]): UIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index];
  }
  return undefined;
}

function usageTokens(usage: LanguageModelUsage | undefined): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  return {
    promptTokens: usage?.inputTokens ?? null,
    completionTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
  };
}

function errorText(error: unknown): string | null {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return null;
}

/**
 * Persist the user turn, assemble disclosed tutor context, generate, and store
 * the assistant reply. `live` is passed in so persistence tests can force demo
 * mode even when a provider key is present in the environment.
 */
export async function executeChatTurn(input: {
  body: ChatPostBody;
  signal?: AbortSignal;
  live: boolean;
}): Promise<Response> {
  const { body, signal, live } = input;
  const threadId = body.threadId ?? body.id;
  if (!threadId) {
    return Response.json({ error: "threadId is required." }, { status: 400 });
  }

  const problem = await getProblem(body.problemSlug);
  if (!problem) {
    return Response.json({ error: "Unknown problem." }, { status: 404 });
  }

  let incoming: UIMessage[];
  try {
    incoming = await validateUIMessages<UIMessage>({ messages: body.messages });
  } catch {
    return Response.json({ error: "Invalid chat messages." }, { status: 400 });
  }

  const user = lastUserMessage(incoming);
  if (!user || messageText(user.parts).length === 0) {
    return Response.json({ error: "A user message is required." }, { status: 400 });
  }

  const model = live ? LIVE_MODEL : DEMO_MODEL;
  const language = getLanguage(body.language);

  let turn: Awaited<ReturnType<typeof beginChatTurn>>;
  try {
    turn = await beginChatTurn({
      threadId,
      problemSlug: body.problemSlug,
      user: { uiId: user.id, parts: user.parts },
      assistantUiId:
        body.trigger === "regenerate-message" ? body.messageId : undefined,
      language: body.language,
      draftSource: body.code ?? null,
      runSummary: body.runSummary ?? null,
      submissionId: body.submissionId ?? null,
      model,
    });
  } catch (error) {
    if (
      error instanceof ChatNotFoundError ||
      error instanceof ChatThreadMismatchError
    ) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Could not store the message.";
    return Response.json({ error: message }, { status: 500 });
  }

  const question = messageText(user.parts);
  let usage: LanguageModelUsage | undefined;
  let finishReason: string | null = null;

  const submission = await loadTutorSubmission(
    problem.slug,
    body.submissionId,
  );
  const assembled = assembleTutorTurn({
    problem,
    language,
    editorCode: body.code ?? "",
    submission,
    runSummary: body.runSummary ?? null,
    history: turn.history,
  });

  const stream = createUIMessageStream({
    originalMessages: turn.originalMessages,
    generateId: () => turn.assistantUiId,
    execute: async ({ writer }) => {
      if (!live) {
        await writeDemoAnswer(
          writer,
          buildDemoAnswer({ question, problem, language }),
          { signal },
        );
        return;
      }

      const result = streamText({
        model: deepseek(LIVE_MODEL),
        instructions: assembled.instructions,
        messages: await convertToModelMessages(assembled.messages),
        abortSignal: signal,
        onEnd: ({ usage: nextUsage, finishReason: nextFinish }) => {
          usage = nextUsage;
          finishReason = nextFinish ?? null;
        },
      });

      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          originalMessages: turn.originalMessages,
          generateMessageId: () => turn.assistantUiId,
        }),
      );
    },
    onEnd: async ({ responseMessage, isAborted, outcome }) => {
      const completionStatus = completionFromStream({
        isAborted,
        outcomeStatus: outcome.status,
      });
      try {
        await completeChatTurn({
          threadId: turn.threadId,
          assistantUiId: turn.assistantUiId,
          parts: responseMessage.parts,
          completionStatus,
          model,
          finishReason,
          ...usageTokens(usage),
          providerMetadata: finishReason ? { finishReason } : null,
          error:
            completionStatus === "failed" && outcome.status === "failed"
              ? errorText(outcome.error)
              : null,
        });
      } catch (error) {
        console.error("Could not persist the tutor reply.", error);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    consumeSseStream: async ({ stream: sse }) => {
      const reader = sse.getReader();
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch {
        // The client already disconnected; draining still lets onEnd run.
      }
    },
  });
}
