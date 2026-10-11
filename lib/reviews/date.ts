/**
 * Review dates are stored as UTC instants and shown in the browser's local
 * time. These helpers are the one place that decides how they read, so the
 * dashboard reminder, the sidebar, and the reviews page agree.
 */

function toDate(value: string | Date): Date | null {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "12 Oct 2026, 18:30" in the viewer's locale, or a plain fallback. */
export function formatReviewDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "date unavailable";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Just the local time — for a row that already shows the date. */
export function formatReviewTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "date unavailable";
  return date.toLocaleTimeString(undefined, {
    timeStyle: "short",
  });
}

/**
 * How a scheduled review reads next to a title: "Due today, 18:30",
 * "Overdue since 5 Oct 2026", or "Due 12 Oct 2026, 18:30".
 */
export function reviewDueLabel(
  value: string | Date,
  now: Date = new Date(),
): string {
  const due = toDate(value);
  if (!due) return "date unavailable";

  if (due.getTime() > now.getTime()) {
    return sameDay(due, now)
      ? `Due today, ${formatReviewTime(due)}`
      : `Due ${formatReviewDateTime(due)}`;
  }

  return sameDay(due, now)
    ? "Due earlier today"
    : `Overdue since ${due.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}
