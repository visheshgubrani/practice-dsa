"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckIcon, SearchIcon } from "lucide-react";

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
import {
  UNCATEGORIZED,
  type ProblemStatus,
  type ProgressSummary,
} from "@/lib/progress/summary";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTY_ITEMS: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const ALL_TOPICS = "all";

/** The topic a row belongs to, with a blank column reading as its own group. */
function topicOf(problem: ProblemSummary): string {
  return problem.topic.trim() === "" ? UNCATEGORIZED : problem.topic;
}

export function ProblemTable({
  problems,
  summary,
  totals,
  statuses = {},
}: {
  problems: ProblemSummary[];
  summary: ProgressSummary;
  totals: DashboardTotals;
  /** `slug -> status`, so a solved tick is right before the browser hydrates. */
  statuses?: Record<string, ProblemStatus>;
}) {
  const { progress } = useProgress();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [tag, setTag] = useState("all");
  const [solvedOnly, setSolvedOnly] = useState(false);

  const topics = useMemo(() => {
    const seen = new Set<string>();
    for (const problem of problems) seen.add(topicOf(problem));
    return [...seen];
  }, [problems]);

  /**
   * The topic lives in the URL, so a dashboard row can deep-link into a
   * filtered list and browser Back restores what was there. The param is
   * validated against the catalog: a hand-edited or stale value reads as "all
   * topics" rather than an empty list.
   */
  const requestedTopic = searchParams.get("topic");
  const topic =
    requestedTopic && topics.includes(requestedTopic)
      ? requestedTopic
      : ALL_TOPICS;

  /**
   * `pushState` is patched by the App Router to sync `useSearchParams`, and
   * unlike a router navigation it does not re-render this dynamic page (and
   * re-read Postgres) just to change an in-memory filter.
   */
  const selectTopic = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === ALL_TOPICS) params.delete("topic");
      else params.set("topic", next);
      const search = params.toString();
      window.history.pushState(null, "", search ? `?${search}` : "?");
    },
    [searchParams],
  );

  const topicItems = useMemo(
    () => [
      { value: ALL_TOPICS, label: "All topics" },
      ...topics.map((value) => ({ value, label: value })),
    ],
    [topics],
  );

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
      if (topic !== ALL_TOPICS && topicOf(problem) !== topic) return false;
      if (tag !== "all" && !problem.tags.includes(tag)) return false;
      if (needle.length === 0) return true;
      return (
        problem.title.toLowerCase().includes(needle) ||
        String(problem.number) === needle ||
        problem.tags.some((problemTag) => problemTag.includes(needle))
      );
    });
  }, [difficulty, isSolved, problems, query, solvedOnly, tag, topic]);

  const filtersActive =
    query.trim().length > 0 ||
    difficulty !== "all" ||
    tag !== "all" ||
    solvedOnly ||
    topic !== ALL_TOPICS;

  function clearFilters() {
    setQuery("");
    setDifficulty("all");
    setTag("all");
    setSolvedOnly(false);
    selectTopic(ALL_TOPICS);
  }

  const topicLabel =
    topic === ALL_TOPICS ? "All topics" : `Topic: ${topic}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-2 px-4 py-3 md:px-8">
          <div className="relative min-w-56 flex-1 sm:max-w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, number, or tag"
              aria-label="Search problems"
              className="h-9 w-full pl-9 text-base"
            />
          </div>

          <ToggleGroup
            value={[difficulty]}
            onValueChange={(next) => {
              const value = next[0] as DifficultyFilter | undefined;
              setDifficulty(value ?? "all");
            }}
            className="h-9 rounded-lg border border-border p-0.5"
            size="lg"
          >
            {DIFFICULTY_ITEMS.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className="px-3 text-support"
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            variant={solvedOnly ? "secondary" : "outline"}
            size="lg"
            aria-pressed={solvedOnly}
            onClick={() => setSolvedOnly((previous) => !previous)}
            className="text-support"
          >
            <CheckIcon data-icon="inline-start" />
            Solved
          </Button>

          <Select
            items={topicItems}
            value={topic}
            onValueChange={(value) => selectTopic(value as string)}
          >
            <SelectTrigger className="h-9 text-support" aria-label="Filter by topic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={tagItems}
            value={tag}
            onValueChange={(value) => setTag(value as string)}
          >
            <SelectTrigger className="h-9 text-support" aria-label="Filter by tag">
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

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-support text-muted-foreground md:px-8">
          <span className="tabular-nums">
            {filtered.length === problems.length
              ? `${problems.length} problems`
              : `${filtered.length} of ${problems.length} problems`}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {summary.overall.solved} solved
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {totals.submits} verified submit{totals.submits === 1 ? "" : "s"}
            {totals.revisions > 0
              ? `, ${totals.revisions} revision${totals.revisions === 1 ? "" : "s"}`
              : ""}
          </span>
          <span className="ml-auto">{topicLabel}</span>
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
                <Button variant="outline" size="lg" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="mx-auto w-full max-w-[1200px] px-2 pb-16 md:px-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-support">#</TableHead>
                  <TableHead className="text-support">Title</TableHead>
                  <TableHead className="w-28 text-support">
                    Difficulty
                  </TableHead>
                  <TableHead className="w-44 text-support">Topic</TableHead>
                  <TableHead className="text-support">Tags</TableHead>
                  <TableHead className="w-28 text-right text-support">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((problem) => {
                  const solved = isSolved(problem.slug);
                  return (
                    <TableRow key={problem.slug} className="group">
                      <TableCell className="py-3 text-support text-muted-foreground tabular-nums">
                        {problem.number}
                      </TableCell>
                      <TableCell className="py-3">
                        <Link
                          href={`/problems/${problem.slug}`}
                          className="text-base font-medium text-foreground underline-offset-4 group-hover:text-primary group-hover:underline"
                        >
                          {problem.title}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </TableCell>
                      <TableCell className="py-3 text-support text-muted-foreground">
                        {topicOf(problem)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {problem.tags.map((problemTag) => (
                            <span
                              key={problemTag}
                              className="rounded-sm bg-muted px-1.5 py-0.5 text-support text-muted-foreground"
                            >
                              {problemTag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {solved ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="inline-flex items-center gap-1 text-support text-success">
                              <CheckIcon className="size-4" />
                              solved
                            </span>
                            <ReviseButton
                              slug={problem.slug}
                              title={`Revise ${problem.title}`}
                            />
                          </div>
                        ) : (
                          <span className="text-support text-muted-foreground">
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
