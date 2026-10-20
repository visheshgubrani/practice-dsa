import { and, count, gte, lt, sql } from "drizzle-orm";

import { dayBounds } from "@/lib/practice/days";

import { db } from "../index";
import { problemProgress, reviewLogs } from "../schema";

/**
 * The day's already-done work, as two counts.
 *
 * `solvedToday` is deliberately read from `problem_progress.solved_at`, not from
 * submissions: `solvedAt` is written once on the first verified Piston accept
 * and never moved by a revision or a repeat accept. A first solve is therefore
 * counted once, and a revise session cannot satisfy the new-problem quota.
 *
 * `reviewsRatedToday` is a distinct-card count. A card rated twice in one day
 * is still one review; a Submit without a rating is not a review at all.
 *
 * Both windows use the browser's local day key plus its UTC offset, the same
 * fixed-offset day model the rest of the app uses. Nothing here writes.
 */

export type CoachDayWork = {
  solvedToday: number;
  reviewsRatedToday: number;
};

export async function loadCoachDay(
  day: string,
  offsetMinutes: number,
): Promise<CoachDayWork> {
  const { start, end } = dayBounds(day, offsetMinutes);

  const [solves, reviews] = await Promise.all([
    db
      .select({ count: count() })
      .from(problemProgress)
      .where(
        and(
          gte(problemProgress.solvedAt, start),
          lt(problemProgress.solvedAt, end),
        ),
      ),
    db
      .select({
        count: sql<number>`count(distinct ${reviewLogs.problemId})::int`,
      })
      .from(reviewLogs)
      .where(
        and(gte(reviewLogs.reviewedAt, start), lt(reviewLogs.reviewedAt, end)),
      ),
  ]);

  return {
    solvedToday: solves[0]?.count ?? 0,
    reviewsRatedToday: reviews[0]?.count ?? 0,
  };
}
