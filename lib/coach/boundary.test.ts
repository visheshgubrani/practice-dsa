import assert from "node:assert/strict";
import { it } from "node:test";

import { scheduleLocalMidnight } from "./boundary";

it("fires just after the next local midnight and re-arms", (t) => {
  const now = new Date(2026, 9, 18, 23, 59, 59, 0);
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: now.getTime() });
  let calls = 0;

  const cancel = scheduleLocalMidnight(() => calls++);

  t.mock.timers.tick(1_999);
  assert.equal(calls, 0);
  t.mock.timers.tick(1);
  assert.equal(calls, 1);

  // After midnight the next target is the following local midnight.
  t.mock.timers.tick(24 * 60 * 60 * 1_000 - 1);
  assert.equal(calls, 1);
  t.mock.timers.tick(1);
  assert.equal(calls, 2);
  cancel();
});

it("does not fire early during a normal day and can be cancelled", (t) => {
  t.mock.timers.enable({
    apis: ["Date", "setTimeout"],
    now: new Date(2026, 9, 18, 12, 0, 0, 0).getTime(),
  });
  let calls = 0;
  const cancel = scheduleLocalMidnight(() => calls++);

  t.mock.timers.tick(12 * 60 * 60 * 1_000 - 1);
  assert.equal(calls, 0);
  cancel();
  t.mock.timers.tick(10_000);
  assert.equal(calls, 0);
});
