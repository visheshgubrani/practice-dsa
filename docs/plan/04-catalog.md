# Phase 4 — Expand to 16 verified problems and measure Submit latency

**Status:** blocked on Phase 3

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

### 4.2 Batch A — six problems

- [ ] Contains Duplicate
- [ ] Best Time to Buy and Sell Stock
- [ ] Maximum Subarray
- [ ] Product of Array Except Self
- [ ] Longest Substring Without Repeating Characters
- [ ] Merge Intervals (uses the Phase 1 compare policy: ordered endpoints, ascending interval order)

- [ ] Batch A conformance + seed + `piston:check`
- [ ] Spot-check each in the UI

### 4.3 Batch B — six problems

- [ ] Binary Search
- [ ] Search Insert Position
- [ ] Valid Anagram
- [ ] Longest Consecutive Sequence
- [ ] Daily Temperatures
- [ ] Container With Most Water

- [ ] Batch B conformance + seed + `piston:check`
- [ ] Spot-check each in the UI

Catalog is now 4 existing + 6 + 6 = 16.

### 4.4 Performance checkpoint

Keep sequential, one-case-per-job execution.

- [ ] Pick the largest suite. Measure successful Submits with the execution cache bypassed.
- [ ] Record end-to-end wall time separately from per-case CPU time.
- [ ] After runtime warm-up, report median and p95 across ten measured runs.
- [ ] Write the numbers into this file under **Results** below.
- [ ] If **p95 is above roughly two seconds**, stop and open a **separate** batching milestone. Do not batch inside this phase.
- [ ] Before any future batching: equivalent first-failure reporting, fresh per-case solution state, preserved per-case timeout. Do not replace individual limits with one whole-suite timeout.

`pnpm problems:check` cannot measure real Submit latency. This checkpoint needs Piston.

### Results

| Metric | Value |
| --- | --- |
| Problem / suite size | |
| Median wall time | |
| p95 wall time | |
| Notes (warm-up, cache bypass, machine) | |

Batching milestone required? `yes` / `no` — fill in after measurement.

## Phase gate

- [ ] Sixteen problems pass `pnpm problems:check`
- [ ] `pnpm piston:check` covers the seeded catalog
- [ ] Latency numbers recorded
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Out of scope

Chat persistence, hosting, new harness kinds, batching implementation (unless the checkpoint fails, in which case it is a new phase, not a silent extra in this one).
