import type { Difficulty, ProblemSummary } from "@/lib/problems";

/**
 * Solved counts for the dashboard, derived from `problem_progress` rather than
 * from the catalog's own idea of progress.
 *
 * Solved is read from Postgres, so the dashboard is right after a restart and
 * across browsers; the browser's `dsa.progress` key remains only a recovery
 * copy for the list's offline paint.
 */

/** A problem's standing. Mirrors `PracticeProgress["status"]`. */
export type ProblemStatus = "todo" | "attempted" | "solved";

export type ProgressLookup = Map<string, ProblemStatus>;

/**
 * Counting everything, not only what was handed in: a status the dashboard
 * never learned about is `todo`, which is also what the database says for a
 * problem with no progress row.
 */
export type CountedProgress = {
  solved: number;
  attempted: number;
  total: number;
};

export type DifficultyProgress = Record<Difficulty, CountedProgress>;

export type TopicProgress = CountedProgress & {
  /** The group's name as stored, or `UNCATEGORIZED`. */
  topic: string;
  /** The group's problems, in authored order. */
  problems: ProblemSummary[];
};

/**
 * What a problem with no topic is shown under. The topics column is seeded from
 * the roadmap sheet, but a row can predate that backfill, and a problem must
 * never disappear from the dashboard because of it.
 */
export const UNCATEGORIZED = "Uncategorized";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function emptyCount(): CountedProgress {
  return { solved: 0, attempted: 0, total: 0 };
}

export type ProgressSummary = {
  /** Overall totals across the catalog. */
  overall: CountedProgress;
  byDifficulty: DifficultyProgress;
  /**
   * One entry per topic that has problems, in the order the topics first appear
   * in `problems`. `problems` arrives in authored order, so that order is the
   * roadmap order, and calling it out here is what keeps the dashboard's
   * sections from being alphabetized by accident.
   */
  byTopic: TopicProgress[];
};

export function summarizeProgress(
  problems: readonly ProblemSummary[],
  statuses: ProgressLookup,
): ProgressSummary {
  const overall = emptyCount();
  const byDifficulty: DifficultyProgress = {
    easy: emptyCount(),
    medium: emptyCount(),
    hard: emptyCount(),
  };
  const topics = new Map<string, TopicProgress>();

  for (const problem of problems) {
    const status = statuses.get(problem.slug) ?? "todo";
    // Only these two statuses have a bucket; `todo` is what "not counted" means.
    const bucket = status === "solved" || status === "attempted" ? status : null;

    overall.total += 1;
    if (bucket) overall[bucket] += 1;

    const difficulty = byDifficulty[problem.difficulty];
    difficulty.total += 1;
    if (bucket) difficulty[bucket] += 1;

    const topic = problem.topic.trim() || UNCATEGORIZED;
    let group = topics.get(topic);
    if (!group) {
      group = { topic, ...emptyCount(), problems: [] };
      topics.set(topic, group);
    }
    group.total += 1;
    if (bucket) group[bucket] += 1;
    group.problems.push(problem);
  }

  return {
    overall,
    byDifficulty,
    byTopic: [...topics.values()],
  };
}

/** `3 / 9`, the progress label every card and section header uses. */
export function formatCount(counted: CountedProgress): string {
  return `${counted.solved} / ${counted.total}`;
}

/** 0–100, clamped: a stored count can never exceed its total, but a UI width must not. */
export function percentSolved(counted: CountedProgress): number {
  if (counted.total === 0) return 0;
  return Math.min(100, Math.round((counted.solved / counted.total) * 100));
}

export { DIFFICULTIES };
