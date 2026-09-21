"use client";

import { useCallback, useState } from "react";
import { usePanelRef } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsWideLayout } from "@/lib/hooks/use-media-query";
import { usePractice } from "@/lib/hooks/use-practice";
import { usePracticeImport } from "@/lib/hooks/use-practice-import";
import { useProgress } from "@/lib/hooks/use-progress";
import { toLanguageId } from "@/lib/languages";
import {
  codeDirtyKey,
  codeRecoveryKey,
} from "@/lib/practice/keys";
import type { PracticeProgress, VerifiedAccepted } from "@/lib/practice/types";
import {
  isRunResult,
  isVerifiedAcceptance,
  summarizeRun,
  type RunMode,
  type RunResult,
  type RunnerKind,
} from "@/lib/runner/types";
import type { Problem, ProblemSummary } from "@/lib/problems";

import { AiChatPane, type AiMode } from "./ai-chat";
import {
  CodeColumn,
  CONSOLE_EXPANDED_SIZE,
  CONSOLE_STRIP_PX,
} from "./code-column";
import { CodeEditorPane } from "./code-editor";
import { ConsolePanel, type ConsoleTab } from "./console-panel";
import { ProblemPanel } from "./problem-panel";
import {
  ImportPracticeAlert,
  LoadErrorAlert,
  SaveConflictAlert,
} from "./save-status";
import type { RunState } from "./verdict-strip";
import { WorkspaceHeader } from "./workspace-header";

type Neighbour = Pick<ProblemSummary, "slug" | "title" | "number">;

function persistFields(payload: unknown): {
  persisted: boolean;
  progress?: PracticeProgress;
  latestAccepted?: VerifiedAccepted | null;
} {
  if (typeof payload !== "object" || payload === null) {
    return { persisted: false };
  }
  const body = payload as {
    persisted?: unknown;
    progress?: PracticeProgress;
    latestAccepted?: VerifiedAccepted | null;
  };
  return {
    persisted: body.persisted === true,
    progress: body.progress,
    latestAccepted: body.latestAccepted,
  };
}

export type WorkspaceProps = {
  problem: Problem;
  previous?: Neighbour;
  next?: Neighbour;
  aiMode: AiMode;
  /** Which executor is configured, so the console can say so before a run. */
  runner: RunnerKind;
};

export function Workspace({
  problem,
  previous,
  next,
  aiMode,
  runner,
}: WorkspaceProps) {
  const isWide = useIsWideLayout();
  const { markAccepted } = useProgress();
  const practice = usePractice(problem);
  const importer = usePracticeImport({
    onImported: practice.retryLoad,
  });

  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [consoleMinimized, setConsoleMinimized] = useState(false);
  const consolePanelRef = usePanelRef();

  const runSummary =
    runState.status === "done" ? summarizeRun(runState.result) : undefined;
  const submissionId =
    runState.status === "done" ? runState.result.submissionId : undefined;

  const solved = practice.progress.status === "solved";

  const run = useCallback(
    async (mode: RunMode) => {
      const source = practice.source;
      const languageId = practice.language.id;
      const selectedIndex = testcaseIndex;

      setRunState({ status: "running", mode });
      setConsoleTab("result");
      if (consolePanelRef.current?.getSize().inPixels !== undefined) {
        const size = consolePanelRef.current.getSize().inPixels;
        if (size <= CONSOLE_STRIP_PX + 6) {
          consolePanelRef.current.resize(CONSOLE_EXPANDED_SIZE);
        }
      }

      try {
        const requestId = crypto.randomUUID();
        const response = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: problem.slug,
            language: languageId,
            source,
            mode,
            testcaseIndex: selectedIndex,
            requestId,
          }),
        });

        const payload: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : `Run request failed (${response.status}).`;
          setRunState({ status: "error", mode, message });
          return;
        }

        if (!isRunResult(payload)) {
          setRunState({
            status: "error",
            mode,
            message: "The runner returned an unexpected response.",
          });
          return;
        }

        const persist = persistFields(payload);
        const result: RunResult = { ...payload, persisted: persist.persisted };
        setRunState({ status: "done", result });

        if (persist.persisted) {
          practice.applyPersistedRun({
            progress: persist.progress,
            latestAccepted: persist.latestAccepted,
          });
          setHistoryEpoch((epoch) => epoch + 1);
        }

        if (persist.persisted && isVerifiedAcceptance(result)) {
          practice.setAccepted({
            source,
            language: languageId,
            at: result.at,
          });
          markAccepted(problem.slug, languageId);
        }
      } catch (error) {
        setRunState({
          status: "error",
          mode,
          message:
            error instanceof Error
              ? error.message
              : "Could not reach the runner.",
        });
      }
    },
    [
      consolePanelRef,
      markAccepted,
      practice,
      problem.slug,
      testcaseIndex,
    ],
  );

  const busyMode = runState.status === "running" ? runState.mode : null;

  const handleConsoleResize = useCallback((inPixels: number) => {
    const next = inPixels <= CONSOLE_STRIP_PX + 6;
    setConsoleMinimized((previous) => (previous === next ? previous : next));
  }, []);

  const toggleConsole = useCallback(() => {
    const panel = consolePanelRef.current;
    if (!panel) return;
    if (panel.getSize().inPixels <= CONSOLE_STRIP_PX + 6) {
      panel.resize(CONSOLE_EXPANDED_SIZE);
    } else {
      panel.resize(`${CONSOLE_STRIP_PX}px`);
    }
  }, [consolePanelRef]);

  const handleConsoleTabChange = useCallback(
    (tab: ConsoleTab) => {
      setConsoleTab(tab);
      const panel = consolePanelRef.current;
      if (!panel) return;
      if (panel.getSize().inPixels <= CONSOLE_STRIP_PX + 6) {
        panel.resize(CONSOLE_EXPANDED_SIZE);
      }
    },
    [consolePanelRef],
  );

  const loadSource = useCallback(
    (source: string, languageId: string) => {
      const language = toLanguageId(languageId);
      if (!language || language === practice.language.id) {
        practice.onCodeChange(source);
        return;
      }

      try {
        window.localStorage.setItem(
          codeRecoveryKey(problem.slug, language),
          JSON.stringify(source),
        );
        window.localStorage.setItem(
          codeDirtyKey(problem.slug, language),
          JSON.stringify(true),
        );
      } catch {
        // Storage unavailable: the switch still happens, the buffer just stays.
      }
      practice.onLanguageChange(language);
    },
    [practice, problem.slug],
  );

  const loadAcceptedCode = useCallback(() => {
    const accepted = practice.accepted;
    if (!accepted) return;
    loadSource(accepted.source, accepted.language);
  }, [loadSource, practice.accepted]);

  const loadLegacyCode = useCallback(() => {
    const legacy = practice.legacySnapshot;
    if (!legacy) return;
    loadSource(legacy.source, legacy.language);
  }, [loadSource, practice.legacySnapshot]);

  const acceptedForNotes =
    !practice.hasVerifiedAccepted &&
    practice.accepted &&
    practice.legacySnapshot &&
    practice.accepted.source === practice.legacySnapshot.source
      ? null
      : practice.accepted;

  const banners =
    importer.visible ||
    practice.loadError ||
    practice.draftConflict ||
    practice.notesConflict ? (
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2">
        {importer.visible ? (
          <ImportPracticeAlert
            summary={importer.summary}
            importing={importer.status === "importing"}
            error={importer.error}
            onImport={importer.importNow}
            onDismiss={importer.dismiss}
          />
        ) : null}
        {practice.loadError ? (
          <LoadErrorAlert
            message={practice.loadError}
            onRetry={practice.retryLoad}
          />
        ) : null}
        {practice.draftConflict ? (
          <SaveConflictAlert
            resource="draft"
            onReload={practice.reloadDraft}
            onOverwrite={practice.overwriteDraft}
          />
        ) : null}
        {practice.notesConflict ? (
          <SaveConflictAlert
            resource="progress"
            onReload={practice.reloadNotes}
            onOverwrite={practice.overwriteNotes}
          />
        ) : null}
      </div>
    ) : null;

  const problemPanel = (
    <ProblemPanel
      problem={problem}
      notes={practice.notes}
      onNotesChange={practice.onNotesChange}
      accepted={acceptedForNotes}
      onLoadAccepted={loadAcceptedCode}
      legacySnapshot={practice.legacySnapshot}
      onLoadLegacy={loadLegacyCode}
      notesSaveStatus={practice.notesStatus}
      onRetryNotesSave={practice.retryNotesSave}
      chat={
        <AiChatPane
          problem={problem}
          language={practice.language}
          code={practice.source}
          runSummary={runSummary}
          submissionId={submissionId}
          aiMode={aiMode}
        />
      }
    />
  );

  const editorPane = (
    <CodeEditorPane
      slug={problem.slug}
      value={practice.source}
      language={practice.language.id}
      monacoLanguage={practice.language.monacoId}
      onValueChange={practice.onCodeChange}
      onLanguageChange={practice.onLanguageChange}
      onReset={practice.onReset}
      onRun={() => {
        void run("run");
      }}
      saveStatus={practice.draftStatus}
      onRetrySave={practice.retryDraftSave}
    />
  );

  const consolePane = (
    <ConsolePanel
      problem={problem}
      runState={runState}
      tab={consoleTab}
      onTabChange={handleConsoleTabChange}
      testcaseIndex={testcaseIndex}
      onTestcaseChange={setTestcaseIndex}
      minimized={consoleMinimized}
      onToggleMinimize={toggleConsole}
      onRun={() => {
        void run("run");
      }}
      simulated={
        runState.status === "done"
          ? runState.result.runner === "mock"
          : runner === "mock"
      }
      historyEpoch={historyEpoch}
      onLoadSource={loadSource}
    />
  );

  const codeColumn = (
    <CodeColumn
      editor={editorPane}
      console={consolePane}
      consolePanelRef={consolePanelRef}
      onConsoleResize={handleConsoleResize}
    />
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <WorkspaceHeader
        problem={problem}
        previous={previous}
        next={next}
        solved={solved}
        busyMode={busyMode}
        onRun={() => {
          void run("run");
        }}
        onSubmit={() => {
          void run("submit");
        }}
      />
      {banners}

      {isWide ? (
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1"
        >
          <ResizablePanel
            defaultSize="44"
            minSize="26"
            maxSize="64"
            className="min-w-0"
          >
            {problemPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="56" minSize="34" className="min-w-0">
            {codeColumn}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="h-[68vh] min-h-[420px] border-b border-border">
            {problemPanel}
          </div>
          <div className="h-[86vh] min-h-[520px]">{codeColumn}</div>
        </div>
      )}
    </div>
  );
}
