import type { CountedProgress } from "@/lib/progress/summary";
import { formatCount, percentSolved } from "@/lib/progress/summary";
import { cn } from "@/lib/utils";

/**
 * A solved counter with a bar: the overall figure and one per difficulty.
 *
 * The bar is a plain element rather than a chart — a progress bar with a
 * percentage is not a data visualisation, and it keeps the dashboard free of a
 * charting dependency.
 */

const TONE = {
  all: "bg-primary",
  easy: "bg-difficulty-easy",
  medium: "bg-difficulty-medium",
  hard: "bg-difficulty-hard",
} as const;

export function StatCard({
  label,
  counted,
  tone = "all",
  className,
}: {
  label: string;
  counted: CountedProgress;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  const percent = percentSolved(counted);

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-panel-2 p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-[11px] text-muted-foreground uppercase">
          {label}
        </h2>
        <span className="font-mono text-sm">{formatCount(counted)}</span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${formatCount(counted)} solved`}
      >
        <div
          className={cn("h-full rounded-full transition-all", TONE[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>{percent}%</span>
        {counted.attempted > 0 ? (
          <span>{counted.attempted} attempted</span>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
