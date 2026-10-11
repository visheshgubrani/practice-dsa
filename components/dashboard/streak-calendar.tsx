import { FlameIcon } from "lucide-react";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeDay } from "@/lib/practice/days";
import type { DayCell, StreakSummary } from "@/lib/progress/calendar";
import { cn } from "@/lib/utils";

function lastDayMessage(lastDay: string | null, alive: boolean): string {
  if (!lastDay) {
    return "No practice days yet — the first verified Submit fills a square.";
  }
  if (alive) return `Last practised ${describeDay(lastDay)}.`;
  return `Last practised ${describeDay(lastDay)}. A Submit today starts the next run.`;
}

/**
 * The streak and the calendar belong together: the number is the headline and
 * the grid is the evidence for it, so they share one section instead of two
 * cards that repeat each other's context.
 */
export function StreakCalendar({
  streak,
  weeks,
  end,
  lastDay,
}: {
  streak: StreakSummary;
  weeks: readonly (readonly DayCell[])[];
  /** The last day that has happened; later cells are blanks. */
  end: string;
  lastDay: string | null;
}) {
  const alive = streak.current > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <CardTitle>
            <h2 className="flex items-center gap-2.5 text-section font-medium">
              <FlameIcon
                aria-hidden
                className={cn(
                  "size-5 shrink-0",
                  alive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="tabular-nums">{streak.current}</span>
              <span className="text-base font-normal text-muted-foreground">
                day{streak.current === 1 ? "" : "s"} in a row
              </span>
            </h2>
          </CardTitle>
          <p className="text-support text-muted-foreground tabular-nums">
            best {streak.longest} · {streak.activeDays} active{" "}
            {streak.activeDays === 1 ? "day" : "days"} · {streak.thisWeek} in the
            last 7
          </p>
        </div>
        <CardDescription className="text-support">
          {lastDayMessage(lastDay, alive)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ActivityHeatmap weeks={weeks} end={end} />
      </CardContent>
    </Card>
  );
}
