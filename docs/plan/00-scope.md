# Scope and invariants

Not a work phase. Read this if a later change starts to drift.

## Agreed product

A LeetCode-shaped personal DSA workbench with a problem list, statement / notes / AI chat, Monaco, Run / Submit, and a tutor that can see the problem and the attempt.

Local only. One user. Python only. Piston for execution. Postgres on the compose stack for durable state.

## Order of work

Trustworthy judging, then durable persistence, then more problems, then a better AI tutor.

The catalog is seeded from `lib/problems/catalog.ts` in NeetCode 150 roadmap order. Phase 7 is complete: 108 of the 150 sheet problems are judgeable by this harness and seeded; the other 42 are deferred with a reason in [`docs/catalog/README.md`](../catalog/README.md). The catalog has 109 rows total, including the out-of-sheet `search-insert-position` problem. Min Stack and Time Based Key-Value Store are the design problems that are seeded; they use the shared call script. Median of Two Sorted Arrays returns a double and is judged with absolute `1e-5` tolerance.

## What is already here

- Python JSON-args harness, Piston judging, Postgres catalog, streaming AI chat.
- Submit judges the full suite (visible then hidden), reveals the first failing hidden case, and redacts hidden successes.
- Drafts, notes, verified progress, submission history, and tutor conversations live in Postgres. Browser `dsa.*` keys are recovery copies and a one-time import source.
- Only a successful Piston Submit marks a problem solved. Mock and Run never qualify. Legacy imported accepts stay labeled snapshots.
- `/` is a dashboard: solved totals by difficulty, the catalog grouped by roadmap topic (`problems.topic`, seeded from the sheet), and a streak with a day-per-submission calendar. `/problems` is the filterable table. A problem's topic is derived at seed time, never hand-written per module.
- A practice day is a verified Piston Submit, any verdict — the same predicate that decides solved. A Run, a mock verdict, or a visualize trace never counts for the streak. `submissions.day` is stamped at insert time from the client's UTC offset, so a historical day cannot move when a timezone or a season does.
- Revise mode (`/problems/<slug>?revise=1`) reopens a solved problem from its accepted code. It records a revision in history (`is_revision`), never changes `status` / `solvedAt`, and never writes the stored draft.
- The tutor restores the latest thread, sees the referenced attempt (submitted source and first failing case, including a revealed hidden case), and never receives the unrevealed hidden suite or reference-solution source. Hints name one issue in the current attempt and a small next step. Examples are attributed to the failing case, the statement, or an illustration — not to the user unless they supplied the input.
- `pnpm test`, `pnpm problems:check`, `pnpm piston:check`, `pnpm visualizer:check`, and `pnpm chat:smoke` pass. Live DeepSeek still needs `DEEPSEEK_API_KEY`; without it, demo mode is the tutor.

## Hard constraints

- Do not reset the database. Preserve problem IDs and practice data.
- Do not re-export reference solutions or the full catalog into client-facing imports.
- `getProblem` stays public content and visible cases only. Judging uses a separate server path.
- Only a successful Piston Submit may mark a problem solved. Run and mock never qualify.
- Missing cases and invalid judging data are application errors, never acceptance.
- Historical submission inputs are snapshots. Do not rewrite them when the catalog changes.
- Reveal the first failing hidden case (input, expected, output, diagnostics). Successful hidden cases stay status-and-metrics only.
- Apply the same disclosure rules to history and AI context, not only the live console.
- Do not send the unrevealed hidden suite or reference-solution source to the tutor.
- A reference solution is evidence, not proof. Never silently replace a mismatching expectation.
- **Visualizing is not Submit.** A trace writes no submission, no progress row, and no draft, and it never marks a problem solved. `lib/visualizer` imports no submissions, practice, or progress module, and `pnpm visualizer:check` asserts the row counts are unchanged.
- **Revising is not a new solve.** A revise Submit is history (`is_revision`), never a progress write: `status` stays `solved` and `solvedAt` is the first acceptance. A revise session reads the accepted code and writes nothing to the stored draft. It does count as practice for the streak — it is a verified Piston Submit.
- **The day an attempt belongs to is stored, not derived.** `submissions.day` is computed once at insert from `created_at + utc_offset_minutes`. Nothing re-derives a day from a timezone at read time, and the streak never touches the server's `TZ`.
- **Only a visible case can be traced.** The visualize route resolves its index against public problem content, so hidden cases and the hidden suite are not addressable from it — a large index is simply out of range.
- **The trace runs where judging runs:** the same engine, the same pinned Python 3.12.0, the same `Solution().<name>(*_args)` call and the same JSON arguments. The trace prelude differs from `PYTHON_PRELUDE` in exactly one line — `from typing import *` becomes an inert annotation shim, because the tracer re-encodes every reachable global at every step and that import costs 48 KB per step against 2 KB. `lib/visualizer/program.test.ts` holds the two preludes in sync and requires the shim to cover every annotation name the seeded starters use.
- **The engine's output cap is configuration, not a constant.** `PISTON_OUTPUT_MAX_SIZE` in `docker-compose.dev.yml` is mirrored in `lib/piston/config.ts`; raising it takes a recreated piston service. The tracer also budgets its own payload, so an oversized trace shortens itself instead of being killed.

## Deferred

Hosting, accounts, other language harnesses, linked lists, trees, custom classes, in-place output contracts, SDK migration, and Submit batching — unless Phase 4’s p95 Submit latency is above roughly two seconds, in which case batching is a **separate** milestone with its own first-failure, per-case state, and per-case timeout requirements.

Streak reminders, notifications, goals, badges, spaced repetition, per-topic
notes, and persisting a revise buffer: Phase 9 opened the streak and the
dashboard, and stopped there.

## Done looks like this

Solve a problem in Python, fail and inspect a hidden case, ask the tutor about that exact attempt, submit successfully, restart the application, and recover the draft, notes, accepted solution, history, and conversation.
