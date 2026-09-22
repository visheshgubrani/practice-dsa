"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  caseLabel,
  summarizeRun,
  VERDICT_LABEL,
  verdictTone,
  type RunResult,
  type VerdictTone,
} from "@/lib/runner/types";

export type RunState =
  | { status: "idle" }
  | { status: "running"; mode: "run" | "submit" }
  | { status: "done"; result: RunResult }
  | { status: "error"; mode: "run" | "submit"; message: string };

const TONE_TEXT: Record<VerdictTone, string> = {
  success: "text-success",
  danger: "text-destructive",
  info: "text-info",
};

const TONE_RULE: Record<VerdictTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  info: "bg-info",
};

function CopyOutputButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label="Copy console output"
      className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-success" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}

function outputTextFor(runState: RunState): string {
  if (runState.status === "error") return runState.message;
  if (runState.status !== "done") return "";
  const { result } = runState;
  const lines: string[] = [VERDICT_LABEL[result.verdict], summarizeRun(result)];
  if (result.compileOutput) lines.push("", result.compileOutput);
  for (const entry of result.cases) {
    lines.push("", `${caseLabel(entry)}: ${VERDICT_LABEL[entry.status]}`);
    if (entry.stdout !== undefined) lines.push(`output:   ${entry.stdout}`);
    if (entry.debug) lines.push(`debug:    ${entry.debug}`);
    if (entry.expected !== undefined && entry.stdout !== entry.expected) {
      lines.push(`expected: ${entry.expected}`);
    }
    if (entry.stderr) lines.push(`stderr:   ${entry.stderr}`);
  }
  return lines.join("\n");
}

/**
 * The strip is the console's permanent 34px face: tabs on the left, live
 * verdict in the middle, controls on the right. It is never hidden, which is
 * why minimizing resizes the console panel down to this height rather than
 * collapsing the panel away.
 */
export function VerdictStrip({
  runState,
  simulated,
  className,
}: {
  runState: RunState;
  /** True when runs are answered without executing anything. */
  simulated: boolean;
  className?: string;
}) {
  const tone: VerdictTone =
    runState.status === "done"
      ? verdictTone(runState.result.verdict)
      : runState.status === "error"
        ? "danger"
        : runState.status === "running"
          ? "info"
          : "info";

  /** Which engine judged the newest run, when one did. */
  const engineLabel =
    runState.status === "done" && runState.result.pistonVersion
      ? `Python ${runState.result.pistonVersion}`
      : "Piston";

  const verdictText =
    runState.status === "idle"
      ? "No runs yet"
      : runState.status === "running"
        ? runState.mode === "submit"
          ? "Submitting…"
          : "Running…"
        : runState.status === "error"
          ? "Run failed"
          : VERDICT_LABEL[runState.result.verdict];

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border px-2 font-mono text-[11px]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-3.5 w-[2px] shrink-0 rounded-full",
          runState.status === "idle" ? "bg-border" : TONE_RULE[tone],
        )}
      />
      <div className="flex min-w-0 items-center gap-2" aria-live="polite">
        {runState.status === "running" ? (
          <Loader2Icon className="size-3.5 shrink-0 animate-spin text-info" />
        ) : null}
        <span
          className={cn(
            "truncate font-medium",
            runState.status === "idle"
              ? "text-muted-foreground"
              : TONE_TEXT[tone],
          )}
        >
          {verdictText}
        </span>
        {runState.status === "done" && (
          <>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span className="shrink-0 text-muted-foreground">
              {runState.result.passedCount}/{runState.result.totalCount} cases
            </span>
            {runState.result.timeMs !== undefined && (
              <span className="hidden shrink-0 text-muted-foreground sm:inline">
                {runState.result.timeMs} ms
              </span>
            )}
            {runState.result.memoryKb !== undefined && (
              <span className="hidden shrink-0 text-muted-foreground md:inline">
                {(runState.result.memoryKb / 1024).toFixed(1)} MB
              </span>
            )}
          </>
        )}
        {runState.status === "error" && (
          <span className="truncate text-muted-foreground">
            {runState.message}
          </span>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {simulated ? (
          <Badge
            variant="outline"
            className="border-difficulty-medium/40 bg-difficulty-medium/10 font-mono text-[10px] text-difficulty-medium"
            title="Mock runs are simulated: nothing was executed, no history row is written, and a problem is never marked solved."
          >
            simulated
          </Badge>
        ) : (
          <span
            className="hidden font-mono text-[10px] text-muted-foreground sm:inline"
            title="The Python runtime that produced this verdict."
          >
            {engineLabel}
          </span>
        )}
        {runState.status === "done" && runState.result.persisted === false ? (
          <Badge
            variant="outline"
            className="border-destructive/40 bg-destructive/10 font-mono text-[10px] text-destructive"
            title="The verdict is shown, but the history row was not written. This does not count as durable progress."
          >
            not saved
          </Badge>
        ) : null}
        {(runState.status === "done" || runState.status === "error") && (
          <CopyOutputButton text={outputTextFor(runState)} />
        )}
      </div>
    </div>
  );
}
