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
- `/` is a dashboard: one progress summary with the overall and per-difficulty
  solved counts, one compact review reminder, the streak and its day-per-submission
  calendar together, and compact per-topic progress rows that link into the
  filtered problem list. `/problems` is the filterable table, with a URL-backed
  `?topic=` filter that composes with search, difficulty, tag, and solved. A
  problem's topic is derived at seed time, never hand-written per module.
- The three study pages share one shell: a collapsible sidebar (248px expanded,
  64px compact, cookie-backed, a drawer below 768px) that owns the navigation.
  The coding workspace stays outside it and links back from its own header.
  Study pages use IBM Plex Sans with a documented scale — 32px page titles, 22px
  section headings, 16px body and navigation, 14px supporting text — and tabular
  figures for counts.
- `/reviews` is the one home for review lists: **Due**, **Upcoming**, and
  **Paused** tabs with their counts, a title/number search, a topic filter, and
  per-tab actions (**Start review**, **Review early**, **Pause reviews**,
  **Resume reviews**, **Open problem**) plus **Start next review**. A paused card
  keeps its schedule, is never counted as due, and never sets the next-due
  boundary. The sidebar badge, the dashboard's queue summary, and the page read
  one shared queue loader, so they cannot disagree.
- `/` opens with **Today's plan** (Phase 17): a deterministic daily coach picks
  due reviews in FSRS order and one new/continued problem from the remaining
  catalog, capped by a 15/30/60-minute budget. The day closes from today's
  distinct review ratings and first solves (`problem_progress.solved_at`), so
  finishing the plan does not invent more work. The plan is a read-only
  snapshot; it writes no submission, progress, draft, or review state. A short
  coach note is generated over structured plan facts only; the deterministic
  plan note is the first paint and the fallback when the key or provider is
  unavailable. The old dashboard review reminder was replaced by a compact queue
  summary in the plan card's footer.
- A practice day is a verified Piston Submit, any verdict — the same predicate that decides solved. A Run, a mock verdict, or a visualize trace never counts for the streak. `submissions.day` is stamped at insert time from the client's UTC offset, so a historical day cannot move when a timezone or a season does.
- Revise mode (`/problems/<slug>?revise=1`) reopens a solved problem from its accepted code. It records a revision in history (`is_revision`), never changes `status` / `solvedAt`, and never writes the stored draft.
- Notes has five personal fields: Key idea (`approach`), Steps, What tripped me up, Time, and Space. New notes start empty, existing text is preserved, and autosave/recovery works in practice, revise, and review. Catalog guidance remains read-only in Solution. AI drafts are editable previews; generating does not save notes or chat, and only explicit application writes notes.
- FSRS review cards populate the dashboard's due/upcoming queue. Adding a problem commits its first self-rating and schedule atomically; an initial attempt does not create a second review due today. Recall Review (`?review=1`, taking precedence over `?revise=1`) begins with the statement and fresh starter code; notes and saved solutions need an explicit reveal. The buffer is temporary. Finish and self-rate Again/Hard/Good/Easy without submitting; pause/resume preserves the schedule. The first completed Submit opens the recall rating once, and the review banner keeps **Finish review** / **Retry rating** reachable; the prompt never records a rating. Ratings never alter solved status or practice activity.
- The tutor restores the latest thread (48 messages / 48,000 characters), sees the referenced attempt (submitted source and first failing case, including a revealed hidden case), and never receives the unrevealed hidden suite or reference-solution source. Editor code and execution results are separate evidence. Returned output is the function's return value; debug prints are observations. It hints concretely: it names the tool (a hashmap, a stack, two pointers, a nested loop), says what that tool is doing for this problem, and teaches the idea behind the step instead of issuing a chore. It stays with the learner's approach — a working nested loop stays the plan, and the tradeoff is named once rather than used to switch them. Broad help explains the connected approach through the final result in plain language; complete prose explanations do not require a full-solution request. "What now?" guides the next meaningful part from the live buffer through its purpose and completion, connecting it to the final answer. "Okay done" checks the actual buffer and continues, correcting blocking mistakes without assuming an edit. Replies use short chunks or a compact list, at most one question, no closing task; related operations belong together. Confusion gets a smaller trace connected to the intended result rather than a repeated hint. Deliberately small hints and narrow clarifications stay focused. A failed run, a repeated question, and a debug print never move the plan. A direct request gets a direct answer, including the local line; the complete implementation waits for an explicit full-solution request. "Where were we?" gets a short recap of the approach and actual buffer, then guidance for the next meaningful part. It gets an advisory attempt state — which expected methods exist and whether each body is empty — and a non-empty body is not proof the method is implemented. Examples are attributed to the failing case, the statement, or an illustration — not to the user unless they supplied the input.
- `pnpm test`, `pnpm problems:check`, `pnpm piston:check`, `pnpm visualizer:check`, and `pnpm chat:smoke` pass. Live OpenAI still needs `OPENAI_API_KEY`; without it, demo mode is the tutor.

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
- **A recall rating is not practice activity.** Enrollment and ratings write only review state. They never rewrite historical submissions, drafts, solve dates, or submission-day stamps. Ratings use the server clock, expected revisions, and an immutable request payload so retries schedule once. Neither the AI nor the judge chooses a rating; a completed Submit may open the rating dialog, but only the learner's explicit choice writes one.
- **Review and Revise have different Submit semantics.** A solved Review Submit is a revision and preserves the first solve. An unsolved Review Submit can create a first solve through normal verified judging; neither saves the temporary buffer as an ordinary draft. A direct Revise visit to an unsolved problem still writes history only.
- **AI note generation is a read.** Use bounded editor and submitted source as distinct evidence, completed conversation turns, and the tutor's disclosed first failure. Never include reference-solution source or the unrevealed hidden suite. Replacing a field changed since generation requires renewed explicit review.
- **The daily coach is advisory and read-only.** `/api/coach/plan` composes
  public summaries, progress, the review queue, activity, and today's worked
  counts; it never calls `getProblem` and writes nothing. `/api/coach/note`
  receives only enums, counts, and item kinds/difficulties — no titles, slugs,
  statements, source, cases, notes, or free text — and writes nothing.
- **The deterministic planner owns the plan.** The LLM writes one short note;
  it never chooses, reorders, adds, or removes items, and it never chooses a
  rating. The plan's review quota is a slice of due cards in FSRS order, not the
  whole backlog; new work is attempted-first/roadmap-order, easy/medium only,
  and never auto-picks a hard problem.
- **Completing the plan does not create more work.** Reviews done are distinct
  cards rated inside the browser-local day; new done is a distinct first solve
  (`problem_progress.solved_at`) inside that day. The day's targets use
  `dueAtStart = dueNow + reviewsDone` and only shrink as work lands. No plan row
  is persisted.
- **A review rating is not a practice day and a revision is not a first
  solve.** The coach uses the same verified-Piston-Submit predicate as the
  streak for `practisedToday`; it never infers a rating from a Submit and never
  treats a revise accept as new-problem progress. The `dsa.coach.*` browser keys
  are a time preference and a note cache, never practice state and never
  imported by the one-time `dsa.*` scan.
- **The day an attempt belongs to is stored, not derived.** `submissions.day` is computed once at insert from `created_at + utc_offset_minutes`. Nothing re-derives a day from a timezone at read time, and the streak never touches the server's `TZ`.
- **Only a visible case can be traced.** The visualize route resolves its index against public problem content, so hidden cases and the hidden suite are not addressable from it — a large index is simply out of range.
- **The trace runs where judging runs:** the same engine, the same pinned Python 3.12.0, the same `Solution().<name>(*_args)` call and the same JSON arguments. The trace prelude differs from `PYTHON_PRELUDE` in exactly one line — `from typing import *` becomes an inert annotation shim, because the tracer re-encodes every reachable global at every step and that import costs 48 KB per step against 2 KB. `lib/visualizer/program.test.ts` holds the two preludes in sync and requires the shim to cover every annotation name the seeded starters use.
- **The engine's output cap is configuration, not a constant.** `PISTON_OUTPUT_MAX_SIZE` in `docker-compose.dev.yml` is mirrored in `lib/piston/config.ts`; raising it takes a recreated piston service. The tracer also budgets its own payload, so an oversized trace shortens itself instead of being killed.

## Deferred

Hosting, accounts, other language harnesses, linked lists, trees, custom classes, in-place output contracts, SDK migration, and Submit batching — unless Phase 4’s p95 Submit latency is above roughly two seconds, in which case batching is a **separate** milestone with its own first-failure, per-case state, and per-case timeout requirements.

Streak reminders, notifications, goals, badges, per-topic notes, and
persisting a revise buffer stay deferred. Phase 9 opened the streak and the
dashboard and stopped there.

Phase 13 completed personal notes and spaced repetition as a narrow extension
of that study-coach scope. Phase 14 changes enrollment to rate first and
schedule atomically; ratings do not change solved status or streaks. Catalog
approach notes stay read-only guidance. Notifications, per-topic notes, and
persistent review code buffers stay deferred.

Phase 16 redesigned the dashboard and review surfaces and added a shared,
collapsible navigation shell. It opened no new scope: the same review state is
shown, the same FSRS schedule is kept, and there is no automatic enrollment,
notification, or new scheduling setting.

Phase 17 opened the daily study coach narrowly: a deterministic today plan, a
read-only queue slice, a 15/30/60-minute budget, and one short LLM note over
structured facts. Notifications, goal and badge systems, per-topic notes,
persisted plan rows/history, automatic enrollment, and a free-form dashboard
coach chat remain deferred. The phase does not change judging, FSRS scheduling,
rating semantics, disclosure, or the tutor contract.

## Done looks like this

Solve a problem in Python, fail and inspect a hidden case, ask the tutor about that exact attempt, submit successfully, restart the application, and recover the draft, notes, accepted solution, history, and conversation. Open the dashboard, follow today's plan, and see it close without piling on more work.
