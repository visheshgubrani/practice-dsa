# Phase 3 — Durable practice state and submission history

**Status:** complete

Postgres becomes the practice store. Browser `dsa.*` keys are imported once, then kept only as a recovery copy for unsaved edits.

Do **not** persist chat threads yet, and do not add new problems.

## Work units

### 3.1 Schema and queries for practice

Reuse `drafts` and `problem_progress`. Add whatever columns this phase actually needs (revision / updated-at for stale-tab checks, catalog revision on submissions, request id). Additive migrations only.

- [x] Server queries for draft, notes, progress, latest **verified** accepted submission.
- [x] Submission list + detail queries. Detail applies Phase 2 disclosure rules.
- [x] Progress is derived from genuine Piston Submits. The practice update endpoint must not accept arbitrary `solved` writes.
- [x] Submissions store: source, mode, runner/runtime, counts, verdict, diagnostics, executed cases, catalog revision identifier, request id.
- [x] Case rows store enough to re-render the console, including visibility metadata.

**Files:** `lib/db/schema/practice.ts`, `lib/db/schema/submissions.ts`, new `lib/db/queries/*`

### 3.2 Practice and submission endpoints

| Interface | Purpose |
| --- | --- |
| `GET /api/practice/[slug]` | Draft, notes, progress, latest accepted submission |
| `PATCH /api/practice/[slug]` | Save draft or user-owned notes/preferences |
| `POST /api/practice/import` | Import existing browser data |
| `GET /api/submissions?slug=…` | Paginated execution history |
| `GET /api/submissions/[id]` | Stored execution detail |

- [x] Implement the table above with validated bodies.
- [x] PATCH is drafts/notes/preferences only.
- [x] GET submissions apply hidden-case disclosure. Never return the unrevealed suite.

**Files:** `app/api/practice/**`, `app/api/submissions/**`

### 3.3 Workspace load, save, and conflict handling

- [x] Load saved state **before** enabling autosave, so a starter template cannot overwrite a real draft.
- [x] Debounce draft/note saves by 500 ms. Serialize writes per resource.
- [x] Revision checks: a stale tab cannot silently overwrite newer data. On conflict, keep the local buffer and offer reload or explicit overwrite.
- [x] Saving / saved / save-failed using existing UI components.
- [x] Keep a browser recovery copy for unsaved edits. Retry after recovery. Never silently discard work when Postgres is down.
- [x] Resetting code saves the starter as the new draft. Notes and history stay.

**Files:** `components/workspace/*`, `lib/hooks/use-persisted-state.ts` (likely replaced or narrowed to recovery-only)

### 3.4 Import existing browser data

- [x] Import valid `dsa.code.*`, notes, preferences, and legacy accepted-code records.
- [x] Do not overwrite existing database values.
- [x] Repeatable. Mark completion only after a successful transaction.
- [x] Leave original `localStorage` in place.
- [x] Keep old accepted code as a labeled **legacy snapshot**.
- [x] Do **not** convert legacy acceptance into verified solved status. Those records may be mock runs or sample-only judging.
- [x] Verified acceptance starts at the next successful full Piston Submit.

**Files:** import endpoint + a one-time workspace prompt

### 3.5 Persist Run / Submit after execution

- [x] `/api/run` stores completed results.
- [x] Execute Piston **outside** a database transaction. After the engine returns, write submission, cases, and progress in **one** transaction.
- [x] Request id prevents duplicate history rows on retry.
- [x] Accepted-code restoration reads the latest accepted **Piston Submit**.
- [x] Solved status survives later failed attempts. Keep the original `solvedAt`.
- [x] Record mock runs as simulated. Exclude them from genuine progress.
- [x] Preserve historical results when a problem is reseeded. Label catalog revision; do not rewrite history.
- [x] If execution succeeds and saving fails, show the result with an explicit “not saved” state. Do not claim durable progress.

**Files:** `app/api/run/route.ts`, runner result types, workspace console

### 3.6 History UI

- [x] Compact history: source, verdict, timestamp, case details, “Load into editor.”
- [x] Loading a historical submission snapshots that stored source into the editor (and then saves it as the draft through the normal path).

**Files:** new history panel in the workspace / console

### 3.7 Persistence tests, backup, README

- [x] Tests: reload/restart survival, stale-tab conflicts, failed-save recovery, duplicate request ids, exact submitted-source retention.
- [x] Progress tests: mock and Run never solve; genuine full Submit does; later failures preserve solved status.
- [x] Document database backup/restore.
- [x] Correct README claims so they distinguish durable database state, browser recovery copies, and demo/mock behaviour.

**Files:** tests, `README.md`

## Phase gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm problems:check`
- [x] Restart the app (and Postgres) and recover draft, notes, verified accepted code, and history
- [x] Import from `localStorage` is idempotent and does not mark unverified problems solved
- [x] A failed save after a passing Submit does not show the problem as solved on reload

## Out of scope

Chat tables stay unused. No new problems. No Submit batching.
