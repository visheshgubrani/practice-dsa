"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Problem, SolutionNotes } from "@/lib/problems";

import { ProblemStatement } from "./problem-statement";
import { SolutionNotesPanel, type AcceptedSolution } from "./solution-notes";

export type ProblemPanelProps = {
  problem: Problem;
  notes: SolutionNotes;
  onNotesChange: (notes: SolutionNotes) => void;
  accepted: AcceptedSolution;
  onLoadAccepted: () => void;
  /** The chat pane, kept mounted so a streaming answer survives tab switches. */
  chat: React.ReactNode;
};

export function ProblemPanel({
  problem,
  notes,
  onNotesChange,
  accepted,
  onLoadAccepted,
  chat,
}: ProblemPanelProps) {
  const [tab, setTab] = useState("description");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as string)}
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
    </Tabs>
  );
}
