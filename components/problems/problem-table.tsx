"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckIcon, SearchIcon } from "lucide-react";

import { CatalogHeader } from "@/components/problems/catalog-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { ReviseButton } from "@/components/problems/revise-button";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DashboardTotals } from "@/lib/db/queries/dashboard";
import { useProgress } from "@/lib/hooks/use-progress";
import type { ProblemSummary } from "@/lib/problems";
import type { DayCell } from "@/lib/progress/calendar";
import type { ProblemStatus, ProgressSummary } from "@/lib/progress/summary";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTY_ITEMS: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function ProblemTable({
  problems,
  summary,
  strip,
  totals,
  statuses = {},
}: {
  problems: ProblemSummary[];
  summary: ProgressSummary;
  strip: DayCell[];
  totals: DashboardTotals;
  /** `slug -> status`, so a solved tick is right before the browser hydrates. */
  statuses?: Record<string, ProblemStatus>;
}) {
  const { progress } = useProgress();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [tag, setTag] = useState("all");
  const [solvedOnly, setSolvedOnly] = useState(false);

  /**
   * Solved comes from Postgres; the browser's `dsa.progress` key only adds what
   * this session just accepted, so a tick appears the moment Submit lands while
   * the durable answer stays the database's. The key cannot be read on the
   * server — see `use-progress.ts` — so both sources are merged here rather
   * than either one being trusted alone.
   */
  const isSolved = useMemo(() => {
    const accepted = new Set(Object.keys(progress));
    const durable = new Set(
      Object.entries(statuses)
        .filter(([, status]) => status === "solved")
        .map(([slug]) => slug),
    );
    return (slug: string) => durable.has(slug) || accepted.has(slug);
  }, [progress, statuses]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const problem of problems) {
      for (const problemTag of problem.tags) seen.add(problemTag);
    }
    return [...seen].sort();
  }, [problems]);

  const tagItems = useMemo(
    () => [
      { value: "all", label: "All tags" },
      ...tags.map((value) => ({ value, label: value })),
    ],
    [tags],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return problems.filter((problem) => {
      if (solvedOnly && !isSolved(problem.slug)) return false;
      if (difficulty !== "all" && problem.difficulty !== difficulty) return false;
      if (tag !== "all" && !problem.tags.includes(tag)) return false;
      if (needle.length === 0) return true;
      return (
        problem.title.toLowerCase().includes(needle) ||
        String(problem.number) === needle ||
        problem.tags.some((problemTag) => problemTag.includes(needle))
      );
    });
  }, [difficulty, isSolved, problems, query, solvedOnly, tag]);

  const filtersActive =
    query.trim().length > 0 ||
    difficulty !== "all" ||
    tag !== "all" ||
    solvedOnly;

  function clearFilters() {
    setQuery("");
    setDifficulty("all");
    setTag("all");
    setSolvedOnly(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CatalogHeader
        counted={summary.overall}
        cells={strip}
        activeDays={strip.filter((cell) => cell.submits > 0).length}
      >
        <div className="relative w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, number, or tag"
            aria-label="Search problems"
            className="h-8 w-full pl-8 font-mono text-xs"
          />
        </div>
        <ToggleGroup
          value={[difficulty]}
          onValueChange={(next) => {
            const value = next[0] as DifficultyFilter | undefined;
            setDifficulty(value ?? "all");
          }}
          size="sm"
          className="rounded-md border border-border p-0.5"
        >
          {DIFFICULTY_ITEMS.map((item) => (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              className="px-2 font-mono text-xs"
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          variant={solvedOnly ? "secondary" : "outline"}
          size="sm"
          aria-pressed={solvedOnly}
          onClick={() => setSolvedOnly((previous) => !previous)}
          className="font-mono text-xs"
        >
          <CheckIcon data-icon="inline-start" />
          Solved
        </Button>
        <Select
          items={tagItems}
          value={tag}
          onValueChange={(value) => setTag(value as string)}
        >
          <SelectTrigger size="sm" aria-label="Filter by tag">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tagItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-6 py-3 font-mono text-[11px] text-muted-foreground">
          <span>
            {filtered.length === problems.length
              ? `${problems.length} problems`
              : `${filtered.length} of ${problems.length} problems`}
          </span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>
            {totals.submits} verified submits
            {totals.revisions > 0
              ? ` · ${totals.revisions} revision${totals.revisions === 1 ? "" : "s"}`
              : ""}
          </span>
          <span className="ml-auto">
            solved is read from the database, so it survives a restart
          </span>
        </div>

        {filtered.length === 0 ? (
          <Empty className="h-[60%]">
            <EmptyHeader>
              <EmptyTitle>No problems match those filters</EmptyTitle>
              <EmptyDescription>
                {problems.length} problems are seeded right now. Widen the
                search to see them all.
              </EmptyDescription>
            </EmptyHeader>
            {filtersActive && (
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="mx-auto w-full max-w-[1180px] px-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 font-mono text-xs">#</TableHead>
                  <TableHead className="font-mono text-xs">Title</TableHead>
                  <TableHead className="w-28 font-mono text-xs">
                    Difficulty
                  </TableHead>
                  <TableHead className="w-44 font-mono text-xs">Topic</TableHead>
                  <TableHead className="font-mono text-xs">Tags</TableHead>
                  <TableHead className="w-28 text-right font-mono text-xs">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((problem) => {
                  const solved = isSolved(problem.slug);
                  return (
                    <TableRow key={problem.slug} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {problem.number}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/problems/${problem.slug}`}
                          className="text-sm font-medium text-foreground underline-offset-4 group-hover:text-primary group-hover:underline"
                        >
                          {problem.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {problem.topic}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {problem.tags.map((problemTag) => (
                            <span
                              key={problemTag}
                              className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {problemTag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {solved ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                              <CheckIcon className="size-3.5" />
                              solved
                            </span>
                            <ReviseButton
                              slug={problem.slug}
                              title={`Revise ${problem.title}`}
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground/60">
                            {statuses?.[problem.slug] === "attempted"
                              ? "attempted"
                              : "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
