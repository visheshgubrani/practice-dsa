import { z } from "zod";

import { tutorIsLive } from "@/lib/ai/model";
import { isCoachMinutes, type CoachPlanResponse } from "@/lib/coach/types";
import { buildCoachPlan, type CoachPlanInput } from "@/lib/coach/plan";
import { HISTORY_WINDOW_DAYS } from "@/lib/coach/rules";
import { loadCoachDay } from "@/lib/db/queries/coach";
import {
  listActivityDays,
  listProgressStatuses,
} from "@/lib/db/queries/dashboard";
import { listProblemSummaries } from "@/lib/db/queries/problems";
import { listReviewQueue } from "@/lib/db/queries/reviews";
import { addDays, dayKey } from "@/lib/practice/days";

/**
 * The deterministic daily plan.
 *
 * This route is a read: it composes the public catalog summary, progress,
 * review queue, recent activity, and the day's first-solve/rating counts. It
 * never calls `getProblem`, so statements, testcases, source, and reference
 * solutions cannot enter the plan, and it writes nothing.
 */

const querySchema = z.object({
  minutes: z.coerce.number().int().refine(isCoachMinutes),
  utcOffsetMinutes: z.coerce.number().int().min(-840).max(840),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    minutes: url.searchParams.get("minutes") ?? undefined,
    utcOffsetMinutes: url.searchParams.get("utcOffsetMinutes") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid plan query.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { minutes, utcOffsetMinutes } = parsed.data;
  const now = new Date();
  const day = dayKey(now, utcOffsetMinutes);

  try {
    const [problems, statuses, queue, activity, dayWork] = await Promise.all([
      listProblemSummaries(),
      listProgressStatuses(),
      listReviewQueue(now),
      listActivityDays({
        from: addDays(day, -(HISTORY_WINDOW_DAYS - 1)),
        to: day,
      }),
      loadCoachDay(day, utcOffsetMinutes),
    ]);

    const input: CoachPlanInput = {
      day,
      offsetMinutes: utcOffsetMinutes,
      minutes,
      problems,
      statuses,
      due: queue.due,
      upcomingSlugs: queue.upcoming.map((review) => review.slug),
      pausedCount: queue.paused.length,
      nextReviewAt: queue.nextDueAt,
      activity,
      solvedToday: dayWork.solvedToday,
      reviewsRatedToday: dayWork.reviewsRatedToday,
    };

    const payload: CoachPlanResponse = {
      plan: buildCoachPlan(input),
      live: tutorIsLive(),
    };
    return Response.json(payload);
  } catch (error) {
    console.error("Could not build today's plan.", error);
    return Response.json(
      { error: "Could not build today's plan." },
      { status: 500 },
    );
  }
}
