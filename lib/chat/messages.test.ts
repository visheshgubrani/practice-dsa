import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completionFromStream,
  messageText,
  threadTitleFrom,
  THREAD_TITLE_MAX,
} from "./messages";

describe("messageText", () => {
  it("joins text parts and ignores other types", () => {
    assert.equal(
      messageText([
        { type: "step-start" },
        { type: "text", text: "Why " },
        { type: "text", text: "this fail?" },
      ]),
      "Why this fail?",
    );
  });
});

describe("threadTitleFrom", () => {
  it("collapses whitespace and truncates long questions", () => {
    assert.equal(threadTitleFrom("  why   this  "), "why this");
    const long = "x".repeat(THREAD_TITLE_MAX + 8);
    const title = threadTitleFrom(long);
    assert.equal(title.length, THREAD_TITLE_MAX);
    assert.equal(title.endsWith("…"), true);
  });
});

describe("completionFromStream", () => {
  it("maps abort and failure separately from a finished answer", () => {
    assert.equal(
      completionFromStream({ isAborted: true, outcomeStatus: "completed" }),
      "aborted",
    );
    assert.equal(
      completionFromStream({ isAborted: false, outcomeStatus: "failed" }),
      "failed",
    );
    assert.equal(
      completionFromStream({ isAborted: false, outcomeStatus: "completed" }),
      "completed",
    );
  });
});
