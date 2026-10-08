# Phase 14 — Rate before review enrollment

**Status:** complete (2026-10-08), including lost-response recovery in work unit 14.5.

Change review enrollment from an immediate-due unrated card to one atomic
initial self-rating and FSRS schedule. The flow becomes: solve or attempt → Add
to Review → Rate → Schedule → Return when due → Finish review → Rate →
Reschedule. Unsolved problems remain eligible. Ratings never change solved
status or practice activity.

Phase 13 is complete and remains historical evidence. Phase 9's outstanding
gate and the tutor-conversation follow-up keep their existing status.

## Agreed behavior

- Initial and repeat ratings use one controlled workspace dialog. Choosing a
  rating saves immediately; closing before choosing does not write.
- Initial prompt: **How did your first attempt go?** The choices are Again
  (Couldn't solve), Hard (Struggled), Good (Solved), and Easy (Effortless).
  Explain that this is a self-assessment and does not change solved status.
- Repeat prompt: **How did recall feel?** Keep the existing recall-specific
  descriptions and allow rating without Run, Submit, or accepted code.
- Opening the dialog captures the card revision and optional persisted
  submission ID. Retry resends the exact immutable payload and request ID.
- Active unrated cards expose **Rate first attempt**. Paused cards resume
  without a rating or schedule reset, then expose that action. Rated active
  cards retain Review now and Pause reviews.
- Finish review is the rating entry point for an enrolled review and for a
  direct review visit without a card. Closing leaves the review available to
  finish again. Suppress the accepted-solve offer in Review mode.
- Keep `ts-fsrs@5.4.2`, `dsa-fsrs-v1`, retention 0.9, short-term scheduling
  disabled, and fuzz disabled. Scheduler intervals are library outputs.
- No migration, enrollment backfill, or history rewrite. Keep dashboard
  eligibility `active && dueAt <= serverNow`, including legacy unrated cards.

## Invariants

- `expectedRevision: 0` creates a new card and appends its first rating in one
  transaction. A fresh card is revision 1; that rating is revision 2 and its
  log records expected revision 0 and the empty card snapshot.
- A request ID is locked and replay-checked before current card state. Exact
  retries return their original result after later ratings or pause/resume;
  different input with that ID conflicts.
- A competing initial request cannot rate a card created by another request.
  It receives a conflict with the current revision. Failures roll back both
  card and log.
- Existing unrated cards remain due on their saved schedule until explicitly
  rated. Paused cards cannot be rated; resume preserves schedule and adds no
  rating.
- Rating writes only review cards/logs. It never writes progress, drafts,
  notes, submissions, solve dates, or practice days.
- Save results are shown only after a validated server response. A transport,
  server, or malformed-response failure retains the exact payload for Retry.
  A 409 clears it, refreshes canonical state, and requires a fresh choice.

## Work units

### 14.1 Atomic API

- [x] Extend rating validation and the existing transaction writer for
  `expectedRevision: 0`, including conflict-safe card insertion and complete
  replay checks.
- [x] Remove enrollment-only `PUT` and the production `enrollReview` helper.
  Leave revision-guarded pause/resume unchanged.
- [x] Update API, transaction, and fixture tests for first ratings, all four
  scheduler grades, rollback, retries, conflicts, replay after later writes,
  legacy unrated cards, invalid input, and preserved practice data.

**Gate:** focused review API and persistence tests pass. There is no endpoint
that can create an unrated card through enrollment, and first enrollment plus
its rating/log is atomic.

### 14.2 Shared popup and controller

- [x] Add the official shadcn Base UI Dialog and compose it with existing
  Badge, ToggleGroup, Spinner, Alert, and Button components.
- [x] Move rating request, immutable pending payload, retry, result validation,
  conflict refresh, and queue notification into `useReviewCard`.
- [x] Mount one controlled dialog in the workspace. Connect Add to Review in
  Notes and the accepted-solve offer; successful initial rating shows
  **Added to review · next due [local date/time]** and Done.
- [x] Capture revision/submission context at open; guard double activation,
  preserve pending work when dismissed after failure, and block background
  refreshes from replacing captured context.
- [x] Keep focus in the dialog, restore it to its trigger, support arrow-key
  rating navigation and Enter/Space activation, and fit a narrow pane.

**Gate:** opening/dismissing writes nothing; one rating click enrolls and
schedules once. A confirmed success updates Notes and dismisses the accepted
offer. Failure and Retry preserve the exact request.

### 14.3 Repeat reviews and legacy cards

- [x] Replace inline ReviewSession selection/save controls with Finish review
  opening the shared dialog; remove duplicate rating and request state.
- [x] Support direct review of an unenrolled problem through enroll-and-rate.
  Review completion shows next-due navigation or Back to dashboard.
- [x] Active unrated cards expose **Rate first attempt**. Resume preserves
  paused schedules; rated cards retain Review now and Pause reviews.
- [x] Suppress the accepted-solve offer in review mode and update all copy that
  says enrollment is due now. Keep due queue ordering and boundary behavior.

**Gate:** initial and repeat reviews use the same immediate-save popup; closing
before rating leaves the card unchanged and the review available to finish.

### 14.4 Acceptance gate

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- [x] Verify the complete flow against a disposable database copy; do not reset
  or mutate the user's database.
- [x] Verify browser behavior for first ratings, unsolved enrollment, repeated
  ratings, legacy unrated cards, pause/resume, retries, lost responses,
  competing tabs, reload persistence, keyboard/focus, and narrow layout.
- [x] Verify representative solved and unsolved review Submits through Piston.
  Preserve fresh review code, explicit Notes/Solution reveals, and verified
  Submit semantics.

**Phase gate:** every new enrollment commits its first self-rating and FSRS
schedule together; later reviews reschedule through the same popup; existing
practice and review history remain preserved. Catalog-wide and harness checks
are not required because this phase changes neither catalog nor harness.

### 14.5 Pending-rating recovery after a lost response

- [x] Keep **Retry rating** reachable from Notes and Review when an uncertain
  request is pending, even after a canonical refresh reports an enrolled,
  rated, or paused card, or loading review state fails. Replace pause/resume
  controls while recovery is pending so blocked actions do not silently fail.
- [x] Add a regression test for commit → lost response → close → refresh →
  reopen → retry. Verify that the original request ID and payload are replayed
  and only one rating is recorded.
- [x] Run the focused regression, lint, typecheck, and production build;
  record the checks without writing to the user's database.

**Gate:** a dismissed uncertain rating can always be reopened and retried
without creating a new rating or losing its captured context.

## Verification record

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 382 tests, 109 suites, 0 failures. Database tests used
  the disposable `dsa_software_phase14_test_20261008` clone.
- `pnpm build` passed with Next.js 16.3.5.
- Browser acceptance on the disposable copy confirmed that canceling a first
  rating creates no card; initial Again schedules one day later; retry after a
  simulated 503 reuses the captured request; a competing initial rating
  returns 409 and requires a fresh choice; and a double click increments the
  revision once. The accepted-solve offer opens the same dialog and disappears
  after success. Existing unrated cards can be rated; pause/resume preserves
  the due date. Direct Finish review enrolls and rates in one action, and the
  due date survives reload. Focus restoration, ArrowDown navigation, and a
  360px dialog viewport were checked.
- Piston accepted a Submit for unsolved Valid Sudoku in Review mode and created
  its first solve. A solved Two Sum Review Submit was accepted without changing
  its review revision or due date. Fresh review code and explicit Notes and
  Solution reveals remain intact.
- No migration or catalog/harness change was made. The original
  `dsa_software` database was only read to create the disposable copy and was
  not reset or mutated.

### Work unit 14.5 verification (2026-10-08)

- Notes and Review keep **Retry rating** available while any request is
  pending, independent of canonical enrollment, last rating, pause state, or
  loading errors. Notes temporarily replaces the blocked pause/resume actions.
- `lib/reviews/recovery.test.ts` executes the actual hook and JSX conditions
  with in-memory React hook storage, presentation primitives, and transport.
  It verifies commit → lost response → close → refresh → reopen → retry,
  preserves the original revision/submission/request ID, and confirms one
  rating in the transport fixture. Rated, paused, and load-error recovery
  controls are covered. The test fails with the old Notes condition restored
  in memory, and passes with this fix.
- All seven focused recovery, scheduler, and due-boundary tests passed.
  Repository lint and typecheck passed through the installed local binaries.
  `pnpm build` passed outside the sandbox after the sandbox blocked Turbopack's
  worker port. No database writes or new browser acceptance run were performed
  for this follow-up; the original full-suite/browser record above is retained.
