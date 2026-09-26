# DSA practice app — execution plan

Build in this order: **trustworthy judging → durable persistence → more problems → a better AI tutor.**

Get the existing four problems working end to end before expanding the catalog.

**Current phase:** [Phase 9 — Dashboard, topic sections, streaks, and revise mode](./09-dashboard.md)

Phases 1–8 are complete. Phase 7 closed with 104 ready NeetCode problems seeded and 46 deferred. Encode and Decode Strings, Min Stack, Median of Two Sorted Arrays, and Time Based Key-Value Store were added afterward: 108 ready sheet problems are seeded, and 42 remain deferred. Min Stack and Time Based Key-Value Store use the shared call script. Median of Two Sorted Arrays returns a double and uses the tolerance compare mode. The other design problems, and Pow(x, n), stay deferred.

Phase 9 opens two things earlier phases deferred: the dashboard and daily-activity tracking. It keeps the judging rule untouched — only a verified Piston Submit marks a problem solved, and only a verified Piston Submit makes a day count toward the streak.

Tick boxes here when a whole phase is done. Tick boxes inside the phase file when a work unit is done. Do not start the next phase until the current one is complete.

## Scope

Local personal app. Python only. Piston. Durable local Postgres. Context-aware tutoring. Reveal the first failing hidden case for learning. A dry run you can step through, drawn from the same sandbox that judges.

Deferred: hosting, accounts, other language harnesses, study-coach features, linked lists / trees / custom classes / in-place output contracts, and Submit batching unless the latency checkpoint in Phase 4 triggers it.

Invariants and the “done” scenario live in [00-scope.md](./00-scope.md).

## Phases

- [x] [Phase 1 — Repair baseline checks and judging correctness](./01-baseline.md)
- [x] [Phase 2 — Structured cases, hidden judging, and conformance](./02-structured-judging.md)
- [x] [Phase 3 — Durable practice state and submission history](./03-durable-practice.md)
- [x] [Phase 4 — Expand to 16 verified problems and measure Submit latency](./04-catalog.md)
- [x] [Phase 5 — Persist chats and deliver contextual tutoring](./05-tutor.md)
- [x] [Follow-up — Tutor hints grounded in the current attempt](./06-tutor-hints.md)
- [x] [Phase 7 — Import the NeetCode 150](./07-neetcode-150.md) — 108 ready sheet problems seeded; 42 deferred
- [x] [Phase 8 — Python visualizer: step-through dry runs](./08-python-visualizer.md)
- [ ] [Phase 9 — Dashboard, topic sections, streaks, and revise mode](./09-dashboard.md)

## How to work a phase

1. Open the current phase file and do the next unchecked work unit. One unit at a time.
2. Run that unit’s checks before moving on.
3. Mark `[x]` on finished work units in the phase file.
4. When every work unit and the phase gate is done, mark the phase `[x]` here and point **Current phase** at the next file.
5. Never reset the database. Preserve problem IDs and all practice data.

## Why this split

| Phase | What becomes true | Why it is first |
| --- | --- | --- |
| 1 | Checks run, verdicts are honest, solved means a real Piston Submit | A broken judge poisons every later feature |
| 2 | Cases are authored as arguments, hidden cases exist, the four problems pass conformance | Persistence should store the real result shape, not the old stdin snapshot |
| 3 | Drafts, notes, progress, and history survive restart in Postgres | Expanding the catalog without durable practice loses the work |
| 4 | Sixteen verified problems, with measured Submit latency | Authoring against a stable judge and store, not a moving target |
| 5 | The tutor remembers the conversation and sees the failing attempt | Chat context is only useful once submissions and hidden-case disclosure exist |
| 8 | One visible case can be stepped through, drawn from the same sandbox that judges | Reading an explanation and watching the code run are different kinds of help |
| 9 | A dashboard by topic, a streak calendar, and revise mode | The catalog and the history were already there; nothing pointed at them |

## Milestone checks

Run the checks named in the phase file. Across the whole plan they include:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test                 # added in Phase 1; grows each phase
pnpm problems:check       # added in Phase 2; no Docker
pnpm db:migrate && pnpm db:seed
pnpm piston:check         # seeded catalog + real engine
pnpm visualizer:check     # added in Phase 8; seeded catalog + real engine
pnpm chat:smoke           # disclosed tutor payload; live DeepSeek when a key is set
```
