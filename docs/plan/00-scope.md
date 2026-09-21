# Scope and invariants

Not a work phase. Read this if a later change starts to drift.

## Agreed product

A LeetCode-shaped personal DSA workbench with a problem list, statement / notes / AI chat, Monaco, Run / Submit, and a tutor that can see the problem and the attempt.

Local only. One user. Python only. Piston for execution. Postgres on the compose stack for durable state.

## Order of work

Trustworthy judging, then durable persistence, then more problems, then a better AI tutor. Do not expand the catalog until the existing four problems work end to end.

Existing seeded problems: `two-sum`, `valid-parentheses`, `group-anagrams`, `trapping-rain-water`.

## What is already here

- Python JSON-args harness, Piston judging, Postgres catalog, streaming AI chat.
- Submit judges the full suite (visible then hidden), reveals the first failing hidden case, and redacts hidden successes.
- Drafts, notes, verified progress, submission history, and tutor conversations live in Postgres. Browser `dsa.*` keys are recovery copies and a one-time import source.
- Only a successful Piston Submit marks a problem solved. Mock and Run never qualify. Legacy imported accepts stay labeled snapshots.
- The tutor restores the latest thread, sees the referenced attempt (submitted source and first failing case, including a revealed hidden case), and never receives the unrevealed hidden suite or reference-solution source. Hints name one issue in the current attempt and a small next step. Examples are attributed to the failing case, the statement, or an illustration — not to the user unless they supplied the input.
- `pnpm test`, `pnpm problems:check`, `pnpm piston:check`, and `pnpm chat:smoke` pass. Live DeepSeek still needs `DEEPSEEK_API_KEY`; without it, demo mode is the tutor.

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

## Deferred

Hosting, accounts, other language harnesses, study-coach features, linked lists, trees, custom classes, in-place output contracts, SDK migration, and Submit batching — unless Phase 4’s p95 Submit latency is above roughly two seconds, in which case batching is a **separate** milestone with its own first-failure, per-case state, and per-case timeout requirements.

## Done looks like this

Solve a problem in Python, fail and inspect a hidden case, ask the tutor about that exact attempt, submit successfully, restart the application, and recover the draft, notes, accepted solution, history, and conversation.
