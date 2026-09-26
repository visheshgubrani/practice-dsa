import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { daysBetween, weekdayIndex } from "@/lib/practice/days";
import {
  activityLevel,
  currentStreak,
  describeCell,
  heatmapWeeks,
  longestStreak,
  summarizeStreak,
  type ActivityDay,
} from "@/lib/progress/calendar";

/**
 * The streak rules are a product decision, so they are pinned here: today may
 * be empty without breaking a run, yesterday may not be empty twice, and a
 * revise counts because it is still a Submit.
 */

function days(...keys: string[]): ActivityDay[] {
  return keys.map((day) => ({ day, submits: 1, accepted: 1 }));
}

describe("currentStreak", () => {
  it("counts a run ending today", () => {
    assert.equal(
      currentStreak(["2026-03-10", "2026-03-11", "2026-03-12"], "2026-03-12"),
      3,
    );
  });

  it("keeps a run alive when today has not been practised yet", () => {
    assert.equal(
      currentStreak(["2026-03-10", "2026-03-11"], "2026-03-12"),
      2,
    );
  });

  it("ends the run after two empty days", () => {
    assert.equal(currentStreak(["2026-03-09", "2026-03-10"], "2026-03-12"), 0);
  });

  it("is zero with no history", () => {
    assert.equal(currentStreak([], "2026-03-12"), 0);
  });

  it("ignores a single day today", () => {
    assert.equal(currentStreak(["2026-03-12"], "2026-03-12"), 1);
  });

  it("counts only the run that reaches today, not an earlier longer one", () => {
    assert.equal(
      currentStreak(
        ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-11"],
        "2026-03-12",
      ),
      1,
    );
  });

  it("does not count duplicates twice", () => {
    assert.equal(
      currentStreak(["2026-03-12", "2026-03-12", "2026-03-11"], "2026-03-12"),
      2,
    );
  });

  it("survives a month boundary", () => {
    assert.equal(
      currentStreak(["2026-02-28", "2026-03-01"], "2026-03-01"),
      2,
    );
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in history", () => {
    assert.equal(
      longestStreak([
        "2026-03-01",
        "2026-03-02",
        "2026-03-03",
        "2026-03-04",
        "2026-03-11",
      ]),
      4,
    );
  });

  it("is zero or one for trivial histories", () => {
    assert.equal(longestStreak([]), 0);
    assert.equal(longestStreak(["2026-03-12"]), 1);
  });

  it("sorts an unordered history before scanning", () => {
    assert.equal(longestStreak(["2026-03-13", "2026-03-11", "2026-03-12"]), 3);
  });
});

describe("summarizeStreak", () => {
  it("reports current, longest, active days, and this week", () => {
    const summary = summarizeStreak(
      ["2026-03-01", "2026-03-02", "2026-03-11", "2026-03-12"],
      "2026-03-12",
    );
    assert.deepEqual(summary, {
      current: 2,
      longest: 2,
      activeDays: 4,
      thisWeek: 2,
    });
  });

  it("does not count a day in the future as this week", () => {
    assert.equal(
      summarizeStreak(["2026-03-20"], "2026-03-12").thisWeek,
      0,
    );
  });
});

describe("heatmapWeeks", () => {
  it("returns a full grid of 7-day columns ending with today's week", () => {
    const cells = heatmapWeeks({
      days: days("2026-03-12"),
      end: "2026-03-12",
      weeks: 3,
    });

    assert.equal(cells.length, 3);
    for (const column of cells) assert.equal(column.length, 7);
    // Every column is a Sunday-to-Saturday week.
    for (const column of cells) assert.equal(weekdayIndex(column[0]!.day), 0);

    const flat = cells.flat();
    assert.equal(flat.length, 21);
    // 21 consecutive days, and today lands in the grid.
    assert.ok(flat.some((cell) => cell.day === "2026-03-12"));
    for (let index = 1; index < flat.length; index += 1) {
      assert.equal(daysBetween(flat[index - 1]!.day, flat[index]!.day), 1);
    }
  });

  it("fills days with no activity so the grid has no holes", () => {
    const flat = heatmapWeeks({
      days: days("2026-03-12"),
      end: "2026-03-12",
      weeks: 2,
    }).flat();

    assert.equal(flat.filter((cell) => cell.submits > 0).length, 1);
    assert.equal(
      flat.filter((cell) => cell.submits === 0).length,
      13,
    );
  });

  it("keeps the activity it was handed, including a revise day", () => {
    const flat = heatmapWeeks({
      days: [{ day: "2026-03-12", submits: 2, accepted: 0 }],
      end: "2026-03-12",
      weeks: 1,
    }).flat();

    const cell = flat.find((entry) => entry.day === "2026-03-12");
    assert.deepEqual(cell, { day: "2026-03-12", submits: 2, accepted: 0 });
  });

  it("extends the grid past today so the current week is complete", () => {
    const flat = heatmapWeeks({
      days: [],
      end: "2026-03-12", // a Thursday
      weeks: 1,
    }).flat();

    assert.equal(flat.length, 7);
    assert.equal(flat[0]!.day, "2026-03-08"); // that week's Sunday
    assert.equal(flat.at(-1)!.day, "2026-03-14"); // that week's Saturday
  });

  it("defaults to 53 weeks — a full year of calendar", () => {
    const cells = heatmapWeeks({ days: [], end: "2026-03-12" });
    assert.equal(cells.length, 53);
    // 53 Sundays ending with the week of `end`.
    assert.equal(cells[0]![0]!.day, "2025-03-09");
    assert.equal(cells.at(-1)!.at(-1)!.day, "2026-03-14");
  });
});

describe("activityLevel", () => {
  it("reserves the darkest tone for a busy day that also solved something", () => {
    assert.equal(activityLevel({ day: "d", submits: 0, accepted: 0 }), 0);
    assert.equal(activityLevel({ day: "d", submits: 1, accepted: 0 }), 1);
    assert.equal(activityLevel({ day: "d", submits: 1, accepted: 1 }), 2);
    assert.equal(activityLevel({ day: "d", submits: 5, accepted: 0 }), 3);
    assert.equal(activityLevel({ day: "d", submits: 5, accepted: 1 }), 4);
  });
});

describe("describeCell", () => {
  it("reads as a sentence for the tooltip", () => {
    assert.equal(describeCell({ day: "d", submits: 0, accepted: 0 }), "No submissions");
    assert.equal(describeCell({ day: "d", submits: 1, accepted: 0 }), "1 submit");
    assert.equal(
      describeCell({ day: "d", submits: 2, accepted: 1 }),
      "2 submits · accepted",
    );
  });
});
