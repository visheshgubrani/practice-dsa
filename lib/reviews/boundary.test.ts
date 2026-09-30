import assert from "node:assert/strict";
import { it } from "node:test";
import { scheduleReviewBoundary } from "./boundary";

it("re-arms long FSRS intervals and fires once at the due boundary", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  const due = 90 * 86_400_000;
  let calls = 0;
  scheduleReviewBoundary(new Date(due).toISOString(), () => calls++);
  for (let i = 0; i < 3; i++) {
    t.mock.timers.tick(2_147_483_647);
    assert.equal(calls, 0);
  }
  t.mock.timers.tick(due - Date.now() + 49);
  assert.equal(calls, 0);
  t.mock.timers.tick(1);
  assert.equal(calls, 1);
  t.mock.timers.tick(86_400_000);
  assert.equal(calls, 1);
});

it("cancels a boundary after re-arming and ignores malformed dates", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  let calls = 0;
  const cancel = scheduleReviewBoundary(new Date(4_000_000_000).toISOString(), () => calls++);
  t.mock.timers.tick(2_147_483_647);
  cancel();
  scheduleReviewBoundary("invalid", () => calls++);
  t.mock.timers.tick(2_147_483_647);
  assert.equal(calls, 0);
});
