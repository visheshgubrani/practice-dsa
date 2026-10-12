# DSA practice app — execution plan

Build in this order: **trustworthy judging → durable persistence → more problems → a better AI tutor.**

Get the existing four problems working end to end before expanding the catalog.

**Current phase:** none. [Phase 16](./16-dashboard-and-reviews-ui.md), including implementation review corrections in work unit 16.9, is complete (2026-10-10). [Phase 15](./15-beginner-tutor.md), including review corrections in work unit 15.5, is complete (2026-10-10).

[Phase 8 work unit 8.7](./08-python-visualizer.md#87-snap-code-arrows-to-their-rows) is complete (2026-10-12), including the drawing-error correction and browser acceptance gate. Its 141 marker-position checks passed within one pixel, all 429 tests and the production checks passed, and the browser and targeted real-engine traces preserved practice data counts.

Phase 13 is reviewed and wrapped up. Its final checks passed: 379 tests, 1,767 catalog checks, 443 real Piston checks, lint, typecheck, and build. The stateful browser acceptance run used a disposable database copy, preserving the user's database. Phase 9's remaining recorded gate and the unfinished tutor-conversation follow-up keep their existing status; this review does not close those unrelated checklists.

Phase 14 completed on 2026-10-08. Lint, typecheck, all 382 tests, and the
production build passed. Browser acceptance and representative real Piston
Submits ran against a disposable database copy; the original database was not
mutated. Phase 9 and the tutor-conversation follow-up remain open.

The tutor-consistency follow-up (Phase 11) is complete. The
conversational-reply follow-up (Phase 12) was tried and is not complete: on the
Encode/Decode thread, two of three supplied-history replies still taught the next
pointer move. Its restrictive response contract — answer the question and nothing
else, the next task only when asked — is superseded by Phase 15, which replaces
it with concrete hints, a taught idea behind each step, and the complete
implementation behind an explicit request. Phase 12 stays in the plan as
historical evidence. Neither follow-up changes Phase 9's status or its remaining
units.

Phase 15 is the beginner-tutor pass. It keeps `gpt-6-luna`, the OpenAI provider,
and user-triggered chat. Its original acceptance evidence is retained as
historical evidence: review found unequal baseline context, decoder overreach,
and gaps in the browser checks. Work unit 15.5 is complete: both contracts were
recorded with identical context; all 129 final replies passed manual review with
zero hard failures, alongside 398 tests, a 33-check browser pass, lint, typecheck,
and build. The renewed evidence is linked in the phase file. Phase 14 is complete (2026-10-08), including work unit
14.5; Phase 13 remains complete (2026-09-30).

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
- [x] [Follow-up — Tutor clarity: complete answers, plain language, one next action](./10-tutor-clarity.md)
- [x] [Follow-up — A consistent beginner DSA tutor](./11-tutor-consistency.md)
- [ ] [Follow-up — Tutor replies stop at the question](./12-tutor-conversation.md)
- [x] [Phase 7 — Import the NeetCode 150](./07-neetcode-150.md) — 108 ready sheet problems seeded; 42 deferred
- [x] [Phase 8 — Python visualizer: step-through dry runs](./08-python-visualizer.md)
- [ ] [Phase 9 — Dashboard, topic sections, streaks, and revise mode](./09-dashboard.md)
- [x] [Phase 13 — Personal notes and spaced repetition](./13-notes-and-reviews.md)
- [x] [Phase 14 — Rate before review enrollment](./14-rate-before-review.md)
- [x] [Phase 15 — Beginner tutor](./15-beginner-tutor.md) — renewed teaching and browser gates passed
- [x] [Phase 16 — Dashboard and reviews UI redesign](./16-dashboard-and-reviews-ui.md) — verified, including implementation review corrections in work unit 16.9

Phase 16 rebuilt the front of the app: IBM Plex Sans and a documented type
scale, one collapsible sidebar shell shared by `/`, `/problems`, and `/reviews`,
a dashboard that is an overview again (one progress summary, one review
reminder, the streak and calendar together, compact topic rows), a URL-backed
topic filter on the problem list, and `/reviews` as the only home for due,
upcoming, and paused lists over one shared queue loader. It added no migration
and changed no scheduling rule. Phase 9's remaining catalog/Piston gate and the
tutor-conversation follow-up keep their existing status.

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
pnpm chat:smoke           # disclosed tutor payload; live OpenAI when a key is set
```
