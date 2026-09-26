import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProblemSummary } from "@/lib/problems";
import {
  UNCATEGORIZED,
  formatCount,
  percentSolved,
  summarizeProgress,
  type ProgressLookup,
} from "@/lib/progress/summary";

/**
 * The dashboard's sections come straight out of this function, so what it does
 * with an unknown status, a blank topic, and the roadmap order is the behaviour
 * worth pinning.
 */

function problem(
  slug: string,
  topic: string,
  difficulty: ProblemSummary["difficulty"] = "medium",
): ProblemSummary {
  return {
    slug,
    number: 1,
    title: slug,
    difficulty,
    topic,
    tags: [],
  };
}

function statuses(entries: Record<string, "todo" | "attempted" | "solved">): ProgressLookup {
  return new Map(Object.entries(entries));
}

describe("summarizeProgress", () => {
  it("counts totals and each difficulty", () => {
    const summary = summarizeProgress(
      [
        problem("a", "Stack", "easy"),
        problem("b", "Stack", "medium"),
        problem("c", "Graphs", "hard"),
      ],
      statuses({ a: "solved", b: "attempted", c: "solved" }),
    );

    assert.deepEqual(summary.overall, { solved: 2, attempted: 1, total: 3 });
    assert.deepEqual(summary.byDifficulty.easy, {
      solved: 1,
      attempted: 0,
      total: 1,
    });
    assert.deepEqual(summary.byDifficulty.medium, {
      solved: 0,
      attempted: 1,
      total: 1,
    });
    assert.deepEqual(summary.byDifficulty.hard, {
      solved: 1,
      attempted: 0,
      total: 1,
    });
  });

  it("treats a problem with no status row as not started", () => {
    const summary = summarizeProgress([problem("a", "Stack")], statuses({}));
    assert.deepEqual(summary.overall, { solved: 0, attempted: 0, total: 1 });
  });

  it("keeps the sections in the order the problems arrived", () => {
    const summary = summarizeProgress(
      [
        problem("a", "Arrays & Hashing"),
        problem("b", "Two Pointers"),
        problem("c", "Arrays & Hashing"),
        problem("d", "Stack"),
      ],
      statuses({ a: "solved", c: "solved", d: "attempted" }),
    );

    assert.deepEqual(
      summary.byTopic.map((group) => group.topic),
      ["Arrays & Hashing", "Two Pointers", "Stack"],
    );
    assert.deepEqual(
      summary.byTopic[0]!.problems.map((entry) => entry.slug),
      ["a", "c"],
    );
  });

  it("counts each section", () => {
    const summary = summarizeProgress(
      [
        problem("a", "Arrays & Hashing"),
        problem("b", "Arrays & Hashing"),
        problem("c", "Arrays & Hashing"),
      ],
      statuses({ a: "solved", b: "solved", c: "attempted" }),
    );

    assert.deepEqual(summary.byTopic[0], {
      topic: "Arrays & Hashing",
      solved: 2,
      attempted: 1,
      total: 3,
      problems: summary.byTopic[0]!.problems,
    });
  });

  it("folds a blank topic into Uncategorized instead of dropping the problem", () => {
    const summary = summarizeProgress(
      [problem("a", ""), problem("b", "   "), problem("c", "Stack")],
      statuses({ a: "solved" }),
    );

    assert.deepEqual(
      summary.byTopic.map((group) => group.topic),
      [UNCATEGORIZED, "Stack"],
    );
    assert.equal(summary.byTopic[0]!.total, 2);
    assert.equal(summary.overall.total, 3);
  });

  it("handles an empty catalog", () => {
    const summary = summarizeProgress([], statuses({}));
    assert.deepEqual(summary.overall, { solved: 0, attempted: 0, total: 0 });
    assert.deepEqual(summary.byTopic, []);
  });

  it("ignores a status for a problem that is no longer in the catalog", () => {
    const summary = summarizeProgress(
      [problem("a", "Stack")],
      statuses({ a: "solved", gone: "solved" }),
    );
    assert.deepEqual(summary.overall, { solved: 1, attempted: 0, total: 1 });
  });
});

describe("progress formatting", () => {
  it("renders the counter every card shows", () => {
    assert.equal(formatCount({ solved: 3, attempted: 0, total: 9 }), "3 / 9");
  });

  it("renders a percentage, and never divides by zero", () => {
    assert.equal(percentSolved({ solved: 0, attempted: 0, total: 0 }), 0);
    assert.equal(percentSolved({ solved: 1, attempted: 0, total: 3 }), 33);
    assert.equal(percentSolved({ solved: 9, attempted: 0, total: 9 }), 100);
  });
});
