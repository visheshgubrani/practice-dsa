# Phase 9 — Dashboard, topic sections, streaks, and revise mode

**Status:** in progress

The app has had 107 problems and real practice history for a while, and its front
door was still a flat table. This phase makes the front door a dashboard: progress
by difficulty, the catalog grouped by roadmap topic, a practice streak with a
day-by-day calendar, and a **Revise** action that reopens a solved problem without
taking its solve away.

Two things this phase deliberately opens that earlier scope deferred:

- **The list moves.** `/` becomes the dashboard and the filterable table moves to
  `/problems`. Anything linking "the problem list" at `/` is repointed.
- **Daily activity is tracked.** `docs/plan/00-scope.md` listed study-coach
  features as deferred. A streak and a calendar are exactly that, and they are
  now in scope — narrowly: a practice day is a **verified Piston Submit**, the
  same predicate that decides whether a problem is solved. A Run, a mock verdict,
  or a visualize trace still counts for nothing.

## What was settled before any of this was written

| Question | Answer | Consequence |
| --- | --- | --- |
| Where does a problem's topic come from? | The catalog is authored group by group and the sheet has the group per slug | Derive it at seed time from `docs/catalog/neetcode-150.json`; no 107 hand-edits, and the stored topic cannot drift from the roadmap |
| Which group is `search-insert-position` in? | It is not on the sheet at all | One documented override, filed with Binary Search where the catalog already puts it |
| Is "solved" durable? | `problem_progress.status`, written only by a verified Piston Submit | The dashboard reads Postgres, not the browser's `dsa.progress` key |
| Which day was an attempt? | The viewer's local day, and it must not move | Stamp `submissions.day` at insert time from the client's `utcOffsetMinutes`, so the streak never re-derives a timezone |
| Does a third-party calendar bring its own dependency? | Yes — the shadcn calendar needs `react-day-picker` | Hand-drawn heatmap grid instead; no new runtime dependency |

## Work units

### 9.1 Schema and migration

- [x] `lib/db/schema/problems.ts` — `topic` (`notNull().default("")`), a `problems_topic_position_idx` index, and `problems_topic_not_blank`. Text rather than an enum: the group list is authored data, and a new group should not need a migration.
- [x] `lib/db/schema/submissions.ts` — `utc_offset_minutes` (default 0, range check), `day` (`date`), `is_revision` (default false), and `submissions_day_idx`.
- [x] `lib/db/backfill-days.ts` + `lib/db/backfill-days.test.ts` — the day stamps are a **backfill module** like `backfill-arguments.ts`, with a pure planner that is unit-tested, run by `lib/db/migrate.ts` between migrations. The generated migration carries exactly one hand-written statement, with a comment saying why: the `CHECK` constraint cannot land before the rows it guards are filled, and drizzle-kit cannot express that `UPDATE`.
- [x] `pnpm db:migrate` applied it against the live database: 80 rows stamped onto 5 UTC days, 0 revisions, 13 solved and 13 drafts unchanged. A second run reports nothing pending.
- [x] **Gate:** `pnpm db:seed` — 107 problems, 271 examples, 1220 testcases, 17 topics; problem IDs, solved rows, drafts, submissions, and chat all preserved.

### 9.2 The topic on every problem

- [x] `lib/problems/topics.ts` — `PROBLEM_GROUPS` (the 17 roadmap groups in catalog order), `GROUP_OVERRIDES`, and `topicForSlug`.
- [x] `lib/problems/authoring.ts`, `lib/problems/index.ts` — `topic` reaches both `Problem` and `ProblemSummary`.
- [x] `lib/db/seed.ts` — reads the sheet once, maps each slug to its group, refuses a topic outside `PROBLEM_GROUPS`, and prints the per-group counts.
- [x] **Gate:** `psql` shows 17 groups, 107 rows, and the solved counts per group.

### 9.3 Day and streak math, as pure functions

- [x] `lib/practice/days.ts` — `dayKey`, `todayKey`, `addDays`, `dayRange`, `daysBetween`, `weekdayIndex`, `utcOffsetMinutesFor`, and the labels. Client-safe: no database import, no timezone-database dependency.
- [x] `lib/progress/calendar.ts` — `currentStreak` (a run ends today, or yesterday while today is still open), `longestStreak`, `summarizeStreak`, `heatmapWeeks`, `activityLevel`, `describeCell`.
- [x] `lib/progress/summary.ts` — `summarizeProgress` (overall, per difficulty, per topic in first-seen order), `formatCount`, `percentSolved`, and `UNCATEGORIZED` for a row that predates the backfill.
- [x] `lib/practice/days.test.ts`, `lib/progress/calendar.test.ts`, `lib/progress/summary.test.ts` — 44 cases, including the four boundary instants that an off-by-one day actually shows up at (23:45 UTC in IST, 00:15 UTC in PST, a leap day, a month boundary).
- [x] **Gate:** the three suites pass; `package.json`'s `test` glob includes `lib/progress/*.test.ts`.

### 9.4 Server reads and the write path

- [x] `lib/db/queries/dashboard.ts` — `listActivityDays` (one row per day, accepted counted in the same pass), `activityBounds`, `listProgressStatuses`, `getProblemStatus`, `dashboardTotals`, and the `activityRangeSchema` guard.
- [x] `lib/db/queries/problems.ts` — `topic` on the summary columns and in `toProblem`.
- [x] `lib/runner/types.ts` — `runRequestSchema` gains `utcOffsetMinutes` (-840..840) and `revision`.
- [x] `lib/db/queries/submissions.ts` — `persistRunResult` stamps `day`, `utcOffsetMinutes`, and `isRevision`; the duplicate-`requestId` path returns the existing row untouched. `nextProgressFromRun` is **not** changed: a solved problem already ignores later writes, which is what keeps `solvedAt`.
- [x] `app/api/run/route.ts` threads both new fields through.
- [x] **Gate:** `lib/db/queries/dashboard.test.ts` (fixtures on a fixed past day so the assertions are exact and nothing leaks into real history) and new `revision sessions` cases in `persistence.test.ts` — a revise is its own row, a revise accept does not rewrite the first solve, and an offset-less request falls back to the server's own clock. 19 cases pass, and `submissions` / `problems` counts are back to baseline afterwards.

### 9.5 The dashboard

- [x] `components/problems/catalog-header.tsx` — the mark, `solved / total` from Postgres, the 42-day tick strip, and the two nav targets. It replaces the old in-page header, so the dashboard and the list share one bar.
- [x] `components/dashboard/activity-heatmap.tsx` — 53 weeks of day cells, weekday rows, month labels, a legend, and one label per cell so nothing is hover-only. The contribution-graph shape is the point: the empty days have to be visible too.
- [x] `components/dashboard/streak-card.tsx`, `stat-card.tsx`, `topic-section.tsx` — current / best / active days, solved counters with bars, and one collapsible section per topic with a per-problem row (number, title, difficulty, solved tick, Revise).
- [x] `app/page.tsx` — the dashboard. Reads the catalog, the progress rows, the activity window, and the totals; renders four stat cards, the streak and the calendar, then the topic sections. `force-dynamic`, and a stopped database still renders `DatabaseUnavailable`.
- [x] `app/problems/page.tsx` — the moved list, now with a Topic column, a `solved` filter, a status that comes from Postgres, and a Revise button per solved row. It links the dashboard's `AppHeader` affordance back to `/problems`.
- [x] **Gate:** the running dev server returns 200 for both pages: the dashboard renders 370 labelled calendar cells, 17 topic sections in roadmap order, 21 progress bars, and the seeded counts (`13 / 107`, `5 days in a row`, `best 5`); the list renders 107 rows, 13 solved, 13 Revise links.

### 9.6 Revise mode

- [x] `components/problems/revise-button.tsx` — one `Link` to `/problems/<slug>?revise=1`, used by the topic rows, the list, and the workspace header.
- [x] `lib/hooks/use-practice.ts` — a `revision` option. In a revise session the buffer is the accepted source, held in state: nothing is read from or written to the draft, `codeDirty` never flips, and the stored draft is left alone. A `File`-less visit means a refresh starts the pass over, which is the honest cost of not touching the draft.
- [x] `components/workspace/workspace.tsx` — passes `revision` into the run body and into the practice hook, and shows a revise banner that says what is and is not being written.
- [x] `components/workspace/workspace-header.tsx` — `Revise` appears for a solved problem, `solved · revising` while in a session, and `leave revise mode` returns to the ordinary workspace.
- [x] `app/problems/[slug]/page.tsx` — reads `?revise=1`, reads the solved status on the server so the action is in the first paint, and keys the workspace on the session kind so entering or leaving remounts the buffers.
- [x] `components/workspace/history-panel.tsx` — a `revise` badge on a revision row.
- [x] **Gate (live):** a real `revision: true` Submit for `two-sum` against the running app and Piston — `accepted`, 12/12, `persisted: true`, stored with `is_revision = true`, `day = 2026-09-25`, `utc_offset_minutes = 330`; `problem_progress` still `solved` with `solvedAt` unchanged at `2026-09-22T12:06:00.976Z`; `drafts` still 13.

### 9.7 Checks and docs

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (294 tests) clean; `pnpm build` lists `ƒ /`, `ƒ /problems`, `ƒ /problems/[slug]`.
- [x] `package.json` — `lib/progress/*.test.ts` in the `test` glob.
- [x] Docs: this file, `docs/plan/README.md`, `docs/plan/00-scope.md`, `AGENTS.md`, `README.md`.
- [ ] **Gate:** `pnpm problems:check` and `pnpm piston:check` still pass (the catalog's problem data did not change; only `topic` was added to the rows).

## Phase gate

- [x] One additive migration applied to the live database with no data lost: 107 problems with topics, 81 stamped submission days, 13 solved, 13 drafts, and no test fixture left behind.
- [x] A revise reopens a solved problem from its accepted code, records history, and leaves `status` / `solvedAt` / the draft untouched — proven against the running app, not only in a test.
- [x] The dashboard's streak and calendar agree with the submission rows they are derived from: 21 verified submits over 5 consecutive days renders `5 days in a row`, `best 5`, and five filled calendar cells with no gaps.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- [ ] `pnpm problems:check && pnpm piston:check`
- [ ] A browser pass: the dashboard at `/`, a topic collapsed and reopened, Revise from a topic section, a revision submitted, and the calendar showing the new day.

## Out of scope

Reminders, notifications, goals, badges, a configurable week start, writing the
revision buffer to Postgres, per-topic notes, spaced repetition, and any change to
the disclosure rules or the judging path. 42 sheet problems remain
deferred: a topic only appears when it has a seeded problem.
