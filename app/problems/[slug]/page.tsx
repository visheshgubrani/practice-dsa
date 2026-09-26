import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Workspace } from "@/components/workspace/workspace";
import { getProblemStatus } from "@/lib/db/queries/dashboard";
import { getProblem, getProblemNeighbours } from "@/lib/db/queries/problems";
import type { Problem } from "@/lib/problems";
import type { ProblemStatus } from "@/lib/progress/summary";
import { runnerKind } from "@/lib/runner";

// Problems are rows, not module constants: every visit reads the current one.
export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/problems/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  try {
    const problem = await getProblem(slug);
    if (!problem) return { title: "Problem not found · DSA Software" };
    return {
      title: `${problem.number}. ${problem.title} · DSA Software`,
      description: `Solve ${problem.title} in the workbench.`,
    };
  } catch {
    // The page below renders the outage itself; metadata must not fail first.
    return { title: "DSA Software" };
  }
}

export default async function Page(props: PageProps<"/problems/[slug]">) {
  const { slug } = await props.params;
  const query = await props.searchParams;
  // `?revise=1` opens a revise session. Anything else — including a repeated
  // parameter, which arrives as an array — is not a revise session, so an odd
  // URL opens the ordinary workspace instead of failing.
  const revision = query.revise === "1";

  let problem: Problem | null;
  let neighbours: Awaited<ReturnType<typeof getProblemNeighbours>>;
  let status: ProblemStatus = "todo";
  try {
    problem = await getProblem(slug);
    neighbours = problem ? await getProblemNeighbours(slug) : {};
    // Read here, not in the browser: the Revise action is part of the first
    // paint, and a solved problem should show it without waiting for a fetch.
    status = problem ? await getProblemStatus(slug) : "todo";
  } catch (error) {
    return (
      <DatabaseUnavailable
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!problem) notFound();

  const { previous, next } = neighbours;

  return (
    <Workspace
      // The key remounts the workspace when the session kind changes, so the
      // buffer, the console, and the history panel all start clean rather than
      // leaking a draft into a revise pass or the reverse.
      key={`${problem.slug}${revision ? ":revise" : ""}`}
      problem={problem}
      previous={previous}
      next={next}
      aiMode={process.env.DEEPSEEK_API_KEY ? "live" : "demo"}
      runner={runnerKind()}
      revision={revision}
      solved={status === "solved"}
    />
  );
}
