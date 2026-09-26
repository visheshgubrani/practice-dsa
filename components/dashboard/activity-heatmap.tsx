"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WEEKDAY_LABELS, describeDay } from "@/lib/practice/days";
import {
  activityLevel,
  describeCell,
  type DayCell,
} from "@/lib/progress/calendar";
import { cn } from "@/lib/utils";

/**
 * The activity calendar: one square per day, columns are weeks.
 *
 * Drawn with plain elements instead of a date-picker library on purpose — this
 * is a contribution graph, not a month picker. Almost every day has no cell of
 * its own in a month grid, and the whole idea here is that the empty days are
 * visible too.
 *
 * Colour carries the count, and the tooltip carries the date, so the grid is
 * readable without hovering and the detail is there when you do. The darkest
 * tone is reserved for a busy day that also accepted something, so "dark" keeps
 * meaning "I got one".
 */

/** Five steps, matching `activityLevel`. */
const LEVEL_CLASS = [
  "bg-muted",
  "bg-success/25",
  "bg-success/50",
  "bg-success/70",
  "bg-success",
] as const;

const LEGEND_LABELS = ["none", "1", "2", "3", "4+"] as const;

export function ActivityHeatmap({
  weeks,
  end,
  className,
}: {
  /** Columns of seven days, oldest first — `heatmapWeeks`'s output. */
  weeks: readonly (readonly DayCell[])[];
  /** The last day that has actually happened. Later cells render as blanks. */
  end: string;
  className?: string;
}) {
  if (weeks.length === 0) return null;

  // A month label sits above the first column whose week starts in that month.
  // Only January and the first column get a label when the window is a year
  // long, so the axis stays quiet instead of repeating twelve times.
  const monthLabels = weeks.map((week, index) => {
    const first = week[0]!.day;
    if (index === 0) {
      return first.slice(0, 3) === "Jan" ? "Jan" : null;
    }
    const previous = weeks[index - 1]![0]!.day;
    return first.slice(0, 7) !== previous.slice(0, 7) && first.endsWith("-01")
      ? first.slice(0, 3)
      : null;
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <div
          className="flex w-3 shrink-0 flex-col gap-[3px] pt-[14px]"
          aria-hidden
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <span
              key={index}
              className="h-[11px] font-mono text-[9px] leading-[11px] text-muted-foreground/60"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex w-max flex-col gap-[3px]">
            <div className="flex gap-[3px]" aria-hidden>
              {monthLabels.map((label, index) => (
                <span
                  key={index}
                  className="w-[11px] overflow-visible font-mono text-[9px] whitespace-nowrap text-muted-foreground/70"
                >
                  {label ?? ""}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week[0]!.day} className="flex flex-col gap-[3px]">
                  {week.map((cell) => {
                    // A day that has not happened yet is not "no submissions";
                    // it is nothing at all, so it gets no colour and no label.
                    if (cell.day > end) {
                      return (
                        <span
                          key={cell.day}
                          aria-hidden
                          className="size-[11px] rounded-[2px] border border-dashed border-border/60"
                        />
                      );
                    }

                    return (
                      // The grid is ~370 cells: without a delay every sweep of
                      // the mouse would flash a tooltip on the way past. The
                      // delay lives on the trigger because `Tooltip` here is
                      // the bare base-ui root, and the cell carries the same
                      // text as its label so nothing is hover-only.
                      <Tooltip key={cell.day}>
                        <TooltipTrigger
                          delay={120}
                          aria-label={`${describeDay(cell.day)}: ${describeCell(cell)}`}
                          render={
                            <span
                              className={cn(
                                "block size-[11px] rounded-[2px]",
                                LEVEL_CLASS[activityLevel(cell)],
                                cell.day === end &&
                                  "outline outline-1 outline-offset-1 outline-primary/50",
                              )}
                            />
                          }
                        />
                        <TooltipContent side="top">
                          <span className="font-mono text-[11px]">
                            {describeDay(cell.day)} · {describeCell(cell)}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-5">
        <span className="font-mono text-[10px] text-muted-foreground">
          less
        </span>
        <div className="flex items-center gap-[3px]" aria-hidden>
          {LEVEL_CLASS.map((tone, index) => (
            <span
              key={index}
              title={LEGEND_LABELS[index]}
              className={cn("size-[11px] rounded-[2px]", tone)}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">more</span>
        <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">
          one square per day · submits, not attempts
        </span>
      </div>
    </div>
  );
}
