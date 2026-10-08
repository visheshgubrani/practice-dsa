"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";
import { usePanelRef } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsWideLayout } from "@/lib/hooks/use-media-query";
import { useChatWorkspace } from "@/lib/hooks/use-chat-workspace";
import { useNotesDraft } from "@/lib/hooks/use-notes-draft";
import { usePractice } from "@/lib/hooks/use-practice";
import { useReviewCard } from "@/lib/hooks/use-review-card";
import { usePracticeImport } from "@/lib/hooks/use-practice-import";
import { useProgress } from "@/lib/hooks/use-progress";
import { Dialog } from "@/components/ui/dialog";
import { toLanguageId } from "@/lib/languages";
import { utcOffsetMinutesFor } from "@/lib/practice/days";
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
  type WorkspaceMode,
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
import { ProblemPanel, type ProblemTab } from "./problem-panel";
import {
  ImportPracticeAlert,
  LoadErrorAlert,
  SaveConflictAlert,
} from "./save-status";
import type { RunState } from "./verdict-strip";
import { WorkspaceHeader } from "./workspace-header";
import { ReviewSession } from "./review-session";
import {
  AcceptedReviewOffer,
  ReviewNotesControls,
} from "./review-controls";
import { ReviewRatingDialog } from "./review-rating-dialog";

type Neighbour = Pick<ProblemSummary, "slug" | "title" | "number">;

/**
 * The left panel's widest allowance, and the width the dry run asks for.
 *
 * It stays a **string** because this API reads a bare number as pixels: passing
 * `maxSize={64}` caps the panel at 64 px, which starves it and leaves the
 * divider nothing to drag. Only the comparison below needs a number.
 */
const PROBLEM_PANEL_WIDE = "64";
const PROBLEM_PANEL_WIDE_PERCENT = Number(PROBLEM_PANEL_WIDE);

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
  /** Practice, accepted-code revise, or recall-first review session. */
  sessionMode: WorkspaceMode;
  /**
   * Solved as of the server render, so the header's solved mark and its Revise
   * action are there on the first paint. The practice fetch below has the
   * authoritative answer and wins once it arrives.
   */
  solved?: boolean;
};

export function Workspace({
  problem,
  previous,
  next,
  aiMode,
  runner,
  sessionMode,
  solved: solvedOnServer = false,
}: WorkspaceProps) {
  const revision = sessionMode === "revise";
  const review = sessionMode === "review";
  const isWide = useIsWideLayout();
  const { markAccepted } = useProgress();
  const practice = usePractice(problem, {
    bufferMode: sessionMode === "practice" ? "persistent" : "temporary",
    temporarySeed: review ? "starter" : "accepted",
  });
  const chat = useChatWorkspace(problem.slug);
  /**
   * The AI notes preview. It lives here, not in the Notes tab, for two reasons:
   * a tab switch must not throw a preview away, and leaving the problem must
   * cancel a generation in flight. Both are this component's lifecycle.
   */
  const notesDraft = useNotesDraft({
    slug: problem.slug,
    notes: practice.notes,
    onNotesChange: practice.onNotesChange,
  });
  const importer = usePracticeImport({
    onImported: practice.retryLoad,
  });

  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [consoleMinimized, setConsoleMinimized] = useState(false);
  const [acceptedReviewOffer, setAcceptedReviewOffer] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [problemTab, setProblemTab] = useState<ProblemTab>("description");
  const ratingTriggerRef = useRef<HTMLElement | null>(null);
  const reviewSchedule = useReviewCard(problem.slug);
  const { closeRating, openRating } = reviewSchedule;
  const consolePanelRef = usePanelRef();
  const problemPanelRef = usePanelRef();
  /** The left panel's width before a trace widened it, as a percentage string. */
  const panelSizeBeforeTrace = useRef<string | null>(null);

  const runSummary =
    runState.status === "done" ? summarizeRun(runState.result) : undefined;
  const submissionId =
    runState.status === "done" ? runState.result.submissionId : undefined;
  const handleRatingDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setRatingDialogOpen(true);
      } else if (closeRating()) {
        setRatingDialogOpen(false);
        window.requestAnimationFrame(() => {
          const trigger = ratingTriggerRef.current;
          if (trigger?.isConnected) {
            trigger.focus();
            return;
          }

          const reviewHeading = document.querySelector<HTMLElement>(
            '[aria-labelledby="review-session-title"] h2',
          );
          const scheduleHeading = document.querySelector<HTMLElement>(
            '[aria-labelledby="review-schedule-title"] h3',
          );
          const notesTab = Array.from(
            document.querySelectorAll<HTMLElement>('[role="tab"]'),
          ).find((tab) => tab.innerText.trim() === "Notes");
          const fallback = [reviewHeading, scheduleHeading, notesTab].find(
            (element) => element && element.getClientRects().length > 0,
          );
          fallback?.focus();
        });
      }
    },
    [closeRating],
  );
  const openInitialRating: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    ratingTriggerRef.current = event.currentTarget;
    openRating("initial", submissionId);
  };
  const openRecallRating: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    ratingTriggerRef.current = event.currentTarget;
    openRating("recall", submissionId);
  };

  /**
   * One request, assembled from what is on screen right now.
   *
   * The conversation is only attached once it has messages: a fresh chat holds
   * a client-generated id that no row matches yet, and there is nothing in it to
   * summarize. The run is attached only when this session persisted one. The
   * server omits whichever is absent and rejects one that belongs to another
   * problem.
   */
  const generateNotesDraft = useCallback(() => {
    notesDraft.generate({
      language: practice.language.id,
      source: practice.source,
      threadId:
        chat.messages.length > 0 ? (chat.threadId ?? undefined) : undefined,
      submissionId,
    });
  }, [
    chat.messages.length,
    chat.threadId,
    notesDraft,
    practice.language.id,
    practice.source,
    submissionId,
  ]);

  const solved = practice.progress.status === "solved" || solvedOnServer;

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
            // The streak is counted in the viewer's own days, so the client
            // says where its clock is rather than leaving the server to guess.
            utcOffsetMinutes: utcOffsetMinutesFor(),
            sessionMode,
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
          setAcceptedReviewOffer(true);
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
      setAcceptedReviewOffer,
      sessionMode,
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

  /** The panel keeps owning which tab is active; this only mirrors it. */
  const handleProblemTabChange = useCallback((tab: ProblemTab) => {
    setProblemTab(tab);
  }, []);

  /**
   * A dry run wants width — Python Tutor draws code beside data — so the left
   * panel takes its full allowance while the Visualize tab is showing, and goes
   * back to whatever it was when you leave.
   */
  useEffect(() => {
    const panel = problemPanelRef.current;
    if (!panel || !isWide) return;

    if (problemTab === "visualize") {
      const current = panel.getSize().asPercentage;
      if (current >= PROBLEM_PANEL_WIDE_PERCENT) return;
      panelSizeBeforeTrace.current = `${current}%`;
      panel.resize(PROBLEM_PANEL_WIDE);
      return;
    }

    const previous = panelSizeBeforeTrace.current;
    if (previous === null) return;
    panelSizeBeforeTrace.current = null;
    panel.resize(previous);
  }, [isWide, problemTab, problemPanelRef]);

  const loadSource = useCallback(
    (source: string, languageId: string) => {
      const language = toLanguageId(languageId);
      if (!language || language === practice.language.id) {
        practice.onCodeChange(source);
        return;
      }

      if (practice.bufferMode === "temporary") {
        practice.onLanguageChange(language, source);
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

  const showAcceptedReviewOffer =
    !review &&
    acceptedReviewOffer &&
    (reviewSchedule.status !== "ready" || !reviewSchedule.card.enrolled);

  const banners =
    review ||
    revision ||
    showAcceptedReviewOffer ||
    importer.visible ||
    practice.loadError ||
    practice.draftConflict ||
    practice.notesConflict ? (
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2">
      {review ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2">
            <p className="text-xs text-foreground/90">
              <span className="font-mono text-[11px] text-primary">review</span>{" "}
              Recall the key idea, outline the steps, then try coding. The code
              buffer restarts on refresh.
            </p>
            <Link
              href={`/problems/${problem.slug}`}
              className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              leave review mode
            </Link>
          </div>
      ) : null}
        {showAcceptedReviewOffer ? (
          <AcceptedReviewOffer
            schedule={reviewSchedule}
            onOpenRating={openInitialRating}
          />
        ) : null}
        {revision ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2">
            <RotateCcwIcon className="size-3.5 shrink-0 text-primary" />
            <p className="text-xs text-foreground/90">
              <span className="font-mono text-[11px] text-primary">
                revising
              </span>{" "}
              {/* A revise link on a problem with no accepted solution is still
                  valid — it just has nothing to start from, so the banner says
                  what the buffer actually is instead of promising code that is
                  not there. */}
              {practice.accepted
                ? "— the editor holds a copy of your accepted solution, and the draft you wrote the first time is untouched."
                : "— nothing has been accepted here yet, so the editor starts from your draft."}
              {practice.progress.solvedAt
                ? ` Solved ${new Date(practice.progress.solvedAt).toLocaleDateString()}.`
                : ""}{" "}
              A Submit here is recorded as a revision and never unsolves it.
            </p>
            <Link
              href={`/problems/${problem.slug}`}
              className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              leave revise mode
            </Link>
          </div>
        ) : null}
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
      notesDraft={notesDraft}
      onGenerateNotesDraft={generateNotesDraft}
      reviewControls={
        <ReviewNotesControls
          slug={problem.slug}
          schedule={reviewSchedule}
          onOpenRating={openInitialRating}
        />
      }
      simulated={runner === "mock"}
      review={review}
      reviewContent={
        review ? (
          <ReviewSession
            schedule={reviewSchedule}
            onFinishReview={openRecallRating}
          />
        ) : undefined
      }
      chat={
        <AiChatPane
          problem={problem}
          language={practice.language}
          code={practice.source}
          runSummary={runSummary}
          submissionId={submissionId}
          aiMode={aiMode}
          workspace={chat}
        />
      }
      language={practice.language}
      source={practice.source}
      testcaseIndex={testcaseIndex}
      onTestcaseChange={setTestcaseIndex}
      onTabChange={handleProblemTabChange}
    />
  );

  const editorPane = (
    <CodeEditorPane
      slug={problem.slug}
      sessionKey={sessionMode}
      value={practice.source}
      language={practice.language.id}
      monacoLanguage={practice.language.monacoId}
      onValueChange={practice.onCodeChange}
      onLanguageChange={practice.onLanguageChange}
      onReset={practice.onReset}
      onRun={() => {
        void run("run");
      }}
      saveStatus={
        practice.bufferMode === "temporary" ? "idle" : practice.draftStatus
      }
      onRetrySave={
        practice.bufferMode === "temporary" ? undefined : practice.retryDraftSave
      }
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
    <Dialog
      open={ratingDialogOpen}
      onOpenChange={handleRatingDialogOpenChange}
    >
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <WorkspaceHeader
        problem={problem}
        previous={previous}
        next={next}
        solved={solved}
        revision={revision}
        review={review}
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
            maxSize={PROBLEM_PANEL_WIDE}
            panelRef={problemPanelRef}
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
      <ReviewRatingDialog
        problem={{ number: problem.number, title: problem.title }}
        schedule={reviewSchedule}
        onOpenChange={handleRatingDialogOpenChange}
      />
    </Dialog>
  );
}
