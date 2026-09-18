# Phase 3 — Durable practice state and submission history

**Status:** ready

Postgres becomes the practice store. Browser `dsa.*` keys are imported once, then kept only as a recovery copy for unsaved edits.

Do **not** persist chat threads yet, and do not add new problems.

## Work units

### 3.1 Schema and queries for practice

Reuse `drafts` and `problem_progress`. Add whatever columns this phase actually needs (revision / updated-at for stale-tab checks, catalog revision on submissions, request id). Additive migrations only.

- [ ] Server queries for draft, notes, progress, latest **verified** accepted submission.
- [ ] Submission list + detail queries. Detail applies Phase 2 disclosure rules.
- [ ] Progress is derived from genuine Piston Submits. The practice update endpoint must not accept arbitrary `solved` writes.
- [ ] Submissions store: source, mode, runner/runtime, counts, verdict, diagnostics, executed cases, catalog revision identifier, request id.
- [ ] Case rows store enough to re-render the console, including visibility metadata.

**Files:** `lib/db/schema/practice.ts`, `lib/db/schema/submissions.ts`, new `lib/db/queries/*`

### 3.2 Practice and submission endpoints

| Interface | Purpose |
| --- | --- |
| `GET /api/practice/[slug]` | Draft, notes, progress, latest accepted submission |
| `PATCH /api/practice/[slug]` | Save draft or user-owned notes/preferences |
| `POST /api/practice/import` | Import existing browser data |
| `GET /api/submissions?slug=…` | Paginated execution history |
| `GET /api/submissions/[id]` | Stored execution detail |

- [ ] Implement the table above with validated bodies.
- [ ] PATCH is drafts/notes/preferences only.
- [ ] GET submissions apply hidden-case disclosure. Never return the unrevealed suite.

**Files:** `app/api/practice/**`, `app/api/submissions/**`

### 3.3 Workspace load, save, and conflict handling

- [ ] Load saved state **before** enabling autosave, so a starter template cannot overwrite a real draft.
- [ ] Debounce draft/note saves by 500 ms. Serialize writes per resource.
- [ ] Revision checks: a stale tab cannot silently overwrite newer data. On conflict, keep the local buffer and offer reload or explicit overwrite.
- [ ] Saving / saved / save-failed using existing UI components.
- [ ] Keep a browser recovery copy for unsaved edits. Retry after recovery. Never silently discard work when Postgres is down.
- [ ] Resetting code saves the starter as the new draft. Notes and history stay.

**Files:** `components/workspace/*`, `lib/hooks/use-persisted-state.ts` (likely replaced or narrowed to recovery-only)

### 3.4 Import existing browser data

- [ ] Import valid `dsa.code.*`, notes, preferences, and legacy accepted-code records.
- [ ] Do not overwrite existing database values.
- [ ] Repeatable. Mark completion only after a successful transaction.
- [ ] Leave original `localStorage` in place.
- [ ] Keep old accepted code as a labeled **legacy snapshot**.
- [ ] Do **not** convert legacy acceptance into verified solved status. Those records may be mock runs or sample-only judging.
- [ ] Verified acceptance starts at the next successful full Piston Submit.

**Files:** import endpoint + a one-time workspace prompt

### 3.5 Persist Run / Submit after execution

- [ ] `/api/run` stores completed results.
- [ ] Execute Piston **outside** a database transaction. After the engine returns, write submission, cases, and progress in **one** transaction.
- [ ] Request id prevents duplicate history rows on retry.
- [ ] Accepted-code restoration reads the latest accepted **Piston Submit**.
- [ ] Solved status survives later failed attempts. Keep the original `solvedAt`.
- [ ] Record mock runs as simulated. Exclude them from genuine progress.
- [ ] Preserve historical results when a problem is reseeded. Label catalog revision; do not rewrite history.
- [ ] If execution succeeds and saving fails, show the result with an explicit “not saved” state. Do not claim durable progress.

**Files:** `app/api/run/route.ts`, runner result types, workspace console

### 3.6 History UI

- [ ] Compact history: source, verdict, timestamp, case details, “Load into editor.”
- [ ] Loading a historical submission snapshots that stored source into the editor (and then saves it as the draft through the normal path).

**Files:** new history panel in the workspace / console

### 3.7 Persistence tests, backup, README

- [ ] Tests: reload/restart survival, stale-tab conflicts, failed-save recovery, duplicate request ids, exact submitted-source retention.
- [ ] Progress tests: mock and Run never solve; genuine full Submit does; later failures preserve solved status.
- [ ] Document database backup/restore.
- [ ] Correct README claims so they distinguish durable database state, browser recovery copies, and demo/mock behaviour.

**Files:** tests, `README.md`

## Phase gate

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm problems:check`
- [ ] Restart the app (and Postgres) and recover draft, notes, verified accepted code, and history
- [ ] Import from `localStorage` is idempotent and does not mark unverified problems solved
- [ ] A failed save after a passing Submit does not show the problem as solved on reload

## Out of scope

Chat tables stay unused. No new problems. No Submit batching.
