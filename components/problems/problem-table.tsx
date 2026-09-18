"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckIcon, SearchIcon } from "lucide-react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
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
import { useProgress } from "@/lib/hooks/use-progress";
import type { ProblemSummary } from "@/lib/problems";
import { cn } from "@/lib/utils";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTY_ITEMS: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function ProblemTable({ problems }: { problems: ProblemSummary[] }) {
  const { progress, hydrated } = useProgress();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [tag, setTag] = useState("all");

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
      if (difficulty !== "all" && problem.difficulty !== difficulty) return false;
      if (tag !== "all" && !problem.tags.includes(tag)) return false;
      if (needle.length === 0) return true;
      return (
        problem.title.toLowerCase().includes(needle) ||
        String(problem.number) === needle ||
        problem.tags.some((problemTag) => problemTag.includes(needle))
      );
    });
  }, [difficulty, problems, query, tag]);

  const solvedCount = problems.filter((problem) => progress[problem.slug]).length;
  const filtersActive =
    query.trim().length > 0 || difficulty !== "all" || tag !== "all";

  function clearFilters() {
    setQuery("");
    setDifficulty("all");
    setTag("all");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 pt-7 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-mono text-2xl font-medium tracking-tight">
                dsa<span className="text-primary">.</span>
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-[3px]" aria-hidden>
                  {problems.map((problem) => (
                    <span
                      key={problem.slug}
                      className={cn(
                        "h-1 w-5 rounded-full transition-colors",
                        progress[problem.slug] ? "bg-success" : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {hydrated ? solvedCount : 0} of {problems.length} solved
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-72">
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
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <Empty className="h-full">
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
                  <TableHead className="font-mono text-xs">Tags</TableHead>
                  <TableHead className="w-20 text-right font-mono text-xs">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((problem) => {
                  const solved = Boolean(progress[problem.slug]);
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
                        {hydrated && solved ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                            <CheckIcon className="size-3.5" />
                            solved
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground/60">
                            —
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
