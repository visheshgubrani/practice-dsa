import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProblemTable } from "@/components/problems/problem-table";
import { PageBody, PageHeader } from "@/components/shell/page-chrome";
import {
  dashboardTotals,
  listProgressStatuses,
  type DashboardTotals,
} from "@/lib/db/queries/dashboard";
import { listProblemSummaries } from "@/lib/db/queries/problems";
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

type ListData = {
  summary: ProgressSummary;
  totals: DashboardTotals;
  statuses: ProgressLookup;
  problems: Awaited<ReturnType<typeof listProblemSummaries>>;
};

export default async function Page() {
  let data: ListData | null = null;
  let error: unknown = null;

  try {
    const [problems, statuses, totals] = await Promise.all([
      listProblemSummaries(),
      listProgressStatuses(),
      dashboardTotals(),
    ]);

    data = {
      problems,
      statuses,
      totals,
      summary: summarizeProgress(problems, statuses),
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

  const { summary, totals, statuses, problems } = data;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        title="Problems"
        description={
          <>
            <span className="tabular-nums">
              {summary.overall.solved} of {summary.overall.total}
            </span>{" "}
            solved · {summary.byTopic.length} topics · search, then narrow by
            difficulty, topic, tag, or solved
          </>
        }
      />
      <PageBody bare>
        <ProblemTable
          problems={problems}
          summary={summary}
          totals={totals}
          statuses={Object.fromEntries(statuses)}
        />
      </PageBody>
    </main>
  );
}
