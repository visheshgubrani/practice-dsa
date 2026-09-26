import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  dayKey,
  dayKeyToUtcDate,
  dayRange,
  daysBetween,
  describeDay,
  shortDayLabel,
  todayKey,
  utcOffsetMinutesFor,
  weekdayIndex,
} from "@/lib/practice/days";

/**
 * The day is the streak calendar's unit of truth, and every bug in it is an
 * off-by-one-day bug around a boundary. These cases are the boundaries.
 */

const IST = 330; // +05:30
const PST = -480; // -08:00

describe("dayKey", () => {
  it("keeps a midday instant on its own day in any offset", () => {
    const noon = "2026-03-12T12:00:00.000Z";
    assert.equal(dayKey(noon, 0), "2026-03-12");
    assert.equal(dayKey(noon, IST), "2026-03-12");
    assert.equal(dayKey(noon, PST), "2026-03-12");
  });

  it("moves a late-UTC instant onto the next day east of UTC", () => {
    // 23:45 UTC is already 05:15 the next morning in IST.
    assert.equal(dayKey("2026-03-12T23:45:00.000Z", IST), "2026-03-13");
    assert.equal(dayKey("2026-03-12T18:30:00.000Z", IST), "2026-03-13");
    assert.equal(dayKey("2026-03-12T18:29:00.000Z", IST), "2026-03-12");
  });

  it("moves an early-UTC instant onto the previous day west of UTC", () => {
    // 00:15 UTC is still 16:15 the previous afternoon in PST.
    assert.equal(dayKey("2026-03-12T00:15:00.000Z", PST), "2026-03-11");
    assert.equal(dayKey("2026-03-12T08:00:00.000Z", PST), "2026-03-12");
    assert.equal(dayKey("2026-03-12T07:59:00.000Z", PST), "2026-03-11");
  });

  it("accepts a Date as well as an ISO string", () => {
    assert.equal(
      dayKey(new Date("2026-03-12T23:45:00.000Z"), IST),
      "2026-03-13",
    );
  });

  it("refuses a value that is not a date", () => {
    assert.throws(() => dayKey("not-a-date", 0), /not a date/);
  });
});

describe("utcOffsetMinutesFor", () => {
  it("is positive east of UTC and negative west", () => {
    // `getTimezoneOffset` is inverted, so the sign is the thing worth pinning.
    const frozen = new Date("2026-01-15T12:00:00.000Z");
    const offset = utcOffsetMinutesFor(frozen);
    assert.equal(typeof offset, "number");
    assert.equal(Number.isInteger(offset), true);
    assert.equal(
      offset,
      -new Date("2026-01-15T12:00:00.000Z").getTimezoneOffset(),
    );
  });
});

describe("day arithmetic", () => {
  it("adds and subtracts days across month and year boundaries", () => {
    assert.equal(addDays("2026-03-12", 1), "2026-03-13");
    assert.equal(addDays("2026-03-31", 1), "2026-04-01");
    assert.equal(addDays("2026-01-01", -1), "2025-12-31");
    assert.equal(addDays("2026-03-12", 0), "2026-03-12");
  });

  it("handles a leap day", () => {
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2028-02-29", 1), "2028-03-01");
  });

  it("measures the gap between two keys", () => {
    assert.equal(daysBetween("2026-03-12", "2026-03-12"), 0);
    assert.equal(daysBetween("2026-03-12", "2026-03-13"), 1);
    assert.equal(daysBetween("2026-03-13", "2026-03-12"), -1);
    assert.equal(daysBetween("2026-03-12", "2025-03-12"), -365);
  });

  it("builds an inclusive range, oldest first", () => {
    assert.deepEqual(dayRange("2026-03-11", "2026-03-14"), [
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
    ]);
    assert.deepEqual(dayRange("2026-03-11", "2026-03-11"), ["2026-03-11"]);
    assert.deepEqual(dayRange("2026-03-12", "2026-03-11"), []);
  });

  it("keeps the weekday stable for a given key", () => {
    // 2026-03-12 is a Thursday.
    assert.equal(weekdayIndex("2026-03-12"), 4);
    assert.equal(weekdayIndex(addDays("2026-03-12", 7)), 4);
    assert.equal(weekdayIndex("2026-03-15"), 0);
  });

  it("round-trips through the UTC date helper", () => {
    for (const key of ["2026-03-12", "2026-01-01", "2028-02-29"]) {
      assert.equal(dayKey(dayKeyToUtcDate(key), 0), key);
    }
  });

  it("labels a day for a tooltip and an axis", () => {
    assert.equal(describeDay("2026-03-12"), "Thursday 12 Mar 2026");
    assert.equal(shortDayLabel("2026-03-12"), "12 Mar");
  });

  it("refuses a malformed key", () => {
    assert.throws(() => dayKeyToUtcDate("12/03/2026"), /YYYY-MM-DD/);
  });
});

describe("todayKey", () => {
  it("agrees with dayKey at the local offset", () => {
    const now = new Date("2026-03-12T23:45:00.000Z");
    assert.equal(todayKey(now), dayKey(now, utcOffsetMinutesFor(now)));
  });
});
