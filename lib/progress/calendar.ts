import { addDays, dayRange, daysBetween, weekdayIndex } from "@/lib/practice/days";

/**
 * The streak and the activity calendar, as pure functions over day keys.
 *
 * A "practice day" is a day with at least one verified Piston Submit — any
 * verdict. A day of scratch Runs, mock runs, or visualize traces is not a
 * practice day, because those never judge the code: the same rule that keeps
 * them from marking a problem solved. A **revise** submit is still a Submit, so
 * it counts: revisiting a solved problem is the practice this feature rewards.
 */

export type ActivityDay = {
  /** `YYYY-MM-DD`, local to the viewer. */
  day: string;
  /** Verified Piston Submits that day. */
  submits: number;
  /** How many of those were accepted. */
  accepted: number;
};

/** A calendar cell: a real activity day, or a filled-in empty one. */
export type DayCell = ActivityDay | { day: string; submits: number };

export type StreakSummary = {
  /** Consecutive practice days ending today (or yesterday — see below). */
  current: number;
  /** The longest run in the history handed in. */
  longest: number;
  /** How many days have been practised at all. */
  activeDays: number;
  /** Days practised in the last seven, including today. */
  thisWeek: number;
};

/**
 * The current run of consecutive practice days.
 *
 * Today is allowed to be empty without breaking the streak: a streak is judged
 * at the end of the day, so at 9am on Wednesday a Monday–Tuesday run is still
 * alive. Two empty days end it — there is no way to describe "yesterday and the
 * day before were missed" as a current streak.
 */
export function currentStreak(days: readonly string[], today: string): number {
  const practiced = new Set(days);
  const yesterday = addDays(today, -1);

  let cursor: string;
  if (practiced.has(today)) cursor = today;
  else if (practiced.has(yesterday)) cursor = yesterday;
  else return 0;

  let length = 0;
  while (practiced.has(cursor)) {
    length += 1;
    cursor = addDays(cursor, -1);
  }
  return length;
}

/** The longest run of consecutive days in the whole history. */
export function longestStreak(days: readonly string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of sorted) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }

  return best;
}

export function summarizeStreak(
  days: readonly string[],
  today: string,
): StreakSummary {
  const unique = [...new Set(days)];
  return {
    current: currentStreak(unique, today),
    longest: longestStreak(unique),
    activeDays: unique.length,
    thisWeek: unique.filter((day) => {
      const ago = daysBetween(day, today);
      return ago >= 0 && ago < 7;
    }).length,
  };
}

/** The last `weeks` calendar weeks, oldest first, ending with the week of `end`. */
export function heatmapWeeks({
  days,
  end,
  weeks = 53,
}: {
  days: readonly ActivityDay[];
  end: string;
  weeks?: number;
}): DayCell[][] {
  const byDay = new Map<string, DayCell>(
    days.map((entry) => [entry.day, entry]),
  );

  // The grid starts on the Sunday of the oldest week, so every column is a full
  // week and the weekday rows line up with the labels. The column that contains
  // `end` is the last one, which is also why the grid runs up to six days past
  // `end`: a half-height final column would break the weekday rows, and the
  // cells for days that have not happened yet are rendered as empty.
  const sundayOfEndWeek = addDays(end, -weekdayIndex(end));
  const firstSunday = addDays(sundayOfEndWeek, -7 * (weeks - 1));

  const columns: DayCell[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const start = addDays(firstSunday, week * 7);
    columns.push(
      dayRange(start, addDays(start, 6)).map(
        (day) => byDay.get(day) ?? { day, submits: 0, accepted: 0 },
      ),
    );
  }

  return columns;
}

/**
 * How dark a cell is, 0–4. Submits rather than accepts, so a hard day of trying
 * shows up as effort — but the top level is reserved for a day that also solved
 * something, so the darkest colour still means "I got one".
 */
export function activityLevel(cell: DayCell): 0 | 1 | 2 | 3 | 4 {
  const accepted = "accepted" in cell ? cell.accepted : 0;
  if (cell.submits === 0) return 0;
  if (accepted > 0 && cell.submits >= 4) return 4;
  if (cell.submits >= 4) return 3;
  if (accepted > 0) return 2;
  return 1;
}

/** One-line description of a cell, for the cell's label and tooltip. */
export function describeCell(cell: DayCell): string {
  if (cell.submits === 0) return "No submissions";
  const submits = `${cell.submits} submit${cell.submits === 1 ? "" : "s"}`;
  const accepted = "accepted" in cell ? cell.accepted : 0;
  return accepted > 0 ? `${submits} · accepted` : submits;
}
