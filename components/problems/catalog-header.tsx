import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { DayCell } from "@/lib/progress/calendar";
import type { CountedProgress } from "@/lib/progress/summary";
import { formatCount } from "@/lib/progress/summary";
import { cn } from "@/lib/utils";

/**
 * The top bar both catalog screens share: the mark, where the catalog stands,
 * the recent-practice tick strip, and the two navigation targets.
 *
 * It is a server component — everything it shows was already read on the page —
 * and it replaces `AppHeader` on these two screens, so the dashboard, the
 * problem list, and the workspace all begin with the same height.
 */
export function CatalogHeader({
  counted,
  cells,
  activeDays,
  children,
}: {
  counted: CountedProgress;
  /**
   * The trailing practice window, oldest first, one cell per day with the
   * empty days already filled in. Rendered as ticks rather than dates.
   */
  cells: readonly DayCell[];
  /** How many of those cells carry a verified Submit. */
  activeDays: number;
  /** Page-specific controls — search, filters — placed before the nav links. */
  children?: React.ReactNode;
}) {
  const window = cells.length;

  return (
    <header className="shrink-0 border-b border-border bg-panel-2">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-medium tracking-tight">
            dsa<span className="text-primary">.</span>
          </span>
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            dashboard
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-success">
            {formatCount(counted)}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            solved
          </span>
        </div>

        {window > 0 ? (
          <>
            <div
              className="flex items-center gap-[3px]"
              role="img"
              aria-label={`${activeDays} of the last ${window} days had a verified Submit`}
            >
              {cells.map((cell) => (
                <span
                  key={cell.day}
                  title={
                    cell.submits > 0
                      ? `${cell.day} · ${cell.submits} submit${
                          cell.submits === 1 ? "" : "s"
                        }`
                      : cell.day
                  }
                  className={cn(
                    "h-1 w-2.5 rounded-full",
                    cell.submits === 0
                      ? "bg-muted"
                      : "accepted" in cell && cell.accepted > 0
                        ? "bg-success"
                        : "bg-success/45",
                  )}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {activeDays} active {activeDays === 1 ? "day" : "days"} in the last{" "}
              {window}
            </p>
          </>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {children}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "font-mono text-xs",
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/problems"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "font-mono text-xs",
              )}
            >
              All problems
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
