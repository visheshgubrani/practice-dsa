"use client";

import Link from "next/link";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
} from "lucide-react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { ReviseButton } from "@/components/problems/revise-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Problem, ProblemSummary } from "@/lib/problems";
import { cn } from "@/lib/utils";

import { AppHeader } from "./app-header";

type Neighbour = Pick<ProblemSummary, "slug" | "title" | "number">;

function NeighbourLink({
  target,
  direction,
}: {
  target?: Neighbour;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeftIcon : ChevronRightIcon;

  if (!target) {
    return (
      <span
        aria-hidden
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "pointer-events-none opacity-35",
        )}
      >
        <Icon />
      </span>
    );
  }

  return (
    <Link
      href={`/problems/${target.slug}`}
      aria-label={`${direction === "previous" ? "Previous" : "Next"} problem: ${target.title}`}
      title={`${target.number}. ${target.title}`}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
    >
      <Icon />
    </Link>
  );
}

export function WorkspaceHeader({
  problem,
  previous,
  next,
  solved,
  revision = false,
  busyMode,
  onRun,
  onSubmit,
}: {
  problem: Problem;
  previous?: Neighbour;
  next?: Neighbour;
  solved: boolean;
  /** True while this workspace is a revise session. */
  revision?: boolean;
  /** Non-null while a run or submit is in flight. */
  busyMode: "run" | "submit" | null;
  onRun: () => void;
  onSubmit: () => void;
}) {
  const busy = busyMode !== null;

  return (
    <AppHeader>
      <NeighbourLink target={previous} direction="previous" />
      <NeighbourLink target={next} direction="next" />

      <div className="ml-1 flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {problem.number}.
        </span>
        <h1 className="truncate text-sm font-medium">{problem.title}</h1>
        <DifficultyBadge difficulty={problem.difficulty} className="shrink-0" />
        {solved && (
          <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-success sm:inline-flex">
            <CheckIcon className="size-3.5" />
            {revision ? "solved · revising" : "solved"}
          </span>
        )}
        <div className="hidden min-w-0 items-center gap-1 lg:flex">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
        {solved && !revision ? (
          <ReviseButton
            slug={problem.slug}
            label="Revise"
            title={`Revise ${problem.title} — reopen it for another pass`}
            variant="outline"
          />
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-busy={busyMode === "run"}
          onClick={onRun}
        >
          {busyMode === "run" ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlayIcon data-icon="inline-start" />
          )}
          Run
        </Button>
        <Button
          size="sm"
          disabled={busy}
          aria-busy={busyMode === "submit"}
          onClick={onSubmit}
        >
          {busyMode === "submit" ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Submit
        </Button>
      </div>
    </AppHeader>
  );
}
