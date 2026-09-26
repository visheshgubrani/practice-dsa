/**
 * The roadmap groups the catalog is authored in, and how a seeded problem is
 * filed under one of them.
 *
 * `lib/problems/catalog.ts` is already written group by group, so this list is
 * the same order, and `PROBLEM_GROUPS` is what the dashboard renders as its
 * topic sections. The order is the sheet's roadmap order, not alphabetical —
 * a learner works through Arrays & Hashing before 2-D Dynamic Programming.
 *
 * The group names come from `docs/catalog/neetcode-150.json`, which is also
 * what `pnpm problems:check --group` and `pnpm catalog:status` read. A group
 * with no seeded problem (Trees, most of Linked List) is deliberately absent
 * here: the dashboard shows topics that have problems, not empty headings.
 *
 * Seed-only data. Do not import this from client code.
 */

/** Roadmap order, and the order the dashboard's topic sections render in. */
export const PROBLEM_GROUPS = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Tries",
  "Heap / Priority Queue",
  "Greedy",
  "Intervals",
  "Math & Geometry",
  "Bit Manipulation",
  "Backtracking",
  "Graphs",
  "Advanced Graphs",
  "1-D Dynamic Programming",
  "2-D Dynamic Programming",
] as const;

export type ProblemGroup = (typeof PROBLEM_GROUPS)[number];

/**
 * The one seeded problem that is not on the NeetCode 150 sheet, so the sheet
 * has no group for it. It sits with its family in `catalog.ts`, and this keeps
 * the derived topic agreeing with that placement. A second exception means the
 * problem probably needs its own authored group instead.
 */
export const GROUP_OVERRIDES: Readonly<Record<string, ProblemGroup>> = {
  "search-insert-position": "Binary Search",
};

/**
 * The topic a seeded problem belongs to.
 *
 * The sheet's own group wins, so a problem moved within `catalog.ts` cannot
 * silently drift away from the roadmap. `fallback` is what the caller reads off
 * the catalog (its position), used only for a slug the sheet does not list.
 */
export function topicForSlug(
  slug: string,
  fallback: ProblemGroup | undefined,
): ProblemGroup {
  const override = GROUP_OVERRIDES[slug];
  if (override) return override;
  if (fallback) return fallback;
  throw new Error(
    `${slug}: no roadmap group. Add it to GROUP_OVERRIDES in lib/problems/topics.ts, ` +
      `or check that docs/catalog/neetcode-150.json still lists it.`,
  );
}
