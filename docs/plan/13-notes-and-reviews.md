# Phase 13 — Personal notes and spaced repetition

**Status:** complete — reviewed and wrapped up on 2026-09-30. Automated checks and supported browser acceptance scenarios pass. Live OpenAI generation and native browser focus transitions remain explicitly unverified below; no implementation phase follows this one.

Make each problem easier to remember: give personal notes their own workspace
tab, let the AI draft a short memory aid from the user's session, and schedule
deliberate recall with FSRS. Keep the interface small: notes, a review queue,
and four recall ratings.

## Prerequisites and execution order

Phase 9's remaining catalog/Piston checks and browser gate are still open.
This phase was started ahead of that gate and does not close it. The unfinished
[tutor-conversation follow-up](./12-tutor-conversation.md) keeps its existing
status; this feature does not claim to complete it.

When this phase becomes current, register it in the plan index and update
[00-scope.md](./00-scope.md) to open personal notes and spaced repetition
explicitly. This is a narrow extension of the deferred study-coach scope.
Execute one work unit at a time, in the order below. Tick a unit only after its
checks pass, and record what was actually verified.

Before implementation, read the relevant installed Next.js guides under
`node_modules/next/dist/docs/` and the shadcn skill. Use the installed AI SDK's
documentation and APIs; this phase does not include an SDK migration.

## Agreed product decisions

| Question | Decision |
| --- | --- |
| Where are personal notes? | A dedicated Notes tab in the left workspace pane, alongside Solution and AI Chat |
| What shape are the notes? | Short guided fields: key idea, steps, what tripped me up, time complexity, space complexity |
| Who writes them? | The user can type directly, or preview and selectively apply an AI draft |
| What does AI summarize? | The user's actual session, approach, code, and supported mistakes |
| What starts a review? | The statement and fresh starter code; notes and saved solutions require an explicit reveal |
| Which scheduler? | FSRS with Again, Hard, Good, and Easy; no settings screen |
| Which problems are enrolled? | Only problems the user explicitly adds, including unsolved problems |
| Must a review have accepted code? | No. The user can finish and self-rate even after going blank without a Submit |
| Do ratings affect solved status or streaks? | No. Existing verified Piston Submit rules remain authoritative |
| What happens to existing Revise? | It continues to open accepted code; recall-first Review is a separate mode |
| Are review code buffers durable? | No. They live in memory and restart on refresh; personal notes remain durable |

The intended flow is: practice a problem → write or draft notes → Add to review
→ return to fresh code → recall the approach → reveal help if needed → rate
recall → see the next review date.

## Existing implementation to build on

- Personal notes already live in `problem_progress` as approach, time, and
  space fields. Practice GET/PATCH and the practice hook provide autosave,
  browser recovery, retry, and conflict handling.
- The Solution tab currently combines those editable notes with accepted code
  and legacy snapshots. Personal note defaults currently come from catalog
  approach notes; this mixes authored guidance with the user's own writing.
- `usePractice` seeds revise buffers from accepted code. Its revise-loading
  branch currently returns before applying server notes, which must be fixed
  when notes become a first-class surface.
- Chat context already has bounds and a disclosure-safe submission loader.
  Reuse those boundaries for AI notes without starting a chat turn or writing
  extra chat messages.
- The dashboard reads Postgres on each page load. Add reviews to that existing
  surface rather than building a separate study application.

## Invariants

- Never reset the database. Use additive Drizzle-generated migrations only
  (`pnpm db:generate`), preserving problem IDs and all existing practice data.
- Preserve historical submission snapshots. Ratings and enrollment do not
  rewrite submissions, drafts, solve dates, or activity days.
- Only a successful verified Piston Submit marks a problem solved. Only a
  verified Piston Submit, any verdict, contributes to the existing streak.
- Review ratings are self-assessments, independent of problem difficulty,
  judge verdict, and the AI. Neither judge nor AI chooses a rating.
- AI generation is a preview operation. It never writes personal notes until
  the user applies text through the normal notes save path.
- Never send reference-solution source or unrevealed hidden cases to the AI.
  First failing hidden cases use the same disclosure policy as the tutor.
- Keep catalog `SolutionNotes` and authoring imports unchanged. Personal-note
  extensions belong to client-safe practice types, not the seed-only catalog.
- Use existing shadcn Base UI components, semantic tokens, and `cn()`. No new
  UI library or rich-text editor dependency.

## Work units

### 13.1 Personal note storage and dedicated tab

- [x] Introduce a personal-notes type extending the existing fields with
  `steps` and `pitfalls`. Keep `approach` as the stored/API name for the field
  labeled **Key idea**; do not rewrite existing text to fit the new label.
- [x] Add nullable `user_notes_steps` and `user_notes_pitfalls` columns to
  `problem_progress` through a generated additive migration. Preserve the
  existing notes/language revision counter and solve fields.
- [x] Extend practice GET/PATCH, validation, import, browser recovery,
  equality checks, and autosave serialization to carry the new fields. Old
  records with missing fields normalize to empty strings. Long note fields
  allow 20,000 characters each; complexity fields allow 200 each.
- [x] Preserve all existing database notes and recoverable browser edits,
  including intentionally empty saved values. Do not infer whether an older
  saved note was authored by the user or copied from catalog guidance.
- [x] Start genuinely new personal notes empty. Do not initialize new
  personal-note recovery entries from `problem.notes`. Preserve existing
  recovery data under the established import/recovery rules.
- [x] Split the existing Solution panel: Solution keeps accepted code, legacy
  snapshots, and clearly labeled read-only catalog approach guidance; Notes
  owns the personal editor and save status.
- [x] Use this tab order: **Description → Solution → Notes → AI Chat →
  Visualize**. Add `notes` to the tab type, retain chat/visualizer mounting
  behavior, and allow horizontal tab-strip scrolling in narrow panes.
- [x] Use textareas for Key idea, Steps, and What tripped me up, plus the
  existing Time/Space inputs. Include concise placeholders that help recall.
- [x] Keep the 500 ms debounce, recovery copies, retry controls, and conflict
  UI. Check affected rows on revision-guarded updates so a concurrent save
  cannot report success without persisting its changes. Handle concurrent
  first inserts as conflicts rather than silently overwriting.
- [x] Ensure an older in-flight save cannot clear the dirty state of a newer
  edit. Load and save notes in both ordinary and revise sessions; keep notes
  hydration independent of code-buffer initialization for the later review
  mode.

**Gate:** existing three-field notes survive migration unchanged; new fields
round-trip through Postgres and browser recovery; rapid typing, reload,
in-flight edits, retry, and two-tab conflicts retain the user's work. A revise
session displays current server notes while leaving the stored code draft
untouched. Verify the new tab in a narrow and a wide workspace.

Verified 2026-09-29. Migration `20260929142825_add_personal_note_fields` adds
only `user_notes_steps` and `user_notes_pitfalls`. Before and after: 109
problems (`56b9aae559e45bc5f7a32716568b3983`), 16 progress rows, 14 drafts,
114 submissions, and the same notes fingerprint
(`4c363c94590f0da5596a8b0851c55342`). Every existing note column stayed null.
Practice and persistence tests cover length limits, empty saved values, stale
revisions, and a concurrent first insert. In the browser, Two Sum's Notes tab
saved all five fields, survived reload, and stayed visible in revise mode
while the draft stayed at revision 188 (`18d50a60dfa68bbff693a818da0e9b0e`).
The tab strip scrolls at 390px (`scrollWidth` 432) and shows every tab at
1280px. Those Two Sum sentences were written during this check.

### 13.2 AI draft preview from the practice session

- [x] Add **Draft from my session** to Notes, opening an editable preview.
  Generation alone writes neither personal notes nor chat messages.
- [x] Add `POST /api/notes/generate` accepting the problem slug, executable
  language, current editor source, current personal notes, optional selected
  thread ID, and optional current persisted submission ID.
- [x] Resolve the problem through the public database read path. Load the
  selected thread and submission server-side and validate that both belong
  to this problem. Reject mismatched references; never mix contexts across
  problems. With no selected thread or submission, omit that context.
- [x] Bound editor, notes, conversation, and disclosed attempt context using
  the existing tutor limits/helpers. Include only completed assistant
  messages. Keep editor code distinct from the submitted source and verdict.
- [x] Use a dedicated notes prompt and the existing model/provider
  configuration. Generate the five personal-note fields with `generateText`
  and `Output.object`, validated with Zod using the installed SDK APIs.
- [x] Aim for roughly 150–250 words overall. Summarize the approach actually
  attempted or discussed, record personal mistakes only when supported, and
  leave unknown fields blank. Label incomplete/failed approaches honestly;
  do not claim that a draft passed or substitute a generic optimal approach.
- [x] Generate a memory aid without full solution code. Leave uncertain
  complexity blank. If there is no meaningful session evidence, return a
  short explanation instead of inventing a personalized session summary.
- [x] Offer **Fill empty fields**, individual **Use this field** actions, and
  **Discard**. Replacing an occupied field requires that explicit per-field
  action. Apply text through the normal note-change/autosave path.
- [x] Compare the current field with the version captured when generation
  began before replacing it. If it changed meanwhile, show the current and
  proposed content for renewed review; never silently overwrite the edit.
- [x] Preserve the preview across tab switches and cancel generation when
  leaving the problem. A failed save after applying a draft uses normal note
  recovery/retry handling.
- [x] Missing API key, timeout, cancellation, provider failure, and invalid
  output leave notes untouched. Manual writing remains available. Do not
  generate fake personalized notes from the scripted chat demo.

**Gate:** deterministic context/prompt and stubbed-output tests establish safe
disclosure, problem ownership, bounded context, supported personal details,
and no writes during generation. Browser-check selective application,
discard, edits made during generation, tab switching, and errors. With a
configured key, verify one real session draft; record explicitly if live
generation could not be verified.

Verified 2026-09-29. The route is `app/api/notes/generate` over
`lib/ai/notes-context.ts` (problem, thread, and run resolved server-side),
`lib/ai/notes-prompt.ts`, and `lib/ai/notes-draft.ts` (an injectable generator
seam; `Output.object` validated with Zod). The browser side is
`lib/notes/{types,client}.ts`, `lib/hooks/use-notes-draft.ts`, and
`components/workspace/notes-draft.tsx`; the chat workspace moved up into
`components/workspace/workspace.tsx` so a draft can name the selected thread,
and `NOTE_FIELD_LABELS` is now shared. `pnpm test` is 367 (was 332): prompt and
disclosure determinism, ownership against two throwaway catalog rows, stubbed
success/failure/timeout/abort/invalid-output, and the fill/replace helpers.

Live route checks: invalid JSON and invalid body 400, unknown problem 404, a
thread or run from another problem 404, an untouched session 200
`insufficient` with no model call, and no key 503. In headless Chrome (CDP
driver, real UI) a local stand-in for the OpenAI Responses API ran the same
route, prompt, SDK, and schema on 16 steps, all passing: preview from a real
conversation, per-field apply, fill-empty, preview surviving a tab switch,
discard, provider failure, invalid output, cancel, a field edited mid-flight
showing "yours now" against the draft, Keep mine, Replace with draft, leaving
the problem cancelling in flight, and the insufficient-context result. A bug
the browser check caught: a brand-new conversation holds a client-generated
thread id that no row matches, so the client now omits a thread with no
messages instead of sending an unverifiable reference.

Live OpenAI generation was **not** verified: this environment has no
`OPENAI_API_KEY`, only `DEEPSEEK_API_KEY`, and the app's provider is OpenAI.
`OPENAI_BASE_URL` pointed the real path at the local stand-in, so prompt,
schema, error handling, and UI are exercised, but a genuine `gpt-6-luna` draft
was not produced. Practice data before and after: 109 problems, 16 progress
rows, 14 drafts, 114 submissions, 31 threads, 208 messages; no thread or
submission was created by generation. Two Sum's notes are byte-identical
(hash `2ac1eaa436241cd7f3bea67bf421b571`); the mock text written into Encode
and Decode Strings during the check was cleared back to null. Only the
`problem_progress.revision` counters moved (9→11 and 3→5) from the autosaves
that check performed.

### 13.3 FSRS adapter, review storage, and APIs

- [x] Add `ts-fsrs`, pinned to an exact version in the manifest and lockfile.
  Use the maintained scheduler rather than implementing FSRS formulas.
- [x] Add a server-side adapter with an injectable clock. Use target retention
  `0.9`, short-term scheduling disabled, fuzz disabled, and library default
  weights/maximum interval. Do not add an optimizer or user settings screen.
- [x] Centralize those parameters under a versioned configuration identifier.
  Persist the scheduler package/configuration version with review history so
  future upgrades do not reinterpret old decisions silently.
- [x] Create a `review_cards` table with one unique problem reference, active
  flag, indexed `dueAt`, complete serialized FSRS card state, revision counter,
  timestamps, and configuration version. Validate card state at the storage
  boundary and restore Date values before invoking FSRS. Keep `dueAt` and the
  card's due value synchronized within the same write.
- [x] Create an append-only `review_logs` table with a unique request ID,
  problem/card reference, rating, server review timestamp, before/after card
  snapshots, FSRS log, scheduler/configuration version, and optional associated
  submission ID. Generate an additive migration; do not backfill enrollment.
- [x] Implement manual enrollment for any existing problem, solved or not.
  A new card is active and due immediately; the first rating determines its
  next interval. Repeated enrollment preserves state. Pausing/resuming keeps
  the schedule and logs; an overdue resumed card is immediately due.
- [x] Use UTC instants for scheduling and the server clock for rating writes.
  Due means `active && dueAt <= serverNow`. Display dates in the browser's local
  timezone; review eligibility does not depend on stored streak day keys.
- [x] Lock the card during rating writes. In one transaction, verify the
  expected revision, compute the FSRS result, append the log, update card state
  and due date, and increment the revision. Reject ratings for paused or
  unenrolled problems without changing state.
- [x] Make retries idempotent: replaying the same request ID and payload
  returns the original saved outcome, even if the card has since changed.
  Reusing an ID with different input is rejected. A new request with a stale
  revision returns a conflict without logging or scheduling again.
- [x] Validate that an optional associated submission belongs to the problem.
  It is context only and never a prerequisite for rating. Permit early review
  of active cards as well as overdue review.
- [x] Keep FSRS internals server-side. Client DTOs expose enrollment, last
  rating, next due date, revision, and problem summaries rather than library
  card internals.

**API contract:**

| Endpoint | Behavior |
| --- | --- |
| Existing practice GET/PATCH | Extend personal notes with `steps` and `pitfalls` |
| `POST /api/notes/generate` | Return a validated preview or insufficient-context result; never save notes |
| `GET /api/reviews` | Return active due/upcoming problem summaries and due count |
| `GET /api/reviews/[slug]` | Return enrollment, active state, next due date, last rating, and revision |
| `PUT /api/reviews/[slug]` | Idempotently enroll; do not reset or implicitly resume an existing card |
| `PATCH /api/reviews/[slug]` | Pause/resume using `active` and expected revision |
| `POST /api/reviews/[slug]/rate` | Accept `rating`, `requestId`, `expectedRevision`, optional `submissionId`; return persisted state and next due date |

Use string ratings `again`, `hard`, `good`, and `easy` at the application API
boundary and map them to the library in the adapter. Use the project's usual
validation/error format: invalid input is 400, missing resources are 404, and
stale or incompatible state is 409. Database errors must not produce a
successful enrollment, rating, or optimistic due date.

**Gate:** fixed-clock tests cover each rating, first review, lapses, overdue
and early reviews, date serialization, and pause/resume. Database tests prove
unique enrollment, duplicate-request replay, mismatched replay rejection,
stale-tab conflicts, and atomic rollback. Rating-only actions leave drafts,
submissions, progress, and activity untouched. Include new suites in the
existing `pnpm test` command.


Verified 2026-09-29. ts-fsrs@5.4.2 is pinned exactly. The server adapter uses versioned config dsa-fsrs-v1, 0.9 target retention, no short-term scheduling or fuzz, and library-default weights and maximum interval. It validates and restores the complete serialized card before scheduling. Review APIs now expose the active due/upcoming queue, per-problem state, idempotent enrollment, revision-guarded pause/resume, and atomic, retry-safe ratings.

Generated and applied additive migration 20260929175214_magical_blazing_skull; it creates only the review enum, card/log tables, indexes, and foreign keys, with no enrollment backfill. pnpm test passed all 372 tests; the final focused review suites passed all 5 tests. pnpm typecheck and pnpm lint pass. Database counts before and after were identical: 109 problems (ID fingerprint bc3b743bae9848e1633ab1c149db88e4741f32a60dcd988652e813c3dc6e67b9), 14 drafts, 16 progress rows, 0 legacy accepts, and 114 submissions. All 16 existing notes rows retained fingerprint 1c39d09ea481f0aafc488ad5b3e941c454cfe7c0a9008c8b7843ca1faaaa7045.
### 13.4 Recall-first workspace and self-rating

- [x] Add `/problems/<slug>?review=1` as a distinct workspace session mode.
  Review takes precedence when both `review=1` and `revise=1` are present.
  Preserve existing revise behavior and key the workspace by session mode.
- [x] Separate the code-buffer mode from the Submit revision flag: review
  always uses a temporary buffer, but Submit behavior depends on whether the
  problem is solved. Do not overload the existing revision boolean to mean
  all three behaviors.
- [x] Initialize review on Description with the selected executable language's
  starter code. Never render saved draft/accepted code as a loading fallback.
  Reset review code/reveal/rating state on a fresh visit; keep notes durable.
- [x] Show a small review banner: **Recall the key idea, outline the steps,
  then try coding.** Explain that the code buffer restarts on refresh.
- [x] Gate Notes and Solution contents behind explicit **Show notes** and
  **Show saved solution** actions for this visit. AI Chat and history remain
  available when deliberately opened. Reveals do not auto-select a rating.
- [x] Allow Run/Submit through the existing harness and judging path. For
  solved problems, review Submits are revisions and preserve first solve and
  stored draft. For unsolved problems, normal verified Submit rules can create
  the first solve, without saving the temporary code as the ordinary draft.
- [x] Notes continue to hydrate and save independently of the temporary code
  buffer. Neither entering/leaving review nor loading a solution writes the
  ordinary code draft or its recovery key.
- [x] Add **Finish review**, available without a Run or Submit, to expose the
  four self-rating controls. A Submit never automatically records a rating.
- [x] Show the rating meanings below. After a confirmed save, display the next
  due date and **Next due problem** or **Back to dashboard** when none remain.
- [x] Disable rating controls during save. On failure, retain the selected
  rating and request ID for retry. On conflict, refresh server state and make
  the conflict visible rather than silently applying the old rating again.
  Advance the queue only after confirmed persistence.
- [x] A direct review URL for an unenrolled or paused problem may open the
  recall workspace, but rating requires an explicit Add/Resume action. Do
  not enroll or resume a problem just because its URL was visited.

| Rating | Meaning shown to the user |
| --- | --- |
| Again | I went blank or needed the core approach explained |
| Hard | I recalled it, but with substantial effort |
| Good | I recalled the approach and could work through it |
| Easy | I recalled and applied it confidently |

**Gate:** verify no accepted-code flash, no draft/recovery writes, independent
note persistence, reveal behavior, refresh reset, and rating without Submit.
A real Piston review Submit for a solved problem preserves `solvedAt` and the
draft; one for an unsolved problem can legitimately solve it. Rating alone
does not alter the streak, while verified Submits retain their existing day
stamps and activity behavior.


Verified 2026-09-30. `pnpm lint`, `pnpm typecheck`, `pnpm test` (374 tests),
`pnpm build`, `pnpm problems:check` (1,767 checks), and `pnpm piston:check`
(443 checks) passed. New throwaway-database tests verify that an unsolved review
Submit can create the first solve without replacing the stored draft, and a
solved review Submit is recorded as a revision while preserving `solvedAt` and
the stored draft. Existing review persistence tests verify ratings write no
progress, drafts, or submissions. The review workspace and GET review API both
returned HTTP 200 for an unenrolled problem; no review card or submission was
created against seeded user data. Interactive browser checks were unavailable:
this session exposed no browser target (`iab` and Chrome were unavailable), so
first-paint, reveal, and rating clicks remain to be confirmed in the Phase 13.6
browser acceptance run.

### 13.5 Enrollment controls and dashboard review queue

- [x] Show **Add to review** in Notes, and offer it after a verified successful
  Submit without enrolling automatically. Existing cards show next due date,
  **Review now**, and **Pause reviews / Resume reviews**.
- [x] Add a compact **Review due** section to the existing dashboard with due
  count, problem title/difficulty, due label, and **Start review**. Sort by due
  time ascending, with catalog position as a stable tie-breaker.
- [x] Include a collapsed upcoming list of active enrolled problems so future
  reviews remain accessible for early review or pausing. Paused problems can
  be resumed from their Notes tab and are excluded from due counts/lists.
- [x] Show **No reviews due** when caught up, with the next scheduled date if
  there is one. For no enrollments, explain Add to review in the workspace.
- [x] Refresh review state after writes and when the dashboard regains focus.
  While it stays open, re-fetch at the earliest upcoming due time so its count
  does not stay stale. Treat server eligibility as authoritative.
- [x] Use existing controls, loading/empty/error components, and keyboard
  affordances. Keep review dates and actions readable at narrow widths.

**Gate:** browser-check manual enrollment, due ordering, rating-to-next-review
flow, early review, caught-up/empty states, pause/resume, focus refresh, and a
due-time boundary. Database failures must not look like an empty queue.

Verified 2026-09-30. `pnpm lint` and `pnpm typecheck` pass. In the browser,
the dashboard showed **No reviews due** with workspace enrollment guidance,
and Two Sum's Notes tab showed **Add to review**. These were read-only checks;
no review card or submission was written to the seeded database. Manual
enrollment, due ordering, rating-to-next-review, early review, pause/resume,
focus refresh, and the due-time boundary remain unverified and are carried into
the 13.6 browser acceptance run, which needs a disposable test database.

### 13.6 Final verification and documentation

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- [x] Run `pnpm problems:check` and `pnpm piston:check`; preserve existing
  judging and disclosure behavior.
- [x] Apply only the generated migrations to the existing database. Record
  before/after problem IDs and practice-table counts, and verify existing note
  values are unchanged. Do not re-seed just to create personal review data.
- [x] Complete the browser scenario below, including an app restart, and
  record live AI/Piston coverage separately from stubbed tests.
- [x] Update the plan index, scope invariants, app README, and AGENTS.md for
  Notes, Review versus Revise, manual enrollment, and rating/streak separation.
  Keep unrelated unfinished follow-ups accurately marked.
- [x] Record implementation verification in this file, then close the phase
  only when all work units and phase gates are complete.

## Final review and verification — 2026-09-30

The review found and fixed these gaps before closing the phase:

- Rating the only due card failed because JavaScript `null` became SQL NULL
  in the required `review_logs.next` JSONB snapshot. Store JSON `null` when
  there is no next problem. A new database test verifies saving and replaying
  this outcome, including one log and a confirmed next due date.
- A rating retry could attach a newer Run's submission ID. Capture the entire
  request, including `submissionId`, and reuse it unchanged. The browser test
  dropped a successful response, ran code, retried, and confirmed identical
  request bodies and only one scheduling transition.
- FSRS intervals can exceed the browser's approximately 25-day timer limit.
  Both the dashboard and review banner now re-arm bounded timers until the due
  boundary. Fixed-clock tests cover a 90-day interval, cancellation after
  re-arming, and invalid dates. The real dashboard moved from zero to one due
  automatically at the disposable card's scheduled boundary.
- Review enrollment/resume conflicts were erased by a canonical refresh.
  Keep the action error visible. Successful queue refreshes clear old errors.
  Enrollment/pause/resume from Notes now also refreshes the recall panel in
  the same visit; the resume explanation accurately describes preservation
  of the existing schedule.
- A direct Revise Submit on an unsolved problem could write progress. Revision
  submissions now stop after storing history; unsolved Review Submits retain
  normal first-solve semantics. The persistence regression verifies both.
- The AI notes prompt omitted the referenced submitted source and failing-case
  diagnostics. Include them through existing context bounds and disclosure
  helpers, separately from the current editor. Tests continue to exclude
  reference source, hidden successes, and incomplete assistant messages.

`pnpm lint`, `pnpm typecheck`, `pnpm test` (**379 passed, zero failures or
skips**), `pnpm build`, `pnpm problems:check` (**1,767 checks**), and
`pnpm piston:check` (**443 checks**) pass. An initial Piston run had two
sandbox timeouts while the production build was running; the full rerun after
that load finished passed without changing execution limits or judge data.
Additional database tests execute truly concurrent duplicate and competing
ratings, and verify due ordering, boundary eligibility, and pause exclusion.

**Existing database preservation.** Re-ran `pnpm db:migrate`; both generated
Phase 13 migrations were already applied, so no migration was pending. No
reseed, reset, enrollment, note edit, or Submit was made against user catalog
rows during this review. All original table fingerprints matched before
migration, after migration, and after the full review. Counts stayed:

| Table | Before and after |
| --- | ---: |
| problems | 109 |
| problem_progress | 16 |
| drafts | 14 |
| legacy_accepted | 0 |
| submissions | 114 |
| submission_cases | 413 |
| chat_threads | 31 |
| chat_messages | 208 |
| review_cards | 0 |
| review_logs | 0 |

The ordered problem-ID/slug SHA-256 stayed
`b7830580668cca4bb438f351e27cb3e5d3480566077da24e43365c7810f466a9`.
The five-field note-value SHA-256 stayed
`ddc53ceaad6194d84336f8f174f11bd07b4a197ba7ae7bc75dcc5e77e4bd4e23`.
The first baseline automated suite inserted/deleted its own throwaway rows,
using the established tests; subsequent suites and all browser writes used
`dsa_phase13_review_20260930`, a separate local dump/restore copy. Neither
migration adds enrollment data, and no new migration was needed by the fixes.

**Browser acceptance.** Ran the production build through the in-app browser
against that isolated database. Existing Two Sum notes retained their original
text; new fields saved/reloaded. New Valid Parentheses notes started empty.
Ordinary, Revise, and Review notes hydrated independently of code. Review
started on Description with starter code, gated Notes/Solution behind explicit
reveals, and refreshed back to a starter after temporary edits. An application
process restart preserved notes, enrollment, last rating, and next due dates;
review buffers and reveal/rating UI reset. The ordinary draft fingerprints
stayed unchanged through entering Review, revealing/loading saved code,
Run/Submit, rating, refresh, and leaving the session.

Again was saved without a Run/Submit and wrote one log with identical progress,
draft, and submission snapshots. Early review and Good/Hard ratings persisted
separately from execution. Unenrolled URLs did not create cards; manual Notes
enrollment immediately enabled ratings in the same visit. Repeated PUT
preserved state. Pause/resume preserved due dates and removed/restored cards in
the active queue. Checked due/upcoming ordering, the caught-up next-date view,
the no-enrollment state, queue advancement to Group Anagrams, and the automatic
due-time refresh. Two concurrent browser visits to Valid Parentheses produced
one saved rating and a visible stale-tab conflict with the selection cleared.

Real Piston accepted both review attempts: Two Sum was recorded as a revision
with its original solve date and draft untouched; an unsolved Valid Parentheses
review created its first solve while preserving an ordinary fixture draft.
The latter still had no automatic enrollment or rating. Ratings alone left
stored submission days and activity unchanged; verified Submits retained the
normal day stamps. Keyboard ArrowRight followed by Enter activated AI Chat.
At **390 × 844**, the tab strip had `clientWidth` 360 / `scrollWidth` 432;
tabs scrolled and the workspace stacked above the editor. Wide layout was
verified at **1280 × 720**. The viewport capability applied after a delay;
its final DOM measurements and screenshot confirmed the narrow check.

**Stubbed AI and failure coverage.** No `OPENAI_API_KEY` was configured. The
real notes endpoint reported the missing key with notes unchanged. A temporary
local test proxy supplied a labeled draft response to exercise editable
preview, tab preservation, filling only empty fields, individual application,
discard, typing during generation, current/proposed comparison, and Keep mine.
Generation itself made no note/chat writes. Provider success/failure, timeout,
abort, invalid output, problem ownership, and disclosure are also covered by
deterministic server tests. This establishes preview behavior, not live model
quality. Live OpenAI generation remains unverified.

Injected note-save and queue HTTP failures retained recovery text, displayed
errors, and succeeded on Retry. A malformed due-date fixture in the disposable
database also caused a real server-side queue error; it was shown rather than
an empty queue, and repair plus refresh restored the schedule. Database tests
verify atomic rating rollback. Native window focus/visibility transitions could
not be independently driven by these browser tools: the focus/visibility
listeners were reviewed, while manual refresh and live due-boundary refresh
were exercised. This limitation is recorded, not counted as a browser pass.

Updated the plan index, scope, app README, and AGENTS.md. The older Phase 9
and tutor-conversation checklists keep their recorded status. No later phase,
automatic enrollment, notifications, or persistent review buffer was opened.
Stopped the test app/proxy, closed the test browser tabs, cleared the viewport
override, removed the disposable database, and deleted its source dump after
verification. The original database's final fingerprints still matched.

## End-to-end acceptance scenario

1. Open a problem with existing notes and confirm its saved text is unchanged
   in the new Notes tab. Write into the new fields and reload.
2. Practice and discuss an approach with the tutor. Generate an AI draft,
   inspect it, apply only selected fields, and discard the remainder. Confirm
   generation itself did not change saved notes.
3. Add the problem to review. Confirm it is immediately due and visible on
   the dashboard. Repeating Add does not reset its state.
4. Open Review. Confirm fresh starter code and Description appear, while the
   ordinary draft and accepted solution remain intact.
5. Reveal notes, finish without submitting, and rate Again. Confirm a stored
   next due date, one review log, and unchanged solved/streak state.
6. Restart the application and confirm notes, enrollment, last rating, and
   next due date persist. Confirm temporary review code did not persist.
7. Review with real Piston Submit and confirm the solved/unsolved rules in
   13.4. Verify ratings remain a separate explicit action.
8. Exercise pause/resume, narrow tab layout, keyboard navigation, AI failure,
   database failure/retry, and two tabs trying to rate the same card.

## Phase gate

- [x] Personal notes have a dedicated tab, preserve existing data, and save
  reliably in ordinary, revise, and review sessions.
- [x] AI drafts are grounded, bounded, disclosure-safe previews; only explicit
  application changes saved personal notes.
- [x] Enrollment is manual, FSRS scheduling is durable, and retries/concurrent
  ratings cannot schedule twice or overwrite newer state.
- [x] Review starts with fresh code and allows self-rating without Submit.
- [x] Review buffers do not touch stored drafts; first solves, revision
  submissions, historical snapshots, and streak rules retain their meanings.
- [x] The dashboard accurately shows due/upcoming reviews and pause state.
- [x] Additive migrations preserve existing IDs and practice data.
- [x] All automated checks and the end-to-end browser scenario pass, with
  unavailable live checks explicitly recorded rather than claimed complete.

## Out of scope

Notifications, reminders, decks, per-topic notes, rich-text editing, automatic
enrollment, rating undo/history UI, FSRS parameter tuning or training,
persistent review code buffers, auth, hosting, other executable languages,
catalog expansion, harness changes, and AI SDK migration.

## Scheduler reference

Use the official [ts-fsrs package documentation](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)
for installation, card creation, rating transitions, and scheduler parameters.
Confirm the installed version's API when implementing the adapter and record
the exact version in the lockfile and scheduler metadata.
