"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Problem } from "@/lib/problems";
import { caseLabel, VERDICT_LABEL, verdictTone } from "@/lib/runner/types";
import { cn } from "@/lib/utils";

import type { RunState } from "./verdict-strip";
import { VerdictStrip } from "./verdict-strip";

export type ConsoleTab = "testcase" | "result";

const TONE_TEXT = {
  success: "text-success",
  danger: "text-destructive",
  info: "text-info",
} as const;

function CaseList({ runState }: { runState: RunState }) {
  if (runState.status !== "done") return null;

  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {runState.result.cases.map((entry) => (
        <li key={`${entry.hidden ? "hidden" : "visible"}-${entry.index}`} className="flex flex-col gap-1.5 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11.5px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                TONE_TEXT[verdictTone(entry.status)],
              )}
            >
              {entry.status === "accepted" ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <XIcon className="size-3.5" />
              )}
              {VERDICT_LABEL[entry.status]}
            </span>
            <span className="text-muted-foreground">{caseLabel(entry)}</span>
            {entry.timeMs !== undefined && (
              <span className="ml-auto text-muted-foreground">
                {entry.timeMs} ms
              </span>
            )}
          </div>

          {entry.debug && (
            <div className="rounded-md border border-border bg-background p-2.5 font-mono text-[11.5px]">
              <span className="text-muted-foreground">debug</span>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-foreground/80">
                {entry.debug}
              </pre>
            </div>
          )}

          {entry.status !== "accepted" &&
            (entry.input !== undefined ||
              entry.expected !== undefined ||
              entry.stdout !== undefined ||
              entry.stderr) && (
            <div className="grid gap-2 rounded-md border border-border bg-background p-2.5 font-mono text-[11.5px] md:grid-cols-2">
              {entry.input !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">input</span>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-foreground/90">
                    {entry.input}
                  </pre>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {entry.expected !== undefined && (
                  <>
                    <span className="text-muted-foreground">expected</span>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-success">
                      {entry.expected}
                    </pre>
                  </>
                )}
                {entry.stdout !== undefined && (
                  <>
                    <span className="mt-1 text-muted-foreground">output</span>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-destructive">
                      {entry.stdout.length > 0 ? entry.stdout : "(empty)"}
                    </pre>
                  </>
                )}
              </div>
              {entry.stderr && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">stderr</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-destructive/90">
                    {entry.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ConsolePanel({
  problem,
  runState,
  tab,
  onTabChange,
  testcaseIndex,
  onTestcaseChange,
  minimized,
  onToggleMinimize,
  onRun,
  simulated,
}: {
  problem: Problem;
  runState: RunState;
  tab: ConsoleTab;
  onTabChange: (tab: ConsoleTab) => void;
  testcaseIndex: number;
  onTestcaseChange: (index: number) => void;
  minimized: boolean;
  onToggleMinimize: () => void;
  onRun: () => void;
  /** True when the console is showing verdicts that were not executed. */
  simulated: boolean;
}) {
  const testcase = problem.testcases[testcaseIndex];

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as ConsoleTab)}
      className="flex h-full min-h-0 flex-col gap-0 bg-panel"
    >
      <div className="flex h-[34px] shrink-0 items-center gap-3 border-b border-border bg-panel-2 px-2">
        <TabsList className="h-[26px] shrink-0">
          <TabsTrigger
            value="testcase"
            className="px-2.5 font-mono text-[11px]"
          >
            Testcase
          </TabsTrigger>
          <TabsTrigger value="result" className="px-2.5 font-mono text-[11px]">
            Test Result
          </TabsTrigger>
        </TabsList>

        <VerdictStrip
          runState={runState}
          simulated={simulated}
          className="min-w-0 flex-1 border-t-0 px-0"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={minimized ? "Expand console" : "Minimize console"}
          aria-expanded={!minimized}
          onClick={onToggleMinimize}
        >
          <ChevronDownIcon
            className={cn("transition-transform", minimized && "rotate-180")}
          />
        </Button>
      </div>

      <TabsContent
        value="testcase"
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[String(testcaseIndex)]}
            onValueChange={(next) => {
              const value = next[0];
              if (value !== undefined) onTestcaseChange(Number(value));
            }}
            size="sm"
            spacing={1}
          >
            {problem.testcases.map((_, index) => (
              <ToggleGroupItem
                key={index}
                value={String(index)}
                className="px-2 font-mono text-[11px]"
              >
                Case {index + 1}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="font-mono text-[11px] text-muted-foreground">
            run evaluates this case · submit evaluates the full suite
          </span>
        </div>

        {testcase ? (
          <label className="flex min-h-0 flex-1 flex-col gap-1.5">
            <span className="sr-only">Input for case {testcaseIndex + 1}</span>
            <Textarea
              readOnly
              value={testcase.stdin}
              rows={4}
              spellCheck={false}
              className="min-h-[76px] resize-none bg-background font-mono text-[12.5px] leading-[1.6]"
            />
          </label>
        ) : null}
      </TabsContent>

      <TabsContent
        value="result"
        className="min-h-0 flex-1 overflow-auto p-3"
      >
        {runState.status === "idle" && (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyTitle>No results yet</EmptyTitle>
              <EmptyDescription>
                Run your code against the selected case, or submit to judge the
                full suite.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" size="sm" onClick={onRun}>
              Run code
            </Button>
          </Empty>
        )}

        {runState.status === "running" && (
          <div className="flex items-center gap-2.5 py-2">
            <Spinner className="text-info" />
            <span className="shimmer font-mono text-xs text-muted-foreground">
              {runState.mode === "submit"
                ? "Submitting against the full suite…"
                : "Running the selected case…"}
            </span>
          </div>
        )}

        {runState.status === "error" && (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <span className="font-mono text-xs font-medium text-destructive">
              The run could not be executed
            </span>
            <p className="font-mono text-[11.5px] text-muted-foreground">
              {runState.message}
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={onRun}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {runState.status === "done" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-sm font-medium",
                  TONE_TEXT[verdictTone(runState.result.verdict)],
                )}
              >
                {VERDICT_LABEL[runState.result.verdict]}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {runState.result.mode === "submit" ? "submission" : "run"} ·{" "}
                {new Date(runState.result.at).toLocaleTimeString()}
              </span>
            </div>

            {runState.result.compileOutput && (
              <pre className="overflow-x-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-[11.5px] whitespace-pre-wrap text-destructive/90">
                {runState.result.compileOutput}
              </pre>
            )}

            <CaseList runState={runState} />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
