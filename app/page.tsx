import type { Metadata } from "next";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { StatCard } from "@/components/dashboard/stat-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { TopicSection } from "@/components/dashboard/topic-section";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { CatalogHeader } from "@/components/problems/catalog-header";
import {
  activityBounds,
  dashboardTotals,
  listActivityDays,
  listProgressStatuses,
  type DashboardTotals,
} from "@/lib/db/queries/dashboard";
import { listProblemSummaries } from "@/lib/db/queries/problems";
import { addDays, dayRange, todayKey } from "@/lib/practice/days";
import {
  heatmapWeeks,
  summarizeStreak,
  type DayCell,
  type StreakSummary,
} from "@/lib/progress/calendar";
import { summarizeProgress, type ProgressLookup, type ProgressSummary } from "@/lib/progress/summary";

export const metadata: Metadata = {
  title: "Dashboard · DSA Software",
};

// Progress lives in Postgres and is written by Submit, so this renders per
// request instead of baking a snapshot into the build.
export const dynamic = "force-dynamic";

/** The calendar's window. A year of squares is the most that stays legible. */
const HEATMAP_WEEKS = 53;
/** Days in the header's tick strip — the recent habit, not the whole history. */
const STRIP_DAYS = 42;

type DashboardData = {
  summary: ProgressSummary;
  streak: StreakSummary;
  weeks: DayCell[][];
  strip: DayCell[];
  totals: DashboardTotals;
  today: string;
  lastPractised: string | null;
  weekSubmits: number;
  weekAccepts: number;
  /** `slug -> status`, looked up per row by every topic section. */
  statuses: ProgressLookup;
};

export default async function Page() {
  let data: DashboardData | null = null;
  let error: unknown = null;

  try {
    const [problems, statuses, bounds, totals] = await Promise.all([
      listProblemSummaries(),
      listProgressStatuses(),
      activityBounds(),
      dashboardTotals(),
    ]);

    const today = todayKey();
    const oneYearAgo = addDays(today, -7 * (HEATMAP_WEEKS - 1));
    // A year back, or the first day ever practised when that is more recent: a
    // calendar that is three-quarters empty because the app is new says less
    // than one that starts where the history does.
    const oldest =
      bounds.first && bounds.first > oneYearAgo ? bounds.first : oneYearAgo;
    const activity = await listActivityDays({ from: oldest, to: today });
    const thisWeek = activity.filter((entry) => entry.day > addDays(today, -7));

    data = {
      summary: summarizeProgress(problems, statuses),
      streak: summarizeStreak(
        activity.map((entry) => entry.day),
        today,
      ),
      weeks: heatmapWeeks({ days: activity, end: today, weeks: HEATMAP_WEEKS }),
      strip: fillWindow(
        activity,
        dayRange(addDays(today, -(STRIP_DAYS - 1)), today),
      ),
      totals,
      today,
      lastPractised: activity.at(-1)?.day ?? null,
      weekSubmits: thisWeek.reduce((total, entry) => total + entry.submits, 0),
      weekAccepts: thisWeek.reduce((total, entry) => total + entry.accepted, 0),
      statuses,
    };
  } catch (cause) {
    // A stopped database is an expected condition, not a crash: name the fix
    // instead of handing the request to Next's error document. Nothing renders
    // inside this block — React does not run components here, so JSX in a
    // `try` would not be covered by the `catch` anyway.
    error = cause;
  }

  if (!data) {
    return (
      <DatabaseUnavailable
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const {
    summary,
    streak,
    weeks,
    strip,
    totals,
    today,
    lastPractised,
    weekSubmits,
    weekAccepts,
    statuses,
  } = data;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <CatalogHeader
        counted={summary.overall}
        cells={strip}
        activeDays={strip.filter((cell) => cell.submits > 0).length}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 py-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Solved" counted={summary.overall} />
            <StatCard
              label="Easy"
              counted={summary.byDifficulty.easy}
              tone="easy"
            />
            <StatCard
              label="Medium"
              counted={summary.byDifficulty.medium}
              tone="medium"
            />
            <StatCard
              label="Hard"
              counted={summary.byDifficulty.hard}
              tone="hard"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <StreakCard streak={streak} lastDay={lastPractised} />
            <ActivityHeatmap
              weeks={weeks}
              end={today}
              className="rounded-lg border border-border bg-panel-2 p-4"
            />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-mono text-sm font-medium tracking-tight">
                Topics
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                {summary.byTopic.length} groups · press a heading to collapse it
              </p>
              <p className="ml-auto font-mono text-[11px] text-muted-foreground">
                {totals.submits} verified submits
                {totals.revisions > 0
                  ? ` · ${totals.revisions} revision${
                      totals.revisions === 1 ? "" : "s"
                    }`
                  : ""}
                {weekSubmits > 0
                  ? ` · ${weekAccepts}/${weekSubmits} accepted this week`
                  : ""}
              </p>
            </div>

            {totals.submissions === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Nothing submitted yet. Run and Submit in a problem and it shows
                up here — only a verified Submit counts, not a Run.
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              {summary.byTopic.map((topic) => (
                <TopicSection
                  key={topic.topic}
                  topic={topic}
                  statuses={statuses}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/**
 * The strip is a window of days that happened, not the set of days practised:
 * an empty day has to render as an empty tick, so the sparse rows from SQL are
 * filled in against the window.
 */
function fillWindow(
  activity: readonly { day: string; submits: number; accepted: number }[],
  window: readonly string[],
): DayCell[] {
  const byDay = new Map<string, DayCell>(
    activity.map((entry) => [entry.day, entry]),
  );
  return window.map((day) => byDay.get(day) ?? { day, submits: 0 });
}
