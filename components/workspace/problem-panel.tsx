"use client";

import { useState } from "react";
import { FootprintsIcon, SparklesIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NotesDraftController } from "@/lib/hooks/use-notes-draft";
import type { SaveStatus } from "@/lib/hooks/use-practice";
import type { Language } from "@/lib/languages";
import type { LegacySnapshot } from "@/lib/practice/types";
import type { PersonalNotes } from "@/lib/practice/notes";
import type { Problem } from "@/lib/problems";

import { PersonalNotesPanel } from "./personal-notes";
import { ProblemStatement } from "./problem-statement";
import { SolutionPanel, type AcceptedSolution } from "./solution-notes";
import { VisualizePanel } from "./visualize-panel";

/** Which tab is showing. Exported so the workspace can size the panel around it. */
export type ProblemTab =
  | "description"
  | "solution"
  | "notes"
  | "chat"
  | "visualize";

export type ProblemPanelProps = {
  problem: Problem;
  notes: PersonalNotes;
  onNotesChange: (notes: PersonalNotes) => void;
  accepted: AcceptedSolution;
  onLoadAccepted: () => void;
  legacySnapshot?: LegacySnapshot | null;
  onLoadLegacy?: () => void;
  notesSaveStatus?: SaveStatus;
  onRetryNotesSave?: () => void;
  /** The AI preview, owned by the workspace so it survives a tab switch. */
  notesDraft?: NotesDraftController;
  onGenerateNotesDraft?: () => void;
  reviewControls?: React.ReactNode;
  /** True when Run and Submit are answered without executing anything. */
  simulated?: boolean;
  /** Review sessions gate saved notes and solution content behind explicit reveals. */
  review?: boolean;
  reviewContent?: React.ReactNode;
  /** The chat pane, kept mounted so a streaming answer survives tab switches. */
  chat: React.ReactNode;
  /** The buffer and the case selected in the console, for the dry run. */
  language: Language;
  source: string;
  testcaseIndex: number;
  onTestcaseChange: (index: number) => void;
  /**
   * Which tab is showing. The workspace only *reads* this — the panel keeps
   * owning the state — because a trace wants a wider panel than the rest.
   */
  onTabChange?: (tab: ProblemTab) => void;
};

export function ProblemPanel({
  problem,
  notes,
  onNotesChange,
  accepted,
  onLoadAccepted,
  legacySnapshot,
  onLoadLegacy,
  notesSaveStatus,
  onRetryNotesSave,
  notesDraft,
  onGenerateNotesDraft,
  reviewControls,
  simulated = false,
  review = false,
  reviewContent,
  chat,
  language,
  source,
  testcaseIndex,
  onTestcaseChange,
  onTabChange,
}: ProblemPanelProps) {
  const [tab, setTab] = useState<ProblemTab>("description");
  const [showNotes, setShowNotes] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = value as ProblemTab;
        setTab(next);
        onTabChange?.(next);
      }}
      className="flex h-full min-h-0 flex-col gap-0 bg-panel"
    >
      <div className="flex h-[34px] min-w-0 shrink-0 items-center overflow-x-auto border-b border-border bg-panel-2 px-2">
        <TabsList className="h-[26px] w-max shrink-0">
          <TabsTrigger
            value="description"
            className="px-2.5 font-mono text-[11px]"
          >
            Description
          </TabsTrigger>
          <TabsTrigger value="solution" className="px-2.5 font-mono text-[11px]">
            Solution
          </TabsTrigger>
          <TabsTrigger value="notes" className="px-2.5 font-mono text-[11px]">
            Notes
          </TabsTrigger>
          <TabsTrigger value="chat" className="px-2.5 font-mono text-[11px]">
            <SparklesIcon className="size-3" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger
            value="visualize"
            className="px-2.5 font-mono text-[11px]"
          >
            <FootprintsIcon className="size-3" />
            Visualize
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="description"
        keepMounted
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-5 p-4 pb-10">
            {reviewContent}
            <ProblemStatement problem={problem} />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="solution" className="min-h-0 flex-1 overflow-hidden">
        {review && !showSolution ? (
          <div className="p-4">
            <Alert>
              <AlertTitle>Saved solution hidden during recall</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>Open it only when you want help after trying from memory.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSolution(true)}
                >
                  Show saved solution
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 pb-10">
              <SolutionPanel
                guidance={problem.notes}
                accepted={accepted}
                onLoadAccepted={onLoadAccepted}
                legacySnapshot={legacySnapshot}
                onLoadLegacy={onLoadLegacy}
                simulated={simulated}
              />
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="notes" className="min-h-0 flex-1 overflow-hidden">
        {review && !showNotes ? (
          <div className="p-4">
            <Alert>
              <AlertTitle>Personal notes hidden during recall</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>Try recalling the approach before opening your writeup.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNotes(true)}
                >
                  Show notes
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 pb-10">
              <PersonalNotesPanel
                notes={notes}
                onNotesChange={onNotesChange}
                saveStatus={notesSaveStatus}
                onRetrySave={onRetryNotesSave}
                draft={notesDraft}
                onGenerateDraft={onGenerateNotesDraft}
                reviewControls={reviewControls}
              />
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent
        value="chat"
        keepMounted
        className="min-h-0 flex-1 overflow-hidden"
      >
        {chat}
      </TabsContent>

      {/* Kept mounted like the chat: stepping away to re-read the statement and
          coming back should not lose your place in the trace. */}
      <TabsContent
        value="visualize"
        keepMounted
        className="min-h-0 flex-1 overflow-hidden"
      >
        <VisualizePanel
          problem={problem}
          language={language}
          source={source}
          testcaseIndex={testcaseIndex}
          onTestcaseChange={onTestcaseChange}
          simulated={simulated}
        />
      </TabsContent>
    </Tabs>
  );
}
