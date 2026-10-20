import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { inArray, sql } from "drizzle-orm";

import { db, pool } from "@/lib/db";
import {
  problemProgress,
  problems,
  reviewCards,
  reviewLogs,
} from "@/lib/db/schema";
import { dayBounds } from "@/lib/practice/days";
import {
  emptyCard,
  scheduleRating,
  serializeCard,
  serializeLog,
} from "@/lib/reviews/scheduler";

import { loadCoachDay } from "./coach";

const DAY = "2026-10-18";
const OFFSET = 330;
const NOW = new Date("2026-10-18T12:00:00.000Z");

const SIGNATURE = {
  name: "solve",
  params: [{ name: "n", kind: "int" as const }],
  returns: "int" as const,
};

async function insertProblem(suffix: string) {
  const [row] = await db
    .insert(problems)
    .values({
      slug: `__coach-${suffix}-${crypto.randomUUID()}`,
      number: 9_800_000 + Math.floor(Math.random() * 20_000),
      position: 9_800_000,
      title: "Coach fixture",
      difficulty: "easy",
      topic: "Arrays & Hashing",
      statement: "fixture — not a catalog problem",
      signature: SIGNATURE,
    })
    .returning({ id: problems.id });
  return row!.id;
}

describe("loadCoachDay", () => {
  const ids: string[] = [];
  let start = new Date();
  let end = new Date();
  let cards: string[] = [];

  async function insertCard(problemId: string): Promise<string> {
    const card = emptyCard(NOW);
    const [row] = await db
      .insert(reviewCards)
      .values({
        problemId,
        active: true,
        dueAt: card.due,
        card: serializeCard(card),
        revision: 1,
        schedulerVersion: "test",
      })
      .returning({ id: reviewCards.id });
    return row!.id;
  }

  async function insertRating(
    problemId: string,
    cardId: string,
    reviewedAt: Date,
  ) {
    const card = emptyCard(NOW);
    const scheduled = scheduleRating(card, "good", NOW);
    await db.insert(reviewLogs).values({
      requestId: crypto.randomUUID(),
      problemId,
      cardId,
      rating: "good",
      expectedRevision: 0,
      reviewedAt,
      beforeCard: serializeCard(card),
      afterCard: serializeCard(scheduled.card),
      fsrsLog: serializeLog(scheduled.log),
      schedulerVersion: "test",
      revisionAfter: 1,
      next: sql`'null'::jsonb`,
    });
  }

  before(async () => {
    ({ start, end } = dayBounds(DAY, OFFSET));

    const first = await insertProblem("one");
    const second = await insertProblem("two");
    const third = await insertProblem("three");
    const fourth = await insertProblem("four");
    const fifth = await insertProblem("five");
    ids.push(first, second, third, fourth, fifth);

    await db.insert(problemProgress).values([
      {
        problemId: first,
        status: "solved",
        solvedAt: new Date(start.getTime() - 1),
      },
      { problemId: second, status: "solved", solvedAt: start },
      {
        problemId: third,
        status: "solved",
        solvedAt: new Date(end.getTime() - 1),
      },
      { problemId: fourth, status: "solved", solvedAt: end },
      { problemId: fifth, status: "attempted", solvedAt: null },
    ]);

    cards = [
      await insertCard(first),
      await insertCard(second),
      await insertCard(third),
      await insertCard(fourth),
    ];

    await insertRating(first, cards[0]!, new Date(start.getTime() - 1));
    await insertRating(first, cards[0]!, start);
    await insertRating(second, cards[1]!, new Date(end.getTime() - 1));
    await insertRating(second, cards[1]!, end);
    await insertRating(third, cards[2]!, new Date(start.getTime() - 1));
    await insertRating(fourth, cards[3]!, end);
  });

  after(async () => {
    if (ids.length > 0) {
      await db.delete(reviewLogs).where(inArray(reviewLogs.problemId, ids));
      await db.delete(reviewCards).where(inArray(reviewCards.problemId, ids));
      await db
        .delete(problemProgress)
        .where(inArray(problemProgress.problemId, ids));
      await db.delete(problems).where(inArray(problems.id, ids));
    }
    await pool.end();
  });

  it("counts first solves and distinct rated cards inside the local day", async () => {
    const work = await loadCoachDay(DAY, OFFSET);

    // solvedAt: start-1 excluded, start included, end-1 included, end excluded,
    // null excluded. Distinct cards rated: two cards, each with one in-window
    // rating; the out-of-window ratings do not add a third.
    assert.deepEqual(work, { solvedToday: 2, reviewsRatedToday: 2 });
  });

  it("returns zeroes for a day with no work", async () => {
    assert.deepEqual(await loadCoachDay("2019-01-01", OFFSET), {
      solvedToday: 0,
      reviewsRatedToday: 0,
    });
  });
});
