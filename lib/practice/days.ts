/**
 * Calendar-day arithmetic for the streak and the activity calendar.
 *
 * A "day" here is a `YYYY-MM-DD` string in the viewer's local time, never a
 * `Date` and never the server's UTC day. Two reasons:
 *
 *   - The question the feature asks is "did I practise on Tuesday?", and the
 *     answer has to follow the clock on the wall where the user was sitting.
 *   - A string key sorts, compares, and survives a round trip through Postgres
 *     `date`, JSON, and `Map` without a timezone reappearing in the middle.
 *
 * The offset is stored per submission (`utc_offset_minutes`) rather than read
 * from the server's environment, so a row keeps the day it was practised on
 * even if the process timezone, the machine, or the season later changes.
 *
 * Client-safe: this module must not import the database client.
 */

/** Minutes a local clock is ahead of UTC — `+330` for IST, `-480` for PST. */
export function utcOffsetMinutesFor(date: Date = new Date()): number {
  // `getTimezoneOffset` returns minutes to *add* to local time to reach UTC,
  // which is the opposite sign of the offset this app stores.
  return -date.getTimezoneOffset();
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * The local calendar day an instant falls on, given the viewer's offset.
 *
 * Shifting the instant and then reading its UTC fields is deliberate: it is
 * pure arithmetic, so it cannot depend on the timezone database the process
 * happens to have, or on the host's `TZ`.
 */
export function dayKey(iso: string | Date, offsetMinutes: number): string {
  const instant = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`dayKey: not a date — ${String(iso)}`);
  }
  const shifted = new Date(instant.getTime() + offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

/** Midnight UTC of a day key, for calendar arithmetic only — never displayed. */
export function dayKeyToUtcDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`dayKeyToUtcDate: expected YYYY-MM-DD, got "${key}"`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's key in the viewer's own timezone. */
export function todayKey(now: Date = new Date()): string {
  return dayKey(now, utcOffsetMinutesFor(now));
}

/** A new key `amount` days later (or earlier, with a negative amount). */
export function addDays(key: string, amount: number): string {
  const base = dayKeyToUtcDate(key);
  base.setUTCDate(base.getUTCDate() + amount);
  return dayKey(base, 0);
}

/** Inclusive range of keys, oldest first. */
export function dayRange(start: string, end: string): string[] {
  const keys: string[] = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    keys.push(key);
  }
  return keys;
}

/**
 * Days between two keys, `to - from`. Negative when `to` is earlier.
 *
 * Both keys are treated as midnight UTC, so the subtraction is an exact
 * multiple of 24 hours and no daylight-saving boundary can round it.
 */
export function daysBetween(from: string, to: string): number {
  const millis = dayKeyToUtcDate(to).getTime() - dayKeyToUtcDate(from).getTime();
  return Math.round(millis / 86_400_000);
}

/** 0 = Sunday, matching the calendar's first column. */
export function weekdayIndex(key: string): number {
  return dayKeyToUtcDate(key).getUTCDay();
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "Tue 12 Mar 2026" — the label a calendar cell announces. */
export function describeDay(key: string): string {
  const date = dayKeyToUtcDate(key);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

/** "12 Mar" — the compact axis label under a calendar column. */
export function shortDayLabel(key: string): string {
  const date = dayKeyToUtcDate(key);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
