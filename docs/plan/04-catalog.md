# Phase 4 — Expand to 16 verified problems and measure Submit latency

**Status:** complete

First confirm the existing four still pass conformance against the durable store. Then grow to **16 total** in two batches. Measure Submit latency before considering batching.

## Work units

### 4.1 Authoring workflow (every problem)

For each problem, in this order:

1. Original statement, precise constraints, signature, Python starter.
2. 2–3 visible cases with explanations, at least 8 hidden cases.
3. Cover minima, duplicates, negatives, ordering, and constraint boundaries. Empty inputs only when the contract allows them.
4. Reference solution, comparison policy, approach, complexity notes, `sourceUrl`.
5. `pnpm problems:check`. Review generated expectation candidates by hand. Never auto-replace a mismatch.
6. Add at least one plausible incorrect implementation that the suite rejects.
7. Seed, `pnpm piston:check`, then practice the problem through the UI (fail a hidden case, then accept).

Stay inside current argument kinds and return-value harness. No linked lists, trees, custom classes, or in-place output contracts.

Use larger stress cases selectively. Respect execution/output limits instead of padding counts with huge cases.

- [x] Encode the checklist in validate, conformance, and `piston:check` (statement / constraints / notes / compare, no `void`, catalog-driven fixtures with a wrong-answer reject)
- [x] Existing four still pass `pnpm problems:check`, seed, and `pnpm piston:check` against the durable store
- [x] Document the per-problem order for later batches

Verified 2026-09-20: existing Postgres volume (no wipe); `pnpm problems:check` — 87 checks; seed 4 problems / 48 testcases; `pnpm piston:check` — 23 checks.

### 4.2 Batch A — six problems

- [x] Contains Duplicate
- [x] Best Time to Buy and Sell Stock
- [x] Maximum Subarray
- [x] Product of Array Except Self
- [x] Longest Substring Without Repeating Characters
- [x] Merge Intervals (uses the Phase 1 compare policy: ordered endpoints, ascending interval order)

- [x] Batch A conformance + seed + `piston:check`
- [x] Spot-check each in the UI

Verified 2026-09-20: existing Postgres volume (no wipe); catalog is 10 problems; `pnpm problems:check` — 221 checks; seed 10 / 114 testcases; `pnpm piston:check` — 47 checks. Each Batch A problem: visible-only Submit was Wrong Answer 3/11 with Hidden 1 revealed, then the reference accepted 11/11 (same Submit path the workspace uses; the Cursor browser tab could not reach the locked Next server on :3000).

### 4.3 Batch B — six problems

- [x] Binary Search
- [x] Search Insert Position
- [x] Valid Anagram
- [x] Longest Consecutive Sequence
- [x] Daily Temperatures
- [x] Container With Most Water

- [x] Batch B conformance + seed + `piston:check`
- [x] Spot-check each in the UI

Catalog is now 4 existing + 6 + 6 = 16.

Verified 2026-09-20: existing Postgres volume (no wipe); catalog is 16 problems; `pnpm problems:check` — 358 checks; seed 16 / 180 testcases; `pnpm piston:check` — 71 checks. Each Batch B problem: visible-only Submit was Wrong Answer 3/11 with Hidden 1 revealed, then the reference accepted 11/11 (same Submit path the workspace uses; the Cursor browser tab could not reach the Next server on :3000).

### 4.4 Performance checkpoint

Keep sequential, one-case-per-job execution.

- [x] Pick the largest suite. Measure successful Submits with the execution cache bypassed.
- [x] Record end-to-end wall time separately from per-case CPU time.
- [x] After runtime warm-up, report median and p95 across ten measured runs.
- [x] Write the numbers into this file under **Results** below.
- [x] If **p95 is above roughly two seconds**, stop and open a **separate** batching milestone. Do not batch inside this phase.
- [x] Before any future batching: equivalent first-failure reporting, fresh per-case solution state, preserved per-case timeout. Do not replace individual limits with one whole-suite timeout.

`pnpm problems:check` cannot measure real Submit latency. This checkpoint needs Piston (`pnpm piston:latency`).

### Results

| Metric | Value |
| --- | --- |
| Problem / suite size | `two-sum` · 12 cases (largest seeded suite; four problems tie at 12) |
| Median wall time | 1127.3 ms |
| p95 wall time | 1169.4 ms |
| Notes (warm-up, cache bypass, machine) | One discarded warm-up Submit, then ten measured reference Submits with `clearCache()` before each run. Sequential, one-case-per-job. Median CPU sum 680.0 ms; median CPU max (console `timeMs`) 62.5 ms. Wall samples: 834.0, 956.3, 1078.9, 1100.8, 1118.6, 1136.1, 1148.8, 1150.8, 1159.5, 1177.5 ms. Fedora 44 x86_64, 12th Gen Intel i5-1240P (16 threads), local compose Piston Python 3.12.0. |

Batching milestone required? `no` — p95 is under two seconds. Any later batching still needs equivalent first-failure reporting, fresh per-case solution state, and preserved per-case timeouts (not one whole-suite timeout).

## Phase gate

- [x] Sixteen problems pass `pnpm problems:check`
- [x] `pnpm piston:check` covers the seeded catalog
- [x] Latency numbers recorded
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Verified 2026-09-20: `pnpm problems:check` — 358 checks; `pnpm piston:check` — 71 checks; lint, typecheck, 146 tests, and `pnpm build` passed. Latency: `two-sum` 12 cases, median wall 1127.3 ms, p95 1169.4 ms; no batching milestone.

## Out of scope

Chat persistence, hosting, new harness kinds, batching implementation (unless the checkpoint fails, in which case it is a new phase, not a silent extra in this one).
