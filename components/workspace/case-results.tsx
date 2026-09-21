"use client";

import { CheckIcon, XIcon } from "lucide-react";

import { caseLabel, VERDICT_LABEL, verdictTone, type CaseResult } from "@/lib/runner/types";
import { cn } from "@/lib/utils";

const TONE_TEXT = {
  success: "text-success",
  danger: "text-destructive",
  info: "text-info",
} as const;

export function CaseResults({ cases }: { cases: CaseResult[] }) {
  if (cases.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {cases.map((entry) => (
        <li
          key={`${entry.hidden ? "hidden" : "visible"}-${entry.index}`}
          className="flex flex-col gap-1.5 py-2.5"
        >
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
