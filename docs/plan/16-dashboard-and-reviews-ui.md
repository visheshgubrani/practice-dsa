# Phase 16 — Dashboard and reviews UI redesign

**Status:** complete, including implementation review corrections in work unit 16.9 (2026-10-10)

The dashboard had accumulated four stat cards, a review queue holding two lists,
a streak card, a year calendar, seventeen expanded topic sections, and a header
that carried its own navigation plus a 42-day activity tick strip. Every part was
legible on its own; the page as a whole was not. This phase made the dashboard an
overview again, gave every review list one home at `/reviews`, and put the three
study pages on a shared, collapsible navigation shell with a real type scale.

## Prerequisites and execution order

Phase 9's remaining catalog/Piston gate (`pnpm problems:check && pnpm
piston:check`) and its browser pass are still open. This phase does not close
them and does not regress them; the historical checklists keep their recorded
status. The [tutor-conversation follow-up](./12-tutor-conversation.md) also keeps
its existing status.

Phase 13 and Phase 14 semantics are preserved exactly: enrollment is explicit,
the first rating schedules atomically, pause/resume preserves the FSRS schedule,
and ratings never touch solved status, practice days, drafts, or submissions.

No migration and no reseeding were needed. The work reads and writes the same
tables through the same queries.

## What was settled before any of this was written

| Question | Decision | Consequence |
| --- | --- | --- |
| Which typeface? | **IBM Plex Sans** through `next/font` for the app's sans; **Geist Mono** stays for code, identifiers, and problem numbers | One family carries the interface; the mono face keeps its job |
| Where does the type scale live? | Semantic tokens in `app/globals.css` (`text-page`, `text-section`, `text-support`) plus the scale below, not scattered arbitrary values | A later screen inherits the scale instead of re-deciding it |
| How big is "bigger"? | Page title 32px, section heading 22px, body and navigation 16px, supporting text 14px minimum | The 11–12px supporting copy is gone from the study pages |
| Do counts wobble as they change? | Progress counts, due counts, dates, and table numbers use tabular figures | Numbers line up and stop shifting width |
| Where does amber go? | Page-level primary actions and the selected navigation item; row actions are outline | One obvious action per surface |
| What happens to faint text? | Faint treatments are removed, not restyled: `muted-foreground` at full strength replaces opacity tricks | Contrast improves without a new palette |
| Where does the shell live? | One route group (`app/(study)`) with a shared layout over `/`, `/problems`, `/reviews` | URLs do not change; the coding workspace stays outside the shell |
| Why is the workspace outside? | It is a focused, full-width editor surface with its own header | The shell adds a Reviews icon link to that header instead of wrapping it |
| How is collapse remembered? | The shadcn sidebar cookie, read on the server in the group layout through `lib/shell/sidebar-cookie.ts` | The first paint is already correct, so the sidebar does not jump |
| Expanded and compact widths? | 248px expanded, 64px compact | Compact keeps icons, accessible labels, and tooltips — never a hidden nav |
| What happens below 768px? | The same navigation becomes a closed-by-default drawer that closes after a navigation | One nav definition, two presentations |
| What does the dashboard keep? | One progress summary, one review reminder, the streak and calendar as one section, compact topic rows | No review lists and no problem-level lists remain |
| Where do review lists go? | `/reviews`, with **Due**, **Upcoming**, and **Paused** tabs showing their own counts, Due by default | The dashboard links to the page instead of duplicating it |
| What is "due"? | Active cards with `dueAt <= now`, ordered by due time then catalog position | Paused cards are listed but never counted due and never set the next-due boundary |
| Which review filters are history entries? | Tab and topic use `pushState`; the search box uses `replaceState` | Back restores the view you navigated from, and typing does not add an entry per keystroke |
| How do the badge, the reminder, and the page agree? | One `ReviewQueueProvider` in the study shell owns `useReviewQueueLoader`; `useReviewQueue` consumers read its context | One server initial read and one shared client state over `GET /api/reviews`, including refresh errors |
| Does scheduling change? | No: same FSRS adapter, same revision-checked pause/resume, same idempotent ratings | The redesign is presentation plus one additive DTO field |
| Which new components? | `sidebar`, `sheet`, `card`, `progress` and their registry dependencies | Installed without overwriting customized components; generated hooks land in `lib/hooks` |

## Typography and layout reference

| Token | Size | Used for |
| --- | --- | --- |
| Page title | 32px / 2rem | The single `h1` on each study page |
| Section heading | 22px / 1.375rem | Dashboard sections, review tabs, page sections |
| Body / navigation | 16px / 1rem | Paragraphs, nav items, buttons, table cells, form controls |
| Supporting | 14px / 0.875rem | Labels, counts, dates, helper text — the floor |
| Code | Geist Mono, 13–16px | Code, identifiers, complexity, problem numbers |

- One left-aligned content column, up to **1200px**, with **32px** desktop and
  **16px** mobile padding (`PageHeader` / `PageBody` in
  `components/shell/page-chrome.tsx`).
- Sidebar: **248px** expanded, **64px** compact, `md` (768px) breakpoint,
  cookie-backed collapse state read on the server.
- Surfaces keep the graphite palette; the amber accent keeps its meaning.

## Work units

### 16.1 Typography foundation

- [x] `app/layout.tsx` loads **IBM Plex Sans** through `next/font` as
  `--font-plex-sans`; Geist Mono stays `--font-mono` and the dark theme stays the
  default.
- [x] `app/globals.css` carries the study-page scale as theme tokens: `text-page`
  (32px), `text-section` (22px), `text-support` (14px); body and navigation use
  Tailwind's 16px base. `--font-heading` follows the sans.
- [x] Contrast pass: the study pages no longer use `text-[11px]` or `text-xs`
  supporting copy, and `muted-foreground` is used at full strength.
- [x] Counts, dates, and table numbers use `tabular-nums`.
- [x] `components/shell/page-chrome.tsx` defines the shared page title, actions
  row, and 1200px content column with 32px/16px padding.
- [x] **Gate:** the production build passes and the three study pages render at
  the new scale with no horizontal scroll at 390px (measured: `h1` 32px, section
  headings 22px, body 16px, supporting 14px, body font "IBM Plex Sans").

### 16.2 Review queue data and the shared loader

- [x] `ReviewQueue` gained `paused: ReviewSummary[]`; `dueCount` and `nextDueAt`
  are still computed from active cards only.
- [x] `lib/db/queries/reviews.ts` returns paused cards in the same due-time /
  catalog-position order, and `GET /api/reviews` serves them; `isReviewQueue`
  validates the new field.
- [x] `lib/hooks/use-review-queue.ts` is the one client loader: mount,
  navigation, focus, visibility, change-event, and due-boundary refreshes, with
  the last good queue kept on a failed refresh and a first failed read reported
  as `error` rather than as an empty queue.
- [x] `lib/reviews/queue-view.ts` holds the page's pure view logic (tab
  partitioning, counts, topic options, search, next-due pick) and
  `lib/reviews/date.ts` holds the shared local-date formatting.
- [x] **Gate:** `review persistence` covers paused partitioning, the existing
  due ordering, and a resumed overdue card; `queue-view` and `date` suites cover
  filtering and labels. All pass under `pnpm test`.

### 16.3 Shared navigation shell

- [x] Installed `sidebar`, `sheet`, `card`, and `progress` with the shadcn CLI.
  Only `components/ui/tooltip.tsx` changed, and only to upstream's two type
  annotations; no customized component was overwritten. `components.json`'s
  `hooks` alias points at `@/lib/hooks`, and the generated `use-mobile` hook was
  replaced by a wrapper over the existing `use-media-query` hook (which also
  cleared the only lint error the install introduced).
- [x] The dashboard, the problem list, and the reviews page moved into
  `app/(study)/` with a shared layout, preserving `/`, `/problems`, and
  `/reviews`.
- [x] `components/shell/study-shell.tsx` renders the sidebar: brand, Dashboard /
  Problems / Reviews with Lucide icons, tooltips and accessible labels in compact
  mode, and the due count as a badge on Reviews fed by the shared loader.
- [x] `app/(study)/layout.tsx` reads the sidebar cookie on the server and passes
  `defaultOpen`, with 248px/64px widths. Below 768px the same navigation is a
  sheet that closes on navigation.
- [x] Each study page owns its header through `PageHeader`; the duplicated
  navigation and the 42-day tick strip were removed with
  `components/problems/catalog-header.tsx`, `stat-card.tsx`, `streak-card.tsx`,
  `topic-section.tsx`, and the old `review-queue.tsx`.
- [x] `components/workspace/app-header.tsx` gained a Reviews link; the workspace
  stays outside the shell.
- [x] **Gate:** `/`, `/problems`, and `/reviews` render inside the shell; the
  collapse, its cookie persistence, keyboard order, and the mobile drawer all
  behave (browser checks).

### 16.4 Dashboard overview

- [x] `components/dashboard/progress-summary.tsx` replaces the four stat cards
  with one surface: overall solved count, one bar, and Easy/Medium/Hard rows.
- [x] `components/dashboard/review-reminder.tsx` is the one line about reviews:
  the due count, the next problem, **Open reviews**, and a **Retry** when a
  refresh fails — with the rest of the dashboard still usable.
- [x] `components/dashboard/streak-calendar.tsx` merges the streak and the
  calendar into one section, and `activity-heatmap.tsx` grew 14px labels, 14px
  cells, real month labels through `monthLabels()` in
  `lib/progress/calendar.ts` (the old code rendered the year prefix and missed
  every boundary that was not a Sunday), and a scroller that opens on the most
  recent weeks.
- [x] `components/dashboard/topic-progress.tsx` replaces the expandable topic
  sections with compact rows in roadmap order — topic, bar, solved/total — each a
  link to `/problems?topic=<encoded topic>`.
- [x] **Gate:** the dashboard renders 21 progress bars (1 overall + 3 difficulty
  + 17 topics), 17 topic deep links, one reminder, and one streak-and-calendar
  section, with no page-level horizontal scroll at 390px, 768px, or 1440px, and
  no overflow at 200% zoom.

### 16.5 Problem list

- [x] `components/problems/problem-table.tsx` derives the topic from `?topic=`
  with `useSearchParams`, validates it against the catalog (an unknown value is
  "all topics"), and writes it with `window.history.pushState`, so no Postgres
  re-read happens per filter click and Back restores the topic.
- [x] The topic filter composes with the search, difficulty, tag, and solved
  filters; the empty state's **Clear filters** resets the topic too.
- [x] Problems uses the new scale: 36px controls, `text-base` titles, `text-support`
  metadata, comfortable rows (`py-3`), no duplicated navigation, no tick strip.
- [x] `components/problems/difficulty-badge.tsx` moved to 14px text.
- [x] **Gate:** browser checks cover the encoded deep link from a dashboard row
  (9 rows), search + topic composition (1 row), the filtered-empty state, Clear
  filters, choosing a topic from the select, Back clearing it, an unknown topic
  falling back to all 109 rows, and the table scrolling inside its own wrapper at
  390px.

### 16.6 The reviews page

- [x] `app/(study)/reviews/page.tsx` plus `components/reviews/reviews-hub.tsx`
  and `review-row.tsx` build the hub: **Due**, **Upcoming**, and **Paused** tabs
  with their counts, Due by default.
- [x] Title/number search and a topic filter apply to the active tab; the tab and
  topic are history entries, the search box replaces the current one.
- [x] Rows show title, topic, difficulty, and the local due date/time, and stack
  on mobile.
- [x] Due rows offer **Start review** and **Pause reviews**; Upcoming rows offer
  **Review early** and **Pause reviews**; Paused rows offer **Resume reviews**
  and **Open problem**. The Due view offers **Start next review**, opening the
  first matching due problem in the server's order.
- [x] Pause/resume reuses the revision-checked API: the updating row's controls
  are disabled until the write completes, the list is re-read afterwards, and a
  409 refreshes the list and shows an actionable error naming the saved state.
- [x] Empty, filtered-empty, and error states are distinct. The page's first
  paint is server-rendered, so its loading affordance is the refresh spinner
  rather than a skeleton; a first failed read on the sidebar badge shows no count
  and the dashboard reminder shows **Retry**.
- [x] **Gate:** the stateful browser run covers the counts, ordering, filters,
  Back, pause/resume (schedule preserved), the stale-write conflict, disabled
  controls in flight, keyboard reachability, and 200% zoom.

### 16.7 Workspace review surfaces

- [x] The review banner in `components/workspace/workspace.tsx` (and the revise
  banner beside it) grew to body size with a labelled chip.
- [x] `components/workspace/review-rating-dialog.tsx` widened to `max-w-lg`,
  with 16px rating labels, larger tap targets, and the four rating meanings
  unchanged.
- [x] The review panels in `review-session.tsx` and `review-controls.tsx` moved
  to 14px/16px text; no new imports were added, so the recovery test's import
  allowlist still holds.
- [x] The completed-queue return action is now **Back to reviews**, in both the
  dialog and the persistent panel; the next-due problem action is unchanged.
- [x] **Gate:** a full review (start → finish → rate) works from the hub, the
  first rating offers the next due problem, the last one offers **Back to
  reviews**, and ratings wrote only review state.

### 16.8 Verification and documentation

- [x] Unit tests added: `monthLabels` boundaries, review date labels,
  `queue-view` partitioning/filtering/next-due, and the paused-card database
  cases.
- [x] Browser acceptance on a disposable database copy at 390px, 768px, and
  1440px including 200% zoom: collapse persistence, the mobile drawer and its
  close-after-navigation, keyboard order and Enter activation, topic deep links,
  review completion, pause/resume, conflict handling, filtered-empty, and a
  failed refresh.
- [x] Pause/resume and ratings preserve schedules and practice data; the original
  database's fingerprints are unchanged.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (419 tests), and `pnpm build`
  pass; the build lists `ƒ /`, `ƒ /problems`, `ƒ /problems/[slug]`, and
  `ƒ /reviews`.
- [x] `docs/plan/README.md`, `docs/plan/00-scope.md`, `AGENTS.md`, and
  `README.md` updated for the shell, the type scale, and `/reviews`.
- [x] **Gate:** every work unit was ticked after its checks passed, and the
  verification section records what was actually run.

### 16.9 Implementation review corrections

- [x] Own review queue state once in the study shell; badge, reminder, and hub consume the same provider, including refresh failures.
- [x] Keep dashboard progress and activity usable when the initial review read fails; render review errors with Retry rather than an empty queue.
- [x] Lock pause/resume per problem, reject duplicate requests synchronously, and retain each lock through canonical refresh.
- [x] Reconcile uncertain PATCH outcomes before reporting their result; do not claim a lost response means the write was rejected.
- [x] Give every weekday-axis row the calendar cell height so blank labels do not compress the axis.
- [x] Add regression coverage for these failure and concurrency cases; run lint, typecheck, tests, and build, recording actual results below.

**Gate:** the reproduced failures have regression coverage and the required checks pass. The original 81 browser checks below are historical evidence, not evidence for these corrections.

## Phase gate

- [x] The three study pages share one shell with a collapsible, cookie-backed
  sidebar and a 768px drawer, with no duplicated navigation; the workspace is
  unchanged except for its Reviews link.
- [x] The dashboard shows one progress summary, one review reminder, one
  streak-and-calendar section, and compact topic rows; no review lists remain.
- [x] `/reviews` is the only place review lists live: counted tabs, search, topic
  filter, per-tab actions, Start next review, and distinct empty, filtered-empty,
  and error states.
- [x] One shared loader keeps the sidebar badge, the dashboard reminder, and the
  Reviews page agreeing, including after a pause and at a due boundary.
- [x] Paused cards are never counted due and never move the next-due boundary;
  pause/resume and ratings leave schedules, solved state, practice days, and
  ordinary drafts intact.
- [x] No migration and no reseed were needed; problem IDs and practice data are
  unchanged.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and the browser
  acceptance run pass.

## Verification record — original implementation, 2026-10-10

**Automated checks.** `pnpm lint` clean. `pnpm typecheck` clean. `pnpm test`
**419 passed, 0 failed, 0 skipped** (was 398 before this phase). `pnpm build`
passes and lists the four study/workspace routes plus `ƒ /reviews`. No migration
was generated or applied, and no reseed was run.

**Browser acceptance.** A dependency-free Chrome DevTools Protocol driver ran the
production build (`next start`) through three suites — **81 checks, all
passing**:

| Suite | Checks | Covers |
| --- | ---: | --- |
| Shell and typography | 29 | IBM Plex Sans applied, 32/22/16/14px computed sizes, 21 progress bars, 17 topic deep links, 13 month labels, collapse to exactly 64px, cookie `sidebar_state=false` survives navigation, drawer opens and closes after navigating, 248px at 768px, the calendar opening scrolled to the recent end at 390px, no page-level horizontal scroll at 1440/768/390 |
| Problems topic filter | 15 | encoded deep link (`/problems?topic=Arrays%20%26%20Hashing`, 9 rows), composition with search, filtered-empty with Clear filters, select-based topic (7 rows), Back clears it, unknown topic falls back to 109 rows, 200% zoom clean on all three study pages, the table scrolling inside its wrapper at 390px |
| Stateful reviews | 37 | tab counts, server order, row content, Start next review, search and topic filters with Back, pause (schedule preserved, revision +1), resume (overdue card returns to Due), stale-write 409 with an actionable alert and a refreshed list, controls disabled in flight, badge/reminder/page agreement, a failed refresh showing Retry with the dashboard still usable, the workspace's Reviews link, keyboard order and Enter activation, 200% zoom, and two complete reviews ending on **Back to reviews** |

**Database preservation.** Every stateful check ran against
`dsa_phase16_ui`, a dump/restore copy that was dropped afterwards. The original
database was fingerprinted before and after the whole phase and the two records
are byte-identical: 109 problems, 275 examples, 1242 testcases, 2 progress rows,
2 drafts, 9 submissions, 20 submission cases, 8 threads, 38 messages, 0 legacy
accepts, 0 review cards, 0 review logs, `problem_id_fp`
`51d7730e0d6fabf72c3fa6c694642394`, `notes_fp`
`e79eb7b72345efe84ac65c8661271ce7`, `draft_fp`
`a78e76af59d3b03a6a844c8bacf8d0af`. The disposable copy only ever held throwaway
review cards created by the app's own scheduler helpers.

**Screenshots.** `docs/plan/evals/phase16-dashboard.png`,
`phase16-reviews.png`, and `phase16-reviews-390.png` are the 1440px dashboard,
the 1440px Due list, and the 390px list from the disposable copy.

**Recorded limitations.** The long-running `next dev` server on port 3000 served
its server-rendered HTML but never hydrated in the headless checks (its HMR
websocket rejected the handshake), including on pages this phase did not touch;
the acceptance therefore ran against `next start` from the production build,
which hydrates normally. The reviews page's "loading" state is the refresh
spinner rather than a skeleton, because the page's data is read on the server.
Native window focus/visibility transitions were reviewed but not independently
driven; the injected-failure check exercised the error and Retry path directly.

## Verification record — work unit 16.9, 2026-10-10

**Corrections.** The layout is now the only initial queue reader, and
`ReviewQueueProvider` owns the only client loader. The sidebar, reminder, and
hub consume the same queue and error state. Dashboard catalog/progress/activity
reads no longer depend on the review read. A missing queue renders unavailable
with Retry, rather than an empty-list claim. Refreshes share an in-flight
promise; invalidation during a read schedules another read and all callers wait
for its final result.

Pause/resume uses a synchronous per-slug request guard plus a set of pending
rows. Each row stays locked through its canonical refresh, including its links
and the **Start next review** action when it targets that row. Transport errors,
server errors, and malformed success responses trigger read-back without
automatically retrying the PATCH. If read-back also fails, the UI reports an
unconfirmed outcome; a confirmed PATCH followed by failed GET is reported as
saved with an unavailable list. A failed 409 refresh does not claim the list is
current. Every weekday-axis row has a fixed 14px height, matching the cells.

**Regression evidence.** `lib/reviews/queue-recovery.test.ts` has 10 tests
executing the actual hooks/components with transport and React storage doubles.
They cover the shared provider and real shell badge/reminder/hub after a failed
refresh; refresh coalescing and invalidation in flight; initial read failure
with dashboard progress and activity preserved; overlapping writes, duplicate
clicks, and locks through refresh; committed writes with lost, 500, or malformed
responses; unavailable reconciliation; stale-write refresh failure; and a
confirmed write followed by failed refresh. The final targeted run passed all
10, including the shell wiring and Start next review lock assertions.

**Required checks.** `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
`pnpm test` passed **429 tests, 0 failed, 0 skipped** against
`dsa_phase16_review_fixes`, a dump/restore copy. Read-only HTTP checks against the
final production build on port 3016 returned 200 for `/`, `/problems`, `/reviews`,
and `/api/reviews`, with the expected page titles, navigation shell, dashboard
sections, queue shape, and seven fixed-height weekday-axis rows in the HTML.
`git diff --check` is clean.

**Preservation and cleanup.** The original database's complete plain SQL dumps
before and after verification have identical SHA-256 hashes:
`2b11516fb622c04441f7b76b41f33a9824e57bacb63a82b933d02ed913e8c5e4`.
No migration or reseed ran. The temporary production server was stopped, the
disposable database was dropped, and the SQL snapshots were removed.

**Limit.** This correction run did not repeat browser interaction or computed
layout/zoom checks: computer-use inventory exposed no browsers and opening the
in-app browser returned unavailable. The calendar fix was inspected in source
and production HTML; its rendered geometry was not independently measured.
The original 81 browser checks above remain historical evidence.

## Out of scope

Notifications beyond the due count, automatic enrollment, FSRS settings or a
review-history browser, themes beyond the existing dark default (including a
light theme), hosting, auth, new executable languages, catalog expansion,
persistent review code buffers, and any change to judging, disclosure, or the
tutor contracts. Phase 9's remaining catalog/Piston gate and the tutor
conversation follow-up keep their existing status.
