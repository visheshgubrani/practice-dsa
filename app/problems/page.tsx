import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProblemTable } from "@/components/problems/problem-table";
import {
  activityBounds,
  dashboardTotals,
  listActivityDays,
  listProgressStatuses,
  type DashboardTotals,
} from "@/lib/db/queries/dashboard";
import { listProblemSummaries } from "@/lib/db/queries/problems";
import { addDays, dayRange, todayKey } from "@/lib/practice/days";
import type { DayCell } from "@/lib/progress/calendar";
import {
  summarizeProgress,
  type ProgressLookup,
  type ProgressSummary,
} from "@/lib/progress/summary";

export const metadata: Metadata = {
  title: "Problems · DSA Software",
};

// The catalog lives in Postgres and is edited outside the app, so this renders
// per request rather than baking a list into the build.
export const dynamic = "force-dynamic";

/** Days in the header's tick strip — the recent habit, not the whole history. */
const STRIP_DAYS = 42;

type ListData = {
  summary: ProgressSummary;
  strip: DayCell[];
  totals: DashboardTotals;
  statuses: ProgressLookup;
  problems: Awaited<ReturnType<typeof listProblemSummaries>>;
};

export default async function Page() {
  let data: ListData | null = null;
  let error: unknown = null;

  try {
    const today = todayKey();
    const oneWindowAgo = addDays(today, -(STRIP_DAYS - 1));

    const [problems, statuses, bounds, totals] = await Promise.all([
      listProblemSummaries(),
      listProgressStatuses(),
      activityBounds(),
      dashboardTotals(),
    ]);

    // The strip is the last 42 days, or everything since the first practice
    // while the history is still shorter than that.
    const oldest =
      bounds.first && bounds.first > oneWindowAgo ? bounds.first : oneWindowAgo;
    const activity = await listActivityDays({ from: oldest, to: today });
    const byDay = new Map<string, DayCell>(
      activity.map((entry) => [entry.day, entry]),
    );

    data = {
      problems,
      statuses,
      totals,
      summary: summarizeProgress(problems, statuses),
      strip: dayRange(oldest, today).map(
        (day) => byDay.get(day) ?? { day, submits: 0 },
      ),
    };
  } catch (cause) {
    // A stopped database is an expected condition, not a crash: name the fix
    // instead of handing the request to Next's error document. Nothing renders
    // inside this block — React does not run components here.
    error = cause;
  }

  if (!data) {
    return (
      <DatabaseUnavailable
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <main className="h-full overflow-hidden bg-background">
      <ProblemTable
        problems={data.problems}
        summary={data.summary}
        strip={data.strip}
        totals={data.totals}
        statuses={Object.fromEntries(data.statuses)}
      />
    </main>
  );
}
