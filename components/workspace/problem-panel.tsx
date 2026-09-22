"use client";

import { useState } from "react";
import { FootprintsIcon, SparklesIcon } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SaveStatus } from "@/lib/hooks/use-practice";
import type { Language } from "@/lib/languages";
import type { LegacySnapshot } from "@/lib/practice/types";
import type { Problem, SolutionNotes } from "@/lib/problems";

import { ProblemStatement } from "./problem-statement";
import { SolutionNotesPanel, type AcceptedSolution } from "./solution-notes";
import { VisualizePanel } from "./visualize-panel";

/** Which tab is showing. Exported so the workspace can size the panel around it. */
export type ProblemTab = "description" | "solution" | "chat" | "visualize";

export type ProblemPanelProps = {
  problem: Problem;
  notes: SolutionNotes;
  onNotesChange: (notes: SolutionNotes) => void;
  accepted: AcceptedSolution;
  onLoadAccepted: () => void;
  legacySnapshot?: LegacySnapshot | null;
  onLoadLegacy?: () => void;
  notesSaveStatus?: SaveStatus;
  onRetryNotesSave?: () => void;
  /** True when Run and Submit are answered without executing anything. */
  simulated?: boolean;
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
  simulated = false,
  chat,
  language,
  source,
  testcaseIndex,
  onTestcaseChange,
  onTabChange,
}: ProblemPanelProps) {
  const [tab, setTab] = useState<ProblemTab>("description");

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
      <div className="flex h-[34px] shrink-0 items-center border-b border-border bg-panel-2 px-2">
        <TabsList className="h-[26px]">
          <TabsTrigger
            value="description"
            className="px-2.5 font-mono text-[11px]"
          >
            Description
          </TabsTrigger>
          <TabsTrigger value="solution" className="px-2.5 font-mono text-[11px]">
            Solution
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
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="p-4 pb-10">
            <ProblemStatement problem={problem} />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="solution" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 pb-10">
            <SolutionNotesPanel
              notes={notes}
              onNotesChange={onNotesChange}
              accepted={accepted}
              onLoadAccepted={onLoadAccepted}
              legacySnapshot={legacySnapshot}
              onLoadLegacy={onLoadLegacy}
              saveStatus={notesSaveStatus}
              onRetrySave={onRetryNotesSave}
              simulated={simulated}
            />
          </div>
        </ScrollArea>
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
