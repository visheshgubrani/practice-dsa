"use client";

import { useEffect, useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WEEKDAY_LABELS, describeDay } from "@/lib/practice/days";
import {
  activityLevel,
  describeCell,
  monthLabels,
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

/** One cell, and the pitch between cells. */
const CELL = "size-3.5 rounded-[3px]";
const GAP = "gap-1";

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
  const scrollerRef = useRef<HTMLDivElement>(null);

  // A year of squares does not fit a phone, and the interesting end of it is
  // the recent one, so the view opens on today rather than on last October.
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
  }, [weeks.length]);

  if (weeks.length === 0) return null;

  const labels = monthLabels(weeks);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex gap-2">
        <div
          className={cn("flex w-4 shrink-0 flex-col pt-[18px]", GAP)}
          aria-hidden
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <span
              key={index}
              className="h-3.5 shrink-0 text-support leading-none text-muted-foreground"
            >
              {/* Monday, Wednesday, Friday: enough to read the rows, quiet
                  enough that the axis is not a wall of letters. */}
              {index % 2 === 1 ? label : ""}
            </span>
          ))}
        </div>

        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-1"
        >
          <div className={cn("flex w-max flex-col", GAP)}>
            <div className={cn("flex", GAP)} aria-hidden>
              {labels.map((label, index) => (
                <span
                  key={index}
                  className="w-3.5 overflow-visible text-support leading-none whitespace-nowrap text-muted-foreground"
                >
                  {label ?? ""}
                </span>
              ))}
            </div>

            <div className={cn("flex", GAP)}>
              {weeks.map((week) => (
                <div key={week[0]!.day} className={cn("flex flex-col", GAP)}>
                  {week.map((cell) => {
                    // A day that has not happened yet is not "no submissions";
                    // it is nothing at all, so it gets no colour and no label.
                    if (cell.day > end) {
                      return (
                        <span
                          key={cell.day}
                          aria-hidden
                          className={cn(
                            CELL,
                            "border border-dashed border-border/60",
                          )}
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
                                "block",
                                CELL,
                                LEVEL_CLASS[activityLevel(cell)],
                                cell.day === end &&
                                  "outline outline-1 outline-offset-1 outline-primary/60",
                              )}
                            />
                          }
                        />
                        <TooltipContent side="top">
                          <span className="text-support">
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

      <div className="flex flex-wrap items-center gap-2 pl-6">
        <span className="text-support text-muted-foreground">less</span>
        <div className={cn("flex items-center", GAP)} aria-hidden>
          {LEVEL_CLASS.map((tone, index) => (
            <span
              key={index}
              title={LEGEND_LABELS[index]}
              className={cn(CELL, tone)}
            />
          ))}
        </div>
        <span className="text-support text-muted-foreground">more</span>
        <span className="text-support text-muted-foreground">
          one square per day · verified submits, not attempts
        </span>
      </div>
    </div>
  );
}
