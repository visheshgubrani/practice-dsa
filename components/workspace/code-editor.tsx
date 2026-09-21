"use client";

import { loader } from "@monaco-editor/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { SaveStatus } from "@/lib/hooks/use-practice";
import type { LanguageId } from "@/lib/languages";

import { LanguagePicker } from "./language-picker";
import { ensureMonacoLoader, MONACO_VS_PATH } from "./monaco-setup";
import { SaveStatusLabel } from "./save-status";

/** `ssr: false` is only allowed inside a client component. */
const MonacoCodeEditor = dynamic(() => import("./code-editor-impl"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-4">
      {[72, 44, 88, 60, 36, 78, 52].map((width, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

export type CodeEditorPaneProps = {
  slug: string;
  value: string;
  language: LanguageId;
  monacoLanguage: string;
  onValueChange: (value: string) => void;
  onLanguageChange: (language: LanguageId) => void;
  onReset: () => void;
  onRun: () => void;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
};

export function CodeEditorPane({
  slug,
  value,
  language,
  monacoLanguage,
  onValueChange,
  onLanguageChange,
  onReset,
  onRun,
  saveStatus = "idle",
  onRetrySave,
}: CodeEditorPaneProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureMonacoLoader();
    loader
      .init()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!confirmingReset) return;
    const timer = setTimeout(() => setConfirmingReset(false), 2500);
    return () => clearTimeout(timer);
  }, [confirmingReset]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-[34px] shrink-0 items-center gap-1 border-b border-border bg-panel-2 pr-2 pl-1">
        <LanguagePicker value={language} onChange={onLanguageChange} />
        <div className="ml-auto flex items-center gap-2">
          <SaveStatusLabel status={saveStatus} onRetry={onRetrySave} />
          <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
            ⌘↵ run
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={confirmingReset ? "Confirm reset to starter code" : "Reset to starter code"}
          className={confirmingReset ? "text-destructive" : undefined}
          onClick={() => {
            if (confirmingReset) {
              onReset();
              setConfirmingReset(false);
            } else {
              setConfirmingReset(true);
            }
          }}
        >
          {confirmingReset ? (
            <span className="font-mono text-[11px]">reset?</span>
          ) : (
            <RotateCcwIcon />
          )}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        {status === "ready" && (
          <MonacoCodeEditor
            value={value}
            language={monacoLanguage}
            path={`${slug}.${monacoLanguage}`}
            onChange={onValueChange}
            onRun={onRun}
          />
        )}

        {status === "loading" && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Spinner className="text-muted-foreground" />
            <p className="font-mono text-[11px] text-muted-foreground">
              loading editor
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex max-w-md flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="size-4" />
                <span className="font-mono text-xs font-medium">
                  Editor assets did not load
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Monaco is served from <code className="font-mono text-xs">{MONACO_VS_PATH}</code>.
                Regenerate that folder and try again:
              </p>
              <pre className="overflow-x-auto rounded-sm border border-border bg-panel-2 p-2 font-mono text-[11.5px]">
                node scripts/sync-monaco.mjs
              </pre>
              <div>
                <Button
                  size="sm"
                  onClick={() => {
                    setStatus("loading");
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
