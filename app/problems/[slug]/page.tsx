import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Workspace } from "@/components/workspace/workspace";
import { getProblem, getProblemNeighbours } from "@/lib/db/queries/problems";
import type { Problem } from "@/lib/problems";
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

  let problem: Problem | null;
  let neighbours: Awaited<ReturnType<typeof getProblemNeighbours>>;
  try {
    problem = await getProblem(slug);
    neighbours = problem ? await getProblemNeighbours(slug) : {};
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
      problem={problem}
      previous={previous}
      next={next}
      aiMode={process.env.DEEPSEEK_API_KEY ? "live" : "demo"}
      runner={runnerKind()}
    />
  );
}
