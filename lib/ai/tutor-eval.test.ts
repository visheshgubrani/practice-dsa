import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";
import { buildTutorProblemContext, buildTutorTeachingInstructions } from "./prompts";
import { previousContractTurn, decoderBoundaryFailure, tutorFactFailure } from "./tutor-eval";
import { getLanguage } from "@/lib/languages";
import { toPublicProblem } from "@/lib/problems/authoring";
import { PROBLEMS } from "@/lib/problems/catalog";

it("baseline retains identical problem context, attachments, and context-limit notes", () => {
  const authored = PROBLEMS.find((p) => p.slug === "two-sum")!;
  const problem = toPublicProblem(authored);
  const context = buildTutorProblemContext(problem, getLanguage("python"));
  const notes = "\nContext omitted earlier messages.";
  const turn = { instructions: buildTutorTeachingInstructions() + "\n\n" + context + notes, messages: [], truncated: true, omittedTurns: 2 };
  const baseline = previousContractTurn(turn);
  assert.ok(baseline.instructions.endsWith("\n\n" + context + notes));
  assert.equal(baseline.messages, turn.messages);
  assert.equal(baseline.truncated, turn.truncated);
});

it("catches factual mistakes from manual review of the third live attempt", () => {
  const recorded = JSON.parse(readFileSync("docs/plan/evals/tutor-consistency-beginner-revised-review-attempt3.json", "utf8"));
  const fixtures = [
    ["confusion-and-resume-connected", 3, "confused", "two-sum"],
    ["codec-decode-connected", 1, "like-this", "encode-and-decode-strings"],
  ] as const;
  for (const [id, runNumber, turnId, slug] of fixtures) {
    const run = recorded.runs.find((r: { id: string; run: number }) => r.id === id && r.run === runNumber);
    const turn = run.turns.find((t: { id: string }) => t.id === turnId);
    const problem = toPublicProblem(PROBLEMS.find((p) => p.slug === slug)!);
    assert.ok(tutorFactFailure(problem, turn.editorCode, turn.user, turn.text), `${id}/${turnId}`);
  }
  const parens = toPublicProblem(PROBLEMS.find((p) => p.slug === "valid-parentheses")!);
  const countingReply = recorded.runs.find((r: { id: string; run: number }) => r.id === "parens-order-supplied" && r.run === 2).turns.find((t: { id: string }) => t.id === "counting").text;
  assert.ok(tutorFactFailure(parens, "", "Would counting each bracket type work?", countingReply));
  assert.equal(tutorFactFailure(parens, "", "Would counting total openers and closers work?", countingReply), null);
  const problem = toPublicProblem(PROBLEMS.find((p) => p.slug === "two-sum")!);
  assert.equal(tutorFactFailure(problem, "", "", "Consider the illustrative input `[2, 7]`."), null);
  assert.equal(tutorFactFailure(problem, "", "", "The statement example `[2, 7, 11, 15]` has target 9."), null);
});

it("catches the recorded short remaining implementation without a return or loop", () => {
  const recorded = JSON.parse(readFileSync("docs/plan/evals/tutor-consistency-beginner-revised.json", "utf8"));
  const run = recorded.runs.find((r: { id: string; run: number }) => r.id === "codec-decode-connected" && r.run === 2);
  const reply = run.turns.find((t: { id: string }) => t.id === "like-this").text;
  assert.ok(decoderBoundaryFailure("like-this", reply));
});

it("catches prose cursor instructions and keeps local conceptual explanations", () => {
  for (const text of ["Then advance i by the length.", "Move `i` past the payload.", "Set the cursor to the end.", "Now i jumps past the word."]) {
    assert.ok(decoderBoundaryFailure("append-length", text), text);
  }
  assert.equal(decoderBoundaryFailure("append-length", "The length measures the word; append the word itself, not the number."), null);
  assert.equal(decoderBoundaryFailure("like-this", "Yes, j marks # and s[i:j] holds the digits."), null);
});

it("distinguishes an existing cursor assignment from a new advancement instruction", () => {
  const editor = "i = j + 1";
  assert.equal(decoderBoundaryFailure("append-length", "After `i = j + 1`, i points at the payload.", editor), null);
  assert.ok(decoderBoundaryFailure("append-length", "Then advance i past the word.", editor));
  assert.equal(decoderBoundaryFailure("append-length", "Your code has already read the length and moved `i` past the `#`.", editor), null);
  assert.ok(decoderBoundaryFailure("append-length", "Your code has already read the length and moved `i` past the `#`; next advance i past the word.", editor));
  assert.ok(decoderBoundaryFailure("append-length", "Your code has already read the length and moved `i` past the `#`. Now move i past the payload.", editor));
});
