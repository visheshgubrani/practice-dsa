"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertTriangleIcon, MessagesSquareIcon } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { messageText } from "@/lib/chat/messages";
import type { ChatThreadSummary, TutorUIMessage } from "@/lib/chat/types";
import { useChatWorkspace } from "@/lib/hooks/use-chat-workspace";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";

import { ChatComposer } from "./chat-composer";

export type AiMode = "live" | "demo";

function completionLabel(status: TutorUIMessage["metadata"]): string | null {
  if (status?.completionStatus === "aborted") return "Generation stopped";
  if (status?.completionStatus === "failed") return "That answer did not finish";
  if (status?.completionStatus === "pending") return "This answer never finished";
  return null;
}

function threadItems(
  threads: ChatThreadSummary[],
  threadId: string,
): Array<{ value: string; label: string }> {
  const items = threads.map((thread) => ({
    value: thread.id,
    label: thread.title ?? "Conversation",
  }));
  if (!items.some((item) => item.value === threadId)) {
    items.unshift({ value: threadId, label: "New conversation" });
  }
  return items;
}

function TutorThread({
  problem,
  language,
  code,
  runSummary,
  submissionId,
  aiMode,
  threadId,
  initialMessages,
  threads,
  onNewConversation,
  onSelectThread,
  onTurnSettled,
}: {
  problem: Problem;
  language: Language;
  code: string;
  runSummary?: string;
  submissionId?: string;
  aiMode: AiMode;
  threadId: string;
  initialMessages: TutorUIMessage[];
  threads: ChatThreadSummary[];
  onNewConversation: () => void;
  onSelectThread: (id: string) => void;
  onTurnSettled: () => void;
}) {
  const extras = {
    problemSlug: problem.slug,
    language: language.id,
    code,
    runSummary,
    threadId,
    submissionId,
  };
  const extrasRef = useRef(extras);
  useEffect(() => {
    extrasRef.current = extras;
  });

  const transport = useMemo(
    () => new DefaultChatTransport<TutorUIMessage>({ api: "/api/chat" }),
    [],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    regenerate,
    error,
    clearError,
  } = useChat<TutorUIMessage>({
    id: threadId,
    messages: initialMessages,
    generateId: () => crypto.randomUUID(),
    transport,
    onFinish: () => {
      onTurnSettled();
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;
  const items = threadItems(threads, threadId);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-panel-2 px-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          Tutor
        </span>
        {aiMode === "demo" ? (
          <Badge
            variant="outline"
            className="border-difficulty-medium/40 bg-difficulty-medium/10 font-mono text-[10px] text-difficulty-medium"
            title="Set DEEPSEEK_API_KEY in .env.local to talk to the real model."
          >
            demo
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-success/40 bg-success/10 font-mono text-[10px] text-success"
          >
            deepseek
          </Badge>
        )}
        {items.length > 1 ? (
          <Select
            items={items}
            value={threadId}
            onValueChange={(value) => {
              if (typeof value === "string") onSelectThread(value);
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Previous conversations"
              className="ml-auto max-w-[160px] border-transparent bg-transparent font-mono text-[11px] hover:bg-muted dark:bg-transparent dark:hover:bg-muted"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-48">
              {items.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="font-mono text-[11px]"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant="ghost"
          size="xs"
          className={
            items.length > 1
              ? "font-mono text-[11px] text-muted-foreground"
              : "ml-auto font-mono text-[11px] text-muted-foreground"
          }
          disabled={isStreaming}
          onClick={() => {
            clearError();
            onNewConversation();
          }}
        >
          new
        </Button>
      </div>

      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4 p-3">
              <MessageScrollerItem messageId="context">
                <Marker>
                  <MarkerIcon>
                    <MessagesSquareIcon />
                  </MarkerIcon>
                  <MarkerContent className="font-mono text-[11px]">
                    {problem.number}. {problem.title} · {language.short} · your
                    current buffer is attached
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>

              {!hasMessages && (
                <MessageScrollerItem messageId="empty">
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessagesSquareIcon />
                      </EmptyMedia>
                      <EmptyTitle>Nothing asked yet</EmptyTitle>
                      <EmptyDescription>
                        The tutor sees the statement, the constraints, and your
                        current {language.short} code. Ask for a nudge rather
                        than the answer.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </MessageScrollerItem>
              )}

              {messages.map((message) => {
                const isUser = message.role === "user";
                const text = messageText(message.parts);
                const incomplete = completionLabel(message.metadata);
                if (text.length === 0 && !isUser && !incomplete) return null;

                return (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={isUser}
                  >
                    <Message align={isUser ? "end" : "start"}>
                      <MessageContent>
                        {text.length > 0 ? (
                          <Bubble
                            variant={isUser ? "secondary" : "ghost"}
                            align={isUser ? "end" : "start"}
                          >
                            <BubbleContent>
                              {isUser ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {text}
                                </p>
                              ) : (
                                <Markdown>{text}</Markdown>
                              )}
                            </BubbleContent>
                          </Bubble>
                        ) : null}
                        {incomplete ? (
                          <Marker>
                            <MarkerContent className="font-mono text-[11px] text-muted-foreground">
                              {incomplete}
                            </MarkerContent>
                          </Marker>
                        ) : null}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}

              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <MessageScrollerItem messageId="thinking">
                  <span className="shimmer font-mono text-[11px] text-muted-foreground">
                    thinking…
                  </span>
                </MessageScrollerItem>
              )}

              {error && (
                <MessageScrollerItem messageId="error">
                  <Alert variant="destructive">
                    <AlertTriangleIcon />
                    <AlertTitle>That answer did not come through</AlertTitle>
                    <AlertDescription>
                      {error.message.length > 0
                        ? error.message
                        : "The request to the tutor failed."}
                    </AlertDescription>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerate({ body: extrasRef.current })}
                      >
                        Retry
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearError()}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </Alert>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <ChatComposer
        problem={problem}
        language={language}
        isStreaming={isStreaming}
        onSend={(text) => {
          void sendMessage({ text }, { body: extrasRef.current });
        }}
        onStop={stop}
      />
    </div>
  );
}

export function AiChatPane({
  problem,
  language,
  code,
  runSummary,
  submissionId,
  aiMode,
}: {
  problem: Problem;
  language: Language;
  /** The live editor buffer. */
  code: string;
  /** One-line summary of the last run, when there is one. */
  runSummary?: string;
  /** Stored run this question is about, when the last Run/Submit persisted. */
  submissionId?: string;
  aiMode: AiMode;
}) {
  const workspace = useChatWorkspace(problem.slug);

  if (workspace.status === "loading" || workspace.threadId == null) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-panel">
        <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-panel-2 px-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            Tutor
          </span>
        </div>
        <div className="flex flex-col gap-3 p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      {workspace.error ? (
        <div className="border-b border-border p-3">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Conversations did not load</AlertTitle>
            <AlertDescription>{workspace.error}</AlertDescription>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void workspace.load();
                }}
              >
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}
      <TutorThread
        key={workspace.threadId}
        problem={problem}
        language={language}
        code={code}
        runSummary={runSummary}
        submissionId={submissionId}
        aiMode={aiMode}
        threadId={workspace.threadId}
        initialMessages={workspace.messages}
        threads={workspace.threads}
        onNewConversation={workspace.startNewConversation}
        onSelectThread={workspace.selectThread}
        onTurnSettled={() => {
          void workspace.refreshThreads();
        }}
      />
    </div>
  );
}
