import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProblemTable } from "@/components/problems/problem-table";
import { listProblemSummaries } from "@/lib/db/queries/problems";
import type { ProblemSummary } from "@/lib/problems";

export const metadata: Metadata = {
  title: "Problems · DSA Software",
};

// The catalog lives in Postgres and is edited outside the app, so this renders
// per request rather than baking a list into the build.
export const dynamic = "force-dynamic";

export default async function Page() {
  let problems: ProblemSummary[];
  try {
    problems = await listProblemSummaries();
  } catch (error) {
    // A stopped database is an expected condition, not a crash: name the fix
    // instead of handing the request to Next's error document.
    return (
      <DatabaseUnavailable
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <main className="h-full overflow-hidden bg-background">
      <ProblemTable problems={problems} />
    </main>
  );
}
