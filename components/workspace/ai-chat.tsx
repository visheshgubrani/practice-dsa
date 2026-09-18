"use client";

import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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
import {
  Message,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";

import { ChatComposer } from "./chat-composer";

export type AiMode = "live" | "demo";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export function AiChatPane({
  problem,
  language,
  code,
  runSummary,
  aiMode,
}: {
  problem: Problem;
  language: Language;
  /** The editor buffer, or the source snapshotted at the last Run/Submit. */
  code: string;
  /** One-line summary of the last run, when there is one. */
  runSummary?: string;
  aiMode: AiMode;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    error,
    clearError,
  } = useChat({ transport });

  const requestContext = {
    problemSlug: problem.slug,
    language: language.id,
    code,
    runSummary,
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
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
        {hasMessages && (
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto font-mono text-[11px] text-muted-foreground"
            onClick={() => {
              clearError();
              setMessages([]);
            }}
          >
            clear
          </Button>
        )}
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
                const text = messageText(message);
                if (text.length === 0 && !isUser) return null;

                return (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={isUser}
                  >
                    <Message align={isUser ? "end" : "start"}>
                      <MessageContent>
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
                        onClick={() => regenerate({ body: requestContext })}
                      >
                        Retry
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => clearError()}>
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
          void sendMessage({ text }, { body: requestContext });
        }}
        onStop={stop}
      />
    </div>
  );
}
