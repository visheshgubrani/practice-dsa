"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

import { ReviseButton } from "@/components/problems/revise-button";
import { DIFFICULTY_LABEL, type Difficulty, type ProblemSummary } from "@/lib/problems";
import type { ProblemStatus, TopicProgress } from "@/lib/progress/summary";
import { formatCount, percentSolved } from "@/lib/progress/summary";
import { cn } from "@/lib/utils";

/**
 * One roadmap topic: how far through it you are, then the problems in it.
 *
 * A plain disclosure rather than a collapse primitive — `components/ui` has no
 * collapsible component, and this is a button that shows and hides a list. The
 * panel is re-rendered rather than removed so a hidden section costs nothing
 * when it is open and loses no state when it is not.
 *
 * Sections start expanded, and the choice is the reader's: deriving the initial
 * state from solved counts would make the server and client disagree about what
 * an untouched group looks like, and "collapsed because you finished it" hides
 * exactly the problems worth revising.
 */

const DOT_TONE: Record<Difficulty, string> = {
  easy: "bg-difficulty-easy",
  medium: "bg-difficulty-medium",
  hard: "bg-difficulty-hard",
};

export function TopicSection({
  topic,
  statuses,
}: {
  topic: TopicProgress;
  statuses: Map<string, ProblemStatus>;
}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const percent = percentSolved(topic);
  const complete = topic.total > 0 && topic.solved === topic.total;

  return (
    <section className="rounded-lg border border-border bg-panel">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left",
          "hover:bg-panel-2/60 focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />

        <h2 className="font-mono text-xs font-medium tracking-tight">
          {topic.topic}
        </h2>

        {complete ? (
          <span className="flex items-center gap-1 font-mono text-[11px] text-success">
            <CheckIcon className="size-3" />
            complete
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <div
            className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${topic.topic}: ${formatCount(topic)} solved`}
          >
            <div
              className={cn(
                "h-full rounded-full",
                complete ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">
            {formatCount(topic)}
          </span>
        </div>
      </button>

      <div id={panelId} hidden={!open}>
        {topic.problems.length === 0 ? (
          <p className="border-t border-border px-4 py-3 font-mono text-[11px] text-muted-foreground">
            No problems in this topic yet.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {topic.problems.map((problem) => (
              <ProblemRow
                key={problem.slug}
                problem={problem}
                status={statuses.get(problem.slug) ?? "todo"}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProblemRow({
  problem,
  status,
}: {
  problem: ProblemSummary;
  status: ProblemStatus;
}) {
  const solved = status === "solved";

  return (
    <li className="group flex items-center gap-3 px-4 py-2 hover:bg-panel-2/50">
      <span className="w-10 shrink-0 font-mono text-[11px] text-muted-foreground/70">
        {problem.number}
      </span>

      <Link
        href={`/problems/${problem.slug}`}
        className="min-w-0 flex-1 truncate text-sm text-foreground underline-offset-4 group-hover:text-primary group-hover:underline"
      >
        {problem.title}
      </Link>

      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", DOT_TONE[problem.difficulty])}
        />
        {DIFFICULTY_LABEL[problem.difficulty]}
      </span>

      {solved ? (
        <>
          <span className="flex w-16 shrink-0 items-center justify-end gap-1 font-mono text-[11px] text-success">
            <CheckIcon className="size-3.5" />
            solved
          </span>
          <ReviseButton slug={problem.slug} title={`Revise ${problem.title}`} />
        </>
      ) : (
        <span className="w-16 shrink-0 text-right font-mono text-[11px] text-muted-foreground/60">
          {status === "attempted" ? "attempted" : "—"}
        </span>
      )}
    </li>
  );
}
