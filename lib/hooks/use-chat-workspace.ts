"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchChatWorkspace } from "@/lib/chat/client";
import { toTutorMessage } from "@/lib/chat/messages";
import type {
  ChatThreadSummary,
  TutorUIMessage,
} from "@/lib/chat/types";

export type ChatWorkspaceStatus = "loading" | "ready" | "error";

export function useChatWorkspace(slug: string) {
  const [status, setStatus] = useState<ChatWorkspaceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorUIMessage[]>([]);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);

  const applyWorkspace = useCallback(
    (nextThreadId: string | undefined, state: Awaited<ReturnType<typeof fetchChatWorkspace>>) => {
      setThreads(state.threads);
      if (nextThreadId && state.thread) {
        setThreadId(state.thread.id);
        setMessages(state.thread.messages.map(toTutorMessage));
      } else if (!nextThreadId && state.thread) {
        setThreadId(state.thread.id);
        setMessages(state.thread.messages.map(toTutorMessage));
      } else {
        setThreadId(crypto.randomUUID());
        setMessages([]);
      }
      setError(null);
      setStatus("ready");
    },
    [],
  );

  const failLoad = useCallback((caught: unknown) => {
    setError(
      caught instanceof Error ? caught.message : "Could not load conversations.",
    );
    setThreadId((current) => current ?? crypto.randomUUID());
    setStatus("error");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchChatWorkspace(slug, { signal: controller.signal }).then(
      (state) => {
        if (controller.signal.aborted) return;
        applyWorkspace(undefined, state);
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        failLoad(caught);
      },
    );
    return () => {
      controller.abort();
    };
  }, [applyWorkspace, failLoad, slug]);

  const load = useCallback(
    async (nextThreadId?: string) => {
      setStatus("loading");
      setError(null);
      try {
        const state = await fetchChatWorkspace(slug, {
          threadId: nextThreadId,
        });
        applyWorkspace(nextThreadId, state);
      } catch (caught) {
        failLoad(caught);
      }
    },
    [applyWorkspace, failLoad, slug],
  );

  const refreshThreads = useCallback(async () => {
    try {
      const state = await fetchChatWorkspace(slug);
      setThreads(state.threads);
    } catch {
      // The open transcript is still usable; the picker just stays stale.
    }
  }, [slug]);

  const startNewConversation = useCallback(() => {
    setThreadId(crypto.randomUUID());
    setMessages([]);
    setError(null);
    setStatus("ready");
  }, []);

  const selectThread = useCallback(
    (id: string) => {
      if (id === threadId) return;
      void load(id);
    },
    [load, threadId],
  );

  return {
    status,
    error,
    threadId,
    messages,
    threads,
    load,
    refreshThreads,
    startNewConversation,
    selectThread,
  };
}
