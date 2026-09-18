"use client";

import { useCallback, useState } from "react";
import { usePanelRef } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsWideLayout } from "@/lib/hooks/use-media-query";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { useProgress } from "@/lib/hooks/use-progress";
import {
  DEFAULT_LANGUAGE,
  getLanguage,
  toLanguageId,
  type LanguageId,
} from "@/lib/languages";
import type { Problem, ProblemSummary, SolutionNotes } from "@/lib/problems";
import {
  isRunResult,
  isVerifiedAcceptance,
  summarizeRun,
  type RunMode,
  type RunResult,
  type RunnerKind,
} from "@/lib/runner/types";

import { AiChatPane, type AiMode } from "./ai-chat";
import {
  CodeColumn,
  CONSOLE_EXPANDED_SIZE,
  CONSOLE_STRIP_PX,
} from "./code-column";
import { CodeEditorPane } from "./code-editor";
import { ConsolePanel, type ConsoleTab } from "./console-panel";
import { ProblemPanel } from "./problem-panel";
import type { AcceptedSolution } from "./solution-notes";
import type { RunState } from "./verdict-strip";
import { WorkspaceHeader } from "./workspace-header";

type Neighbour = Pick<ProblemSummary, "slug" | "title" | "number">;

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
  const { progress, hydrated: progressHydrated, markAccepted } = useProgress();

  const languageState = usePersistedState<LanguageId>(
    `dsa.language.${problem.slug}`,
    DEFAULT_LANGUAGE,
  );
  // A buffer saved under a language that is no longer offered reads back as that
  // value; the app runs Python, so an unknown one falls back rather than throwing
  // at someone who simply opened an old problem.
  const language = getLanguage(toLanguageId(languageState.value) ?? DEFAULT_LANGUAGE);

  const codeState = usePersistedState<string>(
    `dsa.code.${problem.slug}.${language.id}`,
    problem.starterCode[language.id],
  );

  const notesState = usePersistedState<SolutionNotes>(
    `dsa.notes.${problem.slug}`,
    problem.notes,
  );

  const acceptedState = usePersistedState<AcceptedSolution>(
    `dsa.accepted.${problem.slug}`,
    null,
  );
  const setAccepted = acceptedState.setValue;
  const setLanguage = languageState.setValue;
  const clearCode = codeState.reset;

  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [consoleMinimized, setConsoleMinimized] = useState(false);
  const consolePanelRef = usePanelRef();
  const [judgedSource, setJudgedSource] = useState<string | undefined>();

  const runSummary =
    runState.status === "done" ? summarizeRun(runState.result) : undefined;

  const solved = progressHydrated && Boolean(progress[problem.slug]);

  const run = useCallback(
    async (mode: RunMode) => {
      // Snapshot at click. Later keystrokes must not change the judged source,
      // the accepted-code record, or the tutor context for this attempt.
      const source = codeState.value;
      const languageId = language.id;
      const selectedIndex = testcaseIndex;
      setJudgedSource(source);

      setRunState({ status: "running", mode });
      setConsoleTab("result");
      if (consolePanelRef.current?.getSize().inPixels !== undefined) {
        const size = consolePanelRef.current.getSize().inPixels;
        if (size <= CONSOLE_STRIP_PX + 6) {
          consolePanelRef.current.resize(CONSOLE_EXPANDED_SIZE);
        }
      }

      try {
        const response = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: problem.slug,
            language: languageId,
            source,
            mode,
            testcaseIndex: selectedIndex,
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

        const result: RunResult = payload;
        setRunState({ status: "done", result });

        if (isVerifiedAcceptance(result)) {
          setAccepted({
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
      language.id,
      markAccepted,
      problem.slug,
      setAccepted,
      testcaseIndex,
      codeState.value,
    ],
  );

  const busyMode = runState.status === "running" ? runState.mode : null;

  /** Keeps the strip's minimized flag honest when the divider is dragged. */
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

  /**
   * Restore the accepted submission into the editor. When it was written in
   * another language, the buffer hook re-reads its storage key after the
   * language switch, so the accepted source is written to that key first.
   */
  const loadAcceptedCode = useCallback(() => {
    const accepted = acceptedState.value;
    if (!accepted) return;

    if (accepted.language === language.id) {
      codeState.setValue(accepted.source);
      return;
    }

    try {
      window.localStorage.setItem(
        `dsa.code.${problem.slug}.${accepted.language}`,
        JSON.stringify(accepted.source),
      );
    } catch {
      // Storage unavailable: the switch still happens, the buffer just stays.
    }
    setLanguage(accepted.language);
  }, [acceptedState.value, codeState, language.id, problem.slug, setLanguage]);

  const problemPanel = (
    <ProblemPanel
      problem={problem}
      notes={notesState.value}
      onNotesChange={notesState.setValue}
      accepted={acceptedState.value}
      onLoadAccepted={loadAcceptedCode}
      chat={
        <AiChatPane
          problem={problem}
          language={language}
          code={judgedSource ?? codeState.value}
          runSummary={runSummary}
          aiMode={aiMode}
        />
      }
    />
  );

  const editorPane = (
    <CodeEditorPane
      slug={problem.slug}
      value={codeState.value}
      language={language.id}
      monacoLanguage={language.monacoId}
      onValueChange={codeState.setValue}
      onLanguageChange={setLanguage}
      onReset={clearCode}
      onRun={() => {
        void run("run");
      }}
    />
  );

  const consolePane = (
    <ConsolePanel
      problem={problem}
      runState={runState}
      tab={consoleTab}
      onTabChange={setConsoleTab}
      testcaseIndex={testcaseIndex}
      onTestcaseChange={setTestcaseIndex}
      minimized={consoleMinimized}
      onToggleMinimize={toggleConsole}
      onRun={() => {
        void run("run");
      }}
      simulated={runner === "mock"}
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
