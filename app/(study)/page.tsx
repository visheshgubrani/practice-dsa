import type { Metadata } from "next";

import { ProgressSummaryCard } from "@/components/dashboard/progress-summary";
import { ReviewReminder } from "@/components/dashboard/review-reminder";
import { StreakCalendar } from "@/components/dashboard/streak-calendar";
import { TopicProgressList } from "@/components/dashboard/topic-progress";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageBody, PageHeader } from "@/components/shell/page-chrome";
import {
  activityBounds,
  dashboardTotals,
  listActivityDays,
  listProgressStatuses,
  type DashboardTotals,
} from "@/lib/db/queries/dashboard";
import { listProblemSummaries } from "@/lib/db/queries/problems";
import { addDays, todayKey } from "@/lib/practice/days";
import {
  heatmapWeeks,
  summarizeStreak,
  type DayCell,
  type StreakSummary,
} from "@/lib/progress/calendar";
import { summarizeProgress, type ProgressSummary } from "@/lib/progress/summary";

export const metadata: Metadata = {
  title: "Dashboard · DSA Software",
};

// Progress lives in Postgres and is written by Submit, so this renders per
// request instead of baking a snapshot into the build.
export const dynamic = "force-dynamic";

/** The calendar's window. A year of squares is the most that stays legible. */
const HEATMAP_WEEKS = 53;

type DashboardData = {
  summary: ProgressSummary;
  streak: StreakSummary;
  weeks: DayCell[][];
  totals: DashboardTotals;
  today: string;
  lastPractised: string | null;
  weekSubmits: number;
  weekAccepts: number;
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
      totals,
      today,
      lastPractised: activity.at(-1)?.day ?? null,
      weekSubmits: thisWeek.reduce((total, entry) => total + entry.submits, 0),
      weekAccepts: thisWeek.reduce((total, entry) => total + entry.accepted, 0),
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
    totals,
    today,
    lastPractised,
    weekSubmits,
    weekAccepts,
  } = data;

  const stats = [
    `${totals.submits} verified submit${totals.submits === 1 ? "" : "s"}`,
    totals.revisions > 0
      ? `${totals.revisions} revision${totals.revisions === 1 ? "" : "s"}`
      : null,
    weekSubmits > 0
      ? `${weekAccepts} of ${weekSubmits} accepted this week`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        title="Dashboard"
        description={stats}
        actions={
          <p className="text-support text-muted-foreground tabular-nums">
            {summary.overall.solved} / {summary.overall.total} solved
          </p>
        }
      />

      <PageBody>
        <ReviewReminder />

        {totals.submissions === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-base text-muted-foreground">
            Nothing submitted yet. Run and Submit in a problem and it shows up
            here — only a verified Submit counts, not a Run.
          </p>
        ) : null}

        <ProgressSummaryCard summary={summary} />

        <StreakCalendar
          streak={streak}
          weeks={weeks}
          end={today}
          lastDay={lastPractised}
        />

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-section font-semibold">Topics</h2>
            <p className="text-support text-muted-foreground">
              {summary.byTopic.length} groups in roadmap order · every row opens
              the filtered problem list
            </p>
          </div>
          <TopicProgressList topics={summary.byTopic} />
        </section>
      </PageBody>
    </main>
  );
}
