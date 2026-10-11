"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ProgressTone = "success" | "easy" | "medium" | "hard";

/**
 * `Progress` styles its indicator once for the whole library; a tone is applied
 * to that one descendant rather than forking the component.
 */
const TONE: Record<ProgressTone, string> = {
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  easy: "[&_[data-slot=progress-indicator]]:bg-difficulty-easy",
  medium: "[&_[data-slot=progress-indicator]]:bg-difficulty-medium",
  hard: "[&_[data-slot=progress-indicator]]:bg-difficulty-hard",
};

/**
 * A progress bar that carries its own accessible name. Values are solved
 * fractions, so the bar is a progress indicator rather than decoration.
 */
export function ProgressBar({
  value,
  label,
  tone = "success",
  className,
}: {
  /** 0–100. Clamped so a bad count cannot overflow the track. */
  value: number;
  /** What the bar measures, e.g. "Arrays & Hashing: 12 / 13 solved". */
  label: string;
  tone?: ProgressTone;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <Progress
      value={percent}
      aria-label={label}
      className={cn(
        "w-full gap-0 [&_[data-slot=progress-track]]:h-2",
        TONE[tone],
        className,
      )}
    />
  );
}
