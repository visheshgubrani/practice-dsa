import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { it } from "node:test";
import { runInNewContext } from "node:vm";

import { isValidElement, type ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

import type { ReviewNotesControls } from "@/components/workspace/review-controls";
import type { ReviewSession } from "@/components/workspace/review-session";
import type { useReviewCard } from "@/lib/hooks/use-review-card";
import * as client from "./client";
import * as types from "./types";

// Run the actual hook and JSX conditions without a DOM or database. Only React
// hook storage, presentation primitives, and transport are replaced.
function loadSource<T>(
  path: string,
  imports: Record<string, unknown>,
  globals: Record<string, unknown> = {},
): T {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(name in imports, `Unexpected test import: ${name}`);
      return imports[name];
    },
    crypto,
    ...globals,
  });
  return exports as T;
}

function buttonWithText(node: ReactNode, label: string): ReactNode {
  if (Array.isArray(node)) {
    return node.map((child) => buttonWithText(child, label)).find(Boolean) ?? null;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === "button" && node.props.children === label) return node;
  return buttonWithText(node.props.children, label);
}

it("reopens and replays a committed first rating after its response is lost", async () => {
  const slots: unknown[] = [];
  let cursor = 0;
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = typeof initial === "function" ? initial() : initial;
      }
      return [slots[index], (value: unknown) => {
        slots[index] = typeof value === "function" ? value(slots[index]) : value;
      }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback<T>(callback: T) { return callback; },
    useEffect() {},
  };
  let canonical = types.EMPTY_REVIEW_CARD;
  let saved: types.ReviewRateResult | null = null;
  let logs = 0;
  const requests: types.ReviewRateRequest[] = [];
  const hook = loadSource<{ useReviewCard: typeof useReviewCard }>(
    "../hooks/use-review-card.ts",
    { react, "@/lib/reviews/client": client, "@/lib/reviews/types": types },
    {
      async fetch(_url: string, options?: RequestInit) {
        if (options?.method === "POST") {
          const request = JSON.parse(String(options.body)) as types.ReviewRateRequest;
          requests.push(request);
          if (!saved) {
            logs++;
            saved = {
              ...request,
              dueAt: "2026-10-11T10:00:00.000Z",
              reviewedAt: "2026-10-08T10:00:00.000Z",
              revision: 2,
              next: null,
            };
            canonical = {
              enrolled: true, active: true, dueAt: saved.dueAt,
              lastRating: request.rating, revision: 2,
            };
            throw new Error("Response lost after commit");
          }
          assert.deepEqual(request, requests[0]);
          return Response.json(saved);
        }
        assert.equal(options?.method, undefined, "Recovery must not change active state");
        return Response.json(canonical);
      },
    },
  );
  const render = () => {
    cursor = 0;
    return hook.useReviewCard("two-sum");
  };
  let schedule = render();
  await schedule.refresh();
  schedule = render();
  const submissionId = crypto.randomUUID();
  schedule.openRating("initial", submissionId);
  schedule = render();
  schedule.rate("good");
  await setImmediate();
  schedule = render();
  assert.equal(schedule.ratingCanRetry, true);
  const pending = schedule.ratingPending;
  const context = schedule.ratingContext;
  assert.ok(pending);
  assert.equal(pending.expectedRevision, 0);
  assert.equal(schedule.closeRating(), true);
  await schedule.refresh();
  schedule = render();
  assert.equal(schedule.card.enrolled, true);
  assert.equal(schedule.card.lastRating, "good");

  const uiImports = {
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: "a" },
    "@/components/ui/alert": { Alert: "aside", AlertTitle: "h3", AlertDescription: "p" },
    "@/components/ui/button": { Button: "button", buttonVariants: () => "" },
    "@/components/ui/dialog": { DialogTrigger: "button" },
    "@/components/ui/spinner": { Spinner: "span" },
    "@/lib/utils": { cn: () => "" },
  };
  const controls = loadSource<{ ReviewNotesControls: typeof ReviewNotesControls }>(
    "../../components/workspace/review-controls.tsx", uiImports,
  );
  const session = loadSource<{ ReviewSession: typeof ReviewSession }>(
    "../../components/workspace/review-session.tsx",
    { ...uiImports, react, "@/lib/reviews/boundary": {} },
  );
  // Recovery stays reachable if another tab pauses the card or loading fails.
  for (const state of [
    schedule,
    { ...schedule, card: { ...schedule.card, active: false } },
    { ...schedule, status: "error" as const },
  ]) {
    const notes = controls.ReviewNotesControls({
      slug: "two-sum", schedule: state,
      onOpenRating: () => state.openRating("initial", crypto.randomUUID()),
    });
    const review = session.ReviewSession({
      schedule: state, onFinishReview: () => state.openRating("recall"),
    });
    const retry = buttonWithText(notes, "Retry rating");
    assert.ok(isValidElement<{ onClick: () => void }>(retry));
    assert.ok(buttonWithText(review, "Retry rating"));
    assert.equal(buttonWithText(notes, "Pause reviews"), null);
    assert.equal(buttonWithText(notes, "Resume reviews"), null);
    retry.props.onClick();
    schedule = render();
    assert.equal(schedule.ratingPending, pending);
    assert.equal(schedule.ratingContext, context);
  }
  schedule.retryRating();
  await setImmediate();
  schedule = render();
  assert.equal(requests.length, 2);
  assert.equal(JSON.stringify(requests[1]), JSON.stringify(pending));
  assert.equal(logs, 1);
  assert.equal(schedule.ratingPending, null);
  assert.equal(schedule.ratingResult?.requestId, pending.requestId);
});
