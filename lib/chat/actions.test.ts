import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { primaryActionStates, moreActionStates, hasCompletedTutorReply } from "./actions";
import type { TutorUIMessage } from "./types";

it("requires a nonempty completed assistant reply, live and restored", () => {
  const reply: TutorUIMessage = { id: "reply", role: "assistant", parts: [{ type: "text", text: "A useful explanation" }] };
  assert.equal(hasCompletedTutorReply([reply]), false);
  for (const completionStatus of ["pending", "failed", "aborted"] as const) {
    assert.equal(hasCompletedTutorReply([{ ...reply, metadata: { completionStatus } }]), false);
    assert.equal(hasCompletedTutorReply([reply], { reply: completionStatus }), false);
  }
  const completed: TutorUIMessage = { ...reply, metadata: { completionStatus: "completed" } };
  assert.equal(hasCompletedTutorReply([completed]), true);
  assert.equal(hasCompletedTutorReply([reply], { reply: "completed" }), true);
  assert.equal(hasCompletedTutorReply([completed], { reply: "aborted" }), false);
  assert.equal(hasCompletedTutorReply([{ ...completed, parts: [] }]), false);
  assert.equal(hasCompletedTutorReply([{ ...completed, role: "user" }]), false);
  assert.equal(hasCompletedTutorReply([completed, { ...reply, id: "partial" }], { partial: "aborted" }), true);
});

describe("chat action availability", () => {
  it("offers hint, make it concrete, and a tiny example above the composer", () => {
    const states = primaryActionStates({ isStreaming: false, hasTutorReply: true });
    assert.deepEqual(
      states.map((state) => state.action.label),
      ["Give me a hint", "Make it concrete", "Show a tiny example"],
    );
  });

  it("holds Make it concrete until a tutor reply has finished", () => {
    const before = primaryActionStates({ isStreaming: false, hasTutorReply: false });
    const concrete = before.find((state) => state.action.id === "concrete");
    const hint = before.find((state) => state.action.id === "hint");
    assert.equal(concrete?.disabled, true);
    assert.equal(hint?.disabled, false);

    const after = primaryActionStates({ isStreaming: false, hasTutorReply: true });
    assert.equal(
      after.find((state) => state.action.id === "concrete")?.disabled,
      false,
    );
  });

  it("disables every action while the tutor is answering", () => {
    const streaming = primaryActionStates({
      isStreaming: true,
      hasTutorReply: true,
    });
    assert.ok(streaming.every((state) => state.disabled));

    const more = moreActionStates({ isStreaming: true });
    assert.ok(more.every((state) => state.disabled));
    assert.deepEqual(
      more.map((state) => state.action.label),
      [
        "Explain it simply",
        "Review my code",
        "Why is this failing?",
        "Explain the complexity",
      ],
    );
  });

  it("offers all four More help actions once the tutor is idle", () => {
    const more = moreActionStates({ isStreaming: false });
    assert.ok(more.every((state) => !state.disabled));
  });
});
