# Phase 17 — Today's plan: a deterministic coach with a short LLM note

**Status:** in_progress — implementation complete; real-browser acceptance pending (no browser binary available in this environment), 2026-10-18

Opening `/` should answer one question immediately: what should I do in this
session, and what should I deliberately not do? A deterministic engine chooses
the day's reviews and one new/continued problem from real practice data. A small
LLM layer writes only a short coaching note around that plan; it never chooses,
reorders, or adds work.

## Prerequisites

Phase 16 is complete. Phase 9's remaining catalog/Piston gate and the
tutor-conversation follow-up keep their recorded status; this phase does not
close them. No migration and no reseed are required.

## Product decisions

| Question | Decision | Consequence |
| --- | --- | --- |
| Where does the plan live? | Top of `/`, as `TodayPlanCard`; no new route | The home page becomes plan-first; progress/streak/topics stay below |
| What drives daily load? | A 15/30/60-minute budget, default 30, stored in `localStorage` | Concrete capacity; the headline still states exact counts |
| Who chooses the plan? | The deterministic planner only | Testable, free, no hallucinated schedule |
| What does the LLM do? | One short, validated note for active plans | Tone/motivation only; facts stay deterministic |
| Which reviews? | Active due cards, in server FSRS order, capped | Consistent with `/reviews`; paused/upcoming excluded from the plan |
| Which new problem? | Attempted first, then next unsolved in roadmap order; easy/medium; excludes due and upcoming reviews | Low activation energy, no duplicate review work, no hard auto-pick |
| How many new? | 1; 2 only when tone is `push` and budget is 60 | Two is a deliberate high-momentum cap |
| How is the day closed? | `reviewsDone` and `newDone` count work already done today; targets are fixed by budget/tone and only shrink | No persisted plan, no treadmill after completion |
| What is "new done"? | A distinct problem whose `problem_progress.solvedAt` falls in the local day | A repeat accepted Submit or revision does not count |
| What is "review done"? | A distinct problem with a `review_logs.reviewed_at` rating in the local day | A Submit without a rating does not count |
| What is "practised today"? | Any verified Piston Submit in `submissions.day` | Same predicate as the streak; a revision counts, a Run/mock does not |
| What replaces the ReviewReminder? | The plan card plus a compact `ReviewQueueSummary` in its footer | One primary surface; the shared queue owns the live count/error |
| How is the note stored? | `localStorage` cache keyed by the plan fingerprint; no server row | No migration; stale notes ignored; fallback always available |
| How is the day known? | Browser `utcOffsetMinutes`, validated server-side | Correct local "today" |
| Any migration? | None | Existing tables/queries only; practice data untouched |

## Architecture

```
app/(study)/page.tsx (server)
  └─ <TodayPlanCard /> (client, dashboard top)
       ├─ usePersistedState("dsa.coach.minutes")       → 15 | 30 | 60
       ├─ useCoachPlan(minutes, enabled, nextDueAt)
       │    └─ GET /api/coach/plan?minutes=&utcOffsetMinutes=
       │         ├─ listProblemSummaries()
       │         ├─ listProgressStatuses()
       │         ├─ listReviewQueue(now)
       │         ├─ listActivityDays(last 366 days)
       │         ├─ loadCoachDay(day, offset)
       │         └─ buildCoachPlan(...)                (pure, no I/O)
       ├─ useCoachNote(plan, live)
       │    └─ POST /api/coach/note                    (structured facts only)
       └─ <ReviewQueueSummary />                        (shared useReviewQueue)
```

- `lib/coach/*` is client-safe: no database, AI SDK, React, or catalog authoring
  imports.
- `lib/db/queries/coach.ts` is server-only.
- The plan route never calls `getProblem`, so no statement, testcase, source, or
  reference solution can enter the plan.
- The note route request is enums/booleans/integers only: no titles, slugs,
  statements, source, free text, or user notes. It imports no database.
- Both routes write nothing. The only storage writes are `localStorage`.

## Deterministic rules

### Inputs

```ts
type CoachPlanInput = {
  day: string;
  offsetMinutes: number;
  minutes: 15 | 30 | 60;
  problems: readonly ProblemSummary[];
  statuses: ProgressLookup;
  due: readonly ReviewSummary[];
  upcomingSlugs: readonly string[];
  pausedCount: number;
  nextReviewAt: string | null;
  activity: readonly ActivityDay[];
  solvedToday: number;
  reviewsRatedToday: number;
};
```

### Constants

| Constant | Value |
| --- | --- |
| `REVIEW_MINUTES` | 4 |
| `NEW_MINUTES` | easy 15, medium 25, hard 40 (hard never auto-picked) |
| `NEW_RESERVE_MINUTES` | 25 per planned new problem |
| `REVIEW_CAP` | 15 → 2; 30 → 3; 60 → 4 |
| `NEW_CAP` | 1; 2 only when tone `push` and minutes 60 |
| `HEAVY_DUE` | 6 reviews due at start → no new |
| `MAX_ITEMS` | 6 |

### Tone

```ts
hasHistory = summary.overall.solved > 0 || summary.overall.attempted > 0
practicedToday = activity.some(d => d.day === day && d.submits > 0)
currentStreak = summarizeStreak(activity.map(d => d.day), day).current
prior7 = activity.filter(d => d.day >= addDays(day, -7) && d.day < day)
activeDays7 = count(prior7 where submits > 0)
submits7 = sum(prior7.submits); accepts7 = sum(prior7.accepted)

tone =
  !hasHistory ? "start"
  : !practicedToday && currentStreak === 0 ? "comeback"
  : activeDays7 >= 4 && accepts7 >= 2 && accepts7 / max(1, submits7) >= 0.5 ? "push"
  : "steady"
```

Tone is computed excluding today so completing work cannot raise the day's
target.

### Targets and selection

```ts
allowed = (tone === "comeback" || minutes === 15)
  ? ["easy"]
  : ["easy", "medium"];

reserved = new Set([...due.map(d => d.slug), ...upcomingSlugs]);

candidatePool = problems.filter(p =>
  (statuses.get(p.slug) ?? "todo") !== "solved" &&
  !reserved.has(p.slug) &&
  allowed.includes(p.difficulty)
);
candidates = attempted-first, then todo; both in roadmap order.

reviewsDone = reviewsRatedToday;
newDone = solvedToday;
dueAtStart = due.length + reviewsDone;
heavy = dueAtStart >= HEAVY_DUE;

newCapBase =
  heavy ? 0
  : minutes === 15 && dueAtStart > 0 ? 0
  : tone === "push" && minutes >= 60 ? 2
  : 1;

hasNewWork = candidates.length > 0 || newDone > 0;
newTarget = hasNewWork ? newCapBase : 0;
newRemaining = min(candidates.length, max(0, newTarget - newDone));

reviewCapBase =
  tone === "comeback" ? 2
  : minutes <= 15 ? 2
  : minutes <= 30 ? 3
  : 4;

reserve = newTarget * NEW_RESERVE_MINUTES;
timeCap = max(0, floor((minutes - reserve) / REVIEW_MINUTES));
reviewsTarget = min(dueAtStart, reviewCapBase, timeCap);
reviewsRemaining = min(due.length, max(0, reviewsTarget - reviewsDone));

items = reviews in FSRS order, then new/continue items.
```

`newTarget` is the day's planned new count, not the currently available count.
The review budget reserves that capacity even after it is done, so completing a
new problem cannot free review slots and grow the plan. If a push 60-minute plan
can only show one eligible new problem at first, a second may appear after the
first solve; the total never exceeds two.

15 minutes with due reviews is reviews only; 15 minutes with no due allows one
easy new problem.

### States

- `active` — `items.length > 0`.
- `done` — no remaining reviews/new and at least one rating or first solve today.
- `empty` — no remaining and nothing done.
  - `caught-up` — nothing unsolved and no due reviews.
  - `no-fit` — unsolved remain but no allowed candidate fits.

### Copy

- Headline uses remaining counts: "1 review + 1 new problem", "2 reviews",
  "Done for today", "Nothing scheduled today".
- Summary states the estimate versus the chosen budget; if work is already done,
  it acknowledges it; if practised but not started, the rest is optional.
- Progress line appears only when work is done.
- Fallback note is a complete deterministic coach note (no digits), varied by
  state/tone/practiced/started/first item kind. It never says a review rating
  extends the streak.
- Reasons: overdue days for reviews; "You already started this one." for
  continue; "Next unsolved in {topic}." for new.
- Defer lines (max 3, priority order):
  1. Remaining due reviews stay for another day; today's plan is a slice.
  2. Streak warning when not practised today and a streak exists; reviews are
     not a practice day.
  3. New blocked by heavy reviews.
  4. New blocked by 15-minute time.
  5. New blocked by already-scheduled reviews.
  6. New quota met while reviews remain.
  7. Hard problems not auto-picked.
- Minimum is active only: one item is enough, starting with the first review or
  the first problem.
- Empty copy gives permission to rest (caught-up) or says no easy/medium fits
  and offers more time or the problem list (no-fit).

### Daily closure (no treadmill)

- `reviewsDone`: distinct `review_logs.problem_id` with `reviewed_at` in the
  browser-local day.
- `newDone`: `problem_progress.solved_at` in the browser-local day. `solvedAt` is
  set once on the first verified Piston accept and never moved by revisions.
- `practisedToday`: `submissions.day` has a verified Piston Submit (any
  verdict), the same predicate as the streak.
- Targets use `dueAtStart = dueNow + reviewsDone`; completion only removes items.
- No plan row. Reopening after completion lands in `done`.
- A rating is the only review-done signal; a Submit without a rating does not
  count.
- A revision is practice but neither a rating nor a first solve.

## Contracts

### `GET /api/coach/plan?minutes=30&utcOffsetMinutes=330`

Validates minutes ∈ {15, 30, 60} and offset ∈ [-840, 840]; invalid/missing → 400.
Returns `200 { plan, live }`; unexpected failure → `500 { error: "Could not
build today's plan." }`. No writes.

```ts
type CoachPlan = {
  version: 1;
  day: string;
  minutes: 15 | 30 | 60;
  state: "active" | "done" | "empty";
  emptyReason: "caught-up" | "no-fit" | null;
  tone: "start" | "comeback" | "steady" | "push";
  headline: string;
  summary: string;
  progressLine: string | null;
  fallbackNote: string;
  practicedToday: boolean;
  items: CoachPlanItem[];
  counts: {
    reviewsTarget: number; reviewsDone: number; reviewsRemaining: number; reviewsDueNow: number;
    newTarget: number; newDone: number; newRemaining: number;
    upcomingCount: number; pausedCount: number;
    estimatedMinutes: number; solved: number; total: number; unsolved: number;
  };
  defer: string[];
  minimum: string | null;
  nextReviewAt: string | null;
  fingerprint: string;
};

type CoachPlanItem = {
  kind: "review" | "continue" | "new";
  slug: string; number: number; title: string;
  difficulty: Difficulty; topic: string;
  minutes: number; reason: string;
  dueAt?: string;
};
```

`fingerprint` is a stable FNV-1a hash over version/day/minutes/tone/state/item
kinds+slugs/done counts/practicedToday.

### `POST /api/coach/note`

Strict, no free text:

```ts
type CoachNoteRequest = {
  fingerprint: string;
  state: "active" | "done" | "empty";
  tone: "start" | "comeback" | "steady" | "push";
  minutes: 15 | 30 | 60;
  items: Array<{ kind: "review" | "continue" | "new"; difficulty: Difficulty; minutes: number }>;
  reviewsDone: number; reviewsRemaining: number;
  newDone: number; newRemaining: number;
  practicedToday: boolean;
  minimumKind: "review" | "continue" | "new" | null;
};
```

200 `{ status: "note", fingerprint, note }`; 400 invalid; 503 no key; 502
provider/invalid output; 504 timeout; 499 aborted. No database import and no
persistence.

## LLM note layer

- Reuse `gpt-6-luna`; add `coachProviderOptions` with low reasoning effort.
- Prompt: the plan is decided; do not change it; no numerals, titles/problem
  names/topics, markdown, emoji, questions, or newlines; 2–3 short sentences,
  max 320 characters; calm, concrete, no diagnosis, guilt, "should/must", or
  extra tasks; reviews are not practice days; use the minimum to give
  permission to stop; done means close the session; empty means do not invent
  work.
- `generateText` with `Output.object({ note: string })`, 30s timeout,
  `request.signal`, then validate: non-empty, ≤400 chars, no digits, no `?`,
  no markdown characters, no newlines. Invalid → 502 and fallback.
- The client shows the fallback immediately. It requests only when active, live,
  uncached, and not already attempted this session. It waits ~1s, aborts on plan
  change/unmount, ignores mismatched fingerprints, and caches
  `{ fingerprint, note }` under `dsa.coach.note`.
- Label LLM text "Coach note"; fallback "Plan note". A failed note is never an
  alert.

## UI

Replace the dashboard's `ReviewReminder` and the "Nothing submitted yet" notice
with one `TodayPlanCard`. Keep `ReviewQueueProvider` as the one live queue owner;
add a compact `ReviewQueueSummary` in the footer (due count, "All reviews",
Retry on queue error). Delete `components/dashboard/review-reminder.tsx` and
update its test coverage rather than dropping it.

Active card: header (`h2` "Today", local day, time toggle), headline/summary,
one amber primary action, ordered item list, note block, minimum line, "Not
today" block, footer with queue summary and problem list.

Other states: loading skeleton (`aria-busy`), first-load error (`Alert` + Retry +
All reviews) while progress/streak/topics remain usable, stale-refresh notice
keeping the last plan for the same budget, done state with success icon and
counts, caught-up/empty `Empty`, and no-fit with "Try 30 minutes" or the problem
list.

Behavior: hydrate the budget before the plan; on budget change clear the old
plan and refetch (200ms debounce); refresh on focus/visibility/pageshow, review
change event, next-due boundary, and local midnight; focus refreshes keep the
last plan, budget changes do not. No practice writes. Accessible section label,
labeled toggle group, `ol`/`ul`, keyboard reachability, 14px supporting-text
floor, tabular figures, no horizontal scroll at 390/768/1440 or 200% zoom.

## Work units

### 17.1 Deterministic core and daily-work query

- [x] Create this phase file and set `docs/plan/README.md` to Phase 17.
- [x] Add `lib/coach/types.ts`, `rules.ts`, `fingerprint.ts`, `plan.ts`, `copy.ts`, `note-contract.ts`.
- [x] Add `dayBounds(day, offsetMinutes)` to `lib/practice/days.ts` with tests.
- [x] Add `lib/db/queries/coach.ts` (`loadCoachDay`) and its test: `solved_at`
  and `reviewed_at` boundaries, distinct review cards, multiple first solves.
- [x] Add `lib/coach/*.test.ts` and update the `package.json` test glob.
- [x] **Gate:** pure tests cover tone, targets, selection, caps, reasons/copy,
  defer priorities, done/empty/no-fit, day boundaries, and the no-treadmill
  cases (completing reviews/new creates no additional target). Focused tests and
  typecheck pass.

### 17.2 Plan API

- [x] Add `app/api/coach/plan/route.ts`: validate query, compute day, load the
  reads in parallel, call `buildCoachPlan`, return `{ plan, live }`, generic 500.
- [x] Keep the route on summaries only; never `getProblem`, the catalog, or
  reference solutions.
- [x] **Gate:** HTTP 200/400 checks; read-only result; no statement/testcase/
  source fields.

### 17.3 Client loader and preference

- [x] Add `lib/coach/client.ts`, `lib/coach/cache.ts`, `lib/hooks/use-coach-plan.ts`.
- [x] Implement hydration gating, abort/stale-response handling, last-plan
  retention on same-budget refresh failure, plan clearing on budget mismatch,
  and the refresh triggers.
- [x] **Gate:** VM hook tests cover loading/success/invalid/stale/budget change;
  guard tests reject malformed and inconsistent plans.

### 17.4 Today plan card and dashboard integration

- [x] Add `components/reviews/review-queue-summary.tsx`; replace the reminder
  coverage in `lib/reviews/queue-recovery.test.ts`.
- [x] Add `components/dashboard/today-plan.tsx` with all states, time toggle,
  primary action, list, note fallback, minimum, defer list, footer.
- [x] Update `app/(study)/page.tsx`; delete `review-reminder.tsx`; update the
  page import allowlist.
- [ ] **Gate:** browser checks on the read-only dashboard at 1440/768/390:
  first surface, counts/links/reasons, 15/30/60 persistence, no horizontal
  scroll, loading/error/stale states, fallback note. Typography and palette
  follow the study-page rules.

### 17.5 LLM coach note

- [x] Add `coachProviderOptions`, `lib/ai/coach-prompt.ts`, `lib/ai/coach-note.ts`,
  `app/api/coach/note/route.ts`, `lib/hooks/use-coach-note.ts`; wire the note
  block.
- [x] **Gate:** stub success/no-key/provider error/timeout/abort/invalid output;
  contract rejects extra/free-text fields; no-key browser check makes no note
  request; no writes.

### 17.6 Completion, empty, and error polish

- [ ] Verify done on a disposable copy: rate planned reviews / set first solve,
  reload, confirm no new suggestions and deferred backlog.
- [x] Verify caught-up, no-fit, paused/upcoming copy, and the "Try 30 minutes"
  action.
- [x] Verify revision-only practice still permits the plan; a Submit without a
  rating is not a review done.
- [ ] **Gate:** done does not grow the plan; empty and error are distinct; defer
  never exceeds three lines.

### 17.7 Verification and records

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- [ ] Browser acceptance on a disposable copy for stateful checks; read-only on
  the real database. Capture 1440/390 screenshots in `docs/plan/evals/`.
- [x] Confirm no migration/seed and unchanged database fingerprints/row counts.
- [x] Update this file, `docs/plan/README.md`, `docs/plan/00-scope.md`,
  `AGENTS.md`, and `README.md`:
  - daily coach built; notifications/goals/badges/persisted plans/chat deferred;
  - coach is advisory/read-only; deterministic targets/order authoritative; LLM
    writes only a note;
  - no statements/source/cases/reference solutions in plan/note routes;
  - `dsa.coach.*` keys are browser-local preference/cache and never imported;
  - dashboard description/code layout;
  - `OPENAI_API_KEY` also enables the coach note; otherwise deterministic note.
- [ ] **Gate:** every work unit is ticked only after its checks pass; the
  verification record lists actual commands/results and any live-key limitation.

## Out of scope

Conversational coach chat; weekly/monthly plans; manual plan editing/skip/
complete/history; goals, badges, notifications, reminders, calendar sync,
persisted plan rows; LLM choosing items/counts/order/difficulty/ratings/solved;
changes to FSRS, judging, disclosure, tutor prompts, or note generation; new
problems/catalog changes; migrations/reseeding; auth/hosting/languages; Submit
batching; auto-picking hard problems; per-topic goals; recommendations from
notes/chat content.

## Assumptions

- Local single-user app; browser and server clocks/timezones agree closely.
- The dashboard is home; no `/today` route.
- The 30-minute default and constants are starting heuristics in one rules
  module.
- The deterministic plan and fallback note are complete without the LLM.
- Preserve the current working-tree deletion of `.env.example`.

## Verification record — implementation, 2026-10-18

**Automated checks.**

- `pnpm lint` clean; `pnpm typecheck` clean.
- `pnpm test` passed **503 tests, 0 failed, 0 skipped** (was 494 before this phase).
- `pnpm build` passed. The route list includes `ƒ /api/coach/note` and
  `ƒ /api/coach/plan`; `/` remains the dashboard inside the study shell.
- No migration or seed ran; `drizzle/` is unchanged. No `coach_*` table exists.

**HTTP and database checks.**

- The production build was served on `127.0.0.1:3020`.
- `GET /api/coach/plan?minutes=30&utcOffsetMinutes=330` returned 200 with the
  expected plan shape; `minutes=45` and a missing `utcOffsetMinutes` returned
  400.
- Three plan reads left every table count unchanged: 109 problems, 275 examples,
  1242 testcases, 3 progress rows, 3 drafts, 40 submissions, 122 submission
  cases, 3 threads, 18 messages, 3 review cards, 5 review logs, 0 legacy
  accepts.
- `POST /api/coach/note` with a valid structured request returned 200. A live
  note was produced (the key is configured):
  "Start with the first problem; that’s enough for today. After it’s done, you
  can close the session." It contains no digits, titles, or slugs.
- A note request with an extra free-text `title` returned 400
  `unrecognized_keys` without calling the model.
- The dashboard HTML includes the plan card's loading skeleton and the shared
  review summary, and no longer includes the old review-reminder component.

**UI state coverage without a browser.**

- `lib/coach/today-plan-ui.test.ts` renders the actual card with its data hooks
  replaced and asserts: active headline/first action/href/reasons/minimum/note/
  not-today/time budgets; done as a stop signal with no primary action;
  caught-up; no-fit with **Try 30 minutes**; loading; first-load error; and a
  stale-refresh notice.
- `lib/coach/coach-hooks.test.ts` covers loading, valid load, same-budget
  failure retaining the plan, first-load error, budget change clearing the old
  plan, and latest-wins after a superseded request.
- `lib/coach/coach-note-hook.test.ts` covers fallback-first, the one-second
  settle, no request without a key or for a finished plan, cached notes,
  mismatched fingerprints, provider failure, and aborting the scheduled request
  when the plan changes.

**Live AI limitation.** The live note succeeded. The deterministic fallback is
still the first paint and the no-key path is covered by the hook test.

**Unverified / next action.** No browser binary is available here, so the
planned browser acceptance (hydration, 1440/390/200% layout, keyboard/focus,
screenshots, and a disposable-database done-state pass) was not run. Open `/` in
a real browser, exercise the 15/30/60 control and a plan item, then repeat the
done-state check on a disposable database copy before ticking the phase.
