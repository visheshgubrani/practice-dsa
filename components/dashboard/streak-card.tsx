import { FlameIcon, TrophyIcon } from "lucide-react";

import type { StreakSummary } from "@/lib/progress/calendar";
import { cn } from "@/lib/utils";

/**
 * The streak, as four numbers and a flame.
 *
 * "Current" is allowed to be zero while a streak is still alive — a run that
 * ended yesterday is not broken until today is over — so the card says which
 * case it is instead of leaving a bare `0` to be misread.
 */
export function StreakCard({
  streak,
  lastDay,
}: {
  streak: StreakSummary;
  /** The most recent practice day, or null when nothing has been practised. */
  lastDay: string | null;
}) {
  const alive = streak.current > 0;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-panel-2 p-4">
      <div className="flex items-center gap-3">
        <FlameIcon
          className={cn(
            "size-5",
            alive ? "text-primary" : "text-muted-foreground/40",
          )}
        />
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl leading-none font-medium">
            {streak.current}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            day{streak.current === 1 ? "" : "s"} in a row
          </span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <TrophyIcon className="size-3.5" />
          best {streak.longest}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="font-mono text-[11px] text-muted-foreground">
            active days
          </dt>
          <dd className="font-mono text-sm">{streak.activeDays}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="font-mono text-[11px] text-muted-foreground">
            last 7 days
          </dt>
          <dd className="font-mono text-sm">{streak.thisWeek}</dd>
        </div>
      </dl>

      <p className="font-mono text-[11px] text-muted-foreground">
        {lastDay
          ? alive
            ? `Last practised ${lastDay}. A verified Submit counts; a Run does not.`
            : `Last practised ${lastDay}. A Submit today starts a new streak.`
          : "No verified Submits yet. The first one starts the streak."}
      </p>
    </section>
  );
}
