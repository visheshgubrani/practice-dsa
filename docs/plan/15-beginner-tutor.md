# Phase 15 — Beginner tutor

**Status:** work units 15.1–15.5 complete (2026-10-10); requested follow-up
15.6 complete (approved and verified 2026-10-21). Earlier acceptance evidence is retained
below and does not establish acceptance of the changed teaching contract.

Work unit 15.6 supersedes the one-idea pacing and remaining-algorithm boundary
described in the original phase below. A complete prose approach is allowed;
complete code still requires an explicit request. Phase 17's pending browser
acceptance is unchanged.

Phase 11 made replies consistent and Phase 12 tried to stop them at the
question. Both did it by accumulating rules: answer only this, never that, do
not add the next stage. The result answered the literal question and stopped,
which is correct behaviour and a poor way to teach a beginner. On Encode and
Decode that produced a tutor that explained what `length` measures and
nothing else — accurate, and useless to someone staring at a half-written
`decode`.

This phase replaces the accumulated restrictions with one coherent teaching
contract: **give concrete hints, teach the idea behind the step, stay with the
learner's approach, and keep the complete implementation behind an explicit
request.** It also gives the chat three one-press actions and a More help menu
so a beginner has something to press when they do not know what to ask.

Phase 12 stays in the plan as historical evidence. Its restrictive response
contract — answer the question and nothing else, a clarification may end, the
next task only when asked — is **superseded** by this phase. The Encode/Decode
clarification regression is still run here, because the replacement contract has
to answer that question without walking the rest of `decode` either.

Keep `gpt-6-luna`, the OpenAI provider, and user-triggered chat. No automatic
coaching, learner profiles, gamification, database migrations, judging changes,
review-behaviour changes, or `/api/chat` schema changes.

## Original tutor behavior (15.1–15.5)

The contract now lives in five labelled blocks in `lib/ai/prompts.ts` instead of
one flat rule list, with representative conversations instead of question-shape
rules.

- **Concrete hints.** Name the tool — a hashmap, a stack, two loops, a set —
  and say what it is doing for *this* problem, grounded in the buffer.
- **The idea behind the step.** "Remember each number and where you saw it, so
  the partner is one lookup away" is the hint. "Create a dictionary" is a chore.
- **Natural interaction.** One focus per reply, one question at most and only
  when the answer changes the next sentence. No quiz, no assignment, no `Next:`
  line. Replies usually run 50–130 words in one to three chunks.
- **Adapting to confusion.** Smaller input, a two- or three-step trace, or
  plainer words. Never the same sentence louder, never a new algorithm.
- **Respecting direct requests.** "What exact line do I write next?" earns the
  line and the reason for it. The complete implementation still needs an explicit
  full-solution request; "be specific" and "I'm stuck" are not one.
- **Directional questions stay directional.** "What now?", "Is this right?", and
  "Do we append the length?" are answered with what the piece is for, not with
  the code for it.
- **Staying with the learner.** A working nested loop stays the plan. The
  tradeoff gets named once, honestly, and the faster idea waits until they ask.
- **Friendly voice.** Everyday warmth, encouragement tied to something specific,
  no canned praise, no forced jokes, no mascot.
- **Resuming.** "Where were we?" gets a short recap of the buffer and the
  conversation plus one thing to try, without replaying the algorithm.

Editor/result separation, example attribution, context limits, attempt state,
and hidden-case disclosure are unchanged.

## Chat controls

The seven-action row is replaced by three primary actions and a **More help**
menu, built from Base UI's official dropdown menu (`components/ui/dropdown-menu.tsx`).

| Action | Sends |
| --- | --- |
| Give me a hint | one concrete idea, naming the tool and what it buys |
| Make it concrete | sharpen the last explanation; a local snippet is allowed |
| Show a tiny example | a small invented input, labelled as illustrative |
| More help → Explain it simply | re-explain the current piece, no code |
| More help → Review my code | the one thing that matters in the current attempt |
| More help → Why is this failing? | the cause on the failing case, then one check |
| More help → Explain the complexity | the cost of the learner's approach first, then the target |

**Make it concrete** is enabled only after a finished tutor reply, and every
action is disabled while an answer streams. Actions send ordinary chat messages
through the existing transport; nothing about `/api/chat` or persistence
changes. The `Next:` paragraph highlight is gone from tutor rendering, and the
empty state now explains that the editor travels with every message.

## Work units

### 15.1 Teaching contract and baseline

- [x] Replace the accumulated restrictive rules in `lib/ai/prompts.ts` with the
  labelled contract above and representative conversations.
- [x] Add five beginner conversations to `scripts/chat-smoke.mts`: starting Two
  Sum and choosing nested loops, understanding a hashmap, understanding a stack
  and correcting a bracket-counting misconception, repeated confusion with
  stronger hints and a return after a break, and the Encode/Decode clarification
  regression alongside syntax help, a full-solution request, changed editor code
  after an earlier failure, debug prints, and revealed hidden failures.
- [x] Record the previous contract's replies for the same conversations before
  the rewrite (`CHAT_SMOKE_CONTRACT=previous`, `tutor-consistency-beginner-baseline.json`).

### 15.2 Teaching changes

- [x] Concrete, named, purpose-carrying hints grounded in the current buffer.
- [x] Confusion shrinks the example instead of repeating the hint or changing
  the approach.
- [x] Direct requests get direct local help; the complete implementation stays
  behind an explicit full-solution request.
- [x] A failed run, a repeated question, and a debug print never move the plan.
- [x] A short resume after a break, drawn from the retained conversation and the
  editor.
- [x] Pacing sized for a beginner: one focus, one question at most, defined
  terms, no closing task.

**Gate:** the five core conversations meet the teaching rubric in the recorded
review, with zero hard failures.

### 15.3 Chat controls

- [x] `PRIMARY_ACTIONS`, `MORE_ACTIONS`, and `quickActionById` in
  `lib/ai/prompts.ts` carry the placement and the prompt for each action.
- [x] `lib/chat/actions.ts` decides availability: streaming disables everything,
  and Make it concrete waits for a finished reply.
- [x] `components/workspace/chat-composer.tsx` renders three chips and the
  official Base UI dropdown menu with Button variants and semantic tokens.
- [x] Remove `highlightNext` from `components/markdown.tsx` and its use in the
  chat pane; update the empty state to invite conversation.

### 15.4 Acceptance gate

- [x] Record the revised replies on the configured model, three runs per
  conversation, for both the supplied-history and connected-thread cases.
- [x] Review every reply by hand against the rubric: correctness, useful
  guidance, appropriate disclosure, continuity, and readable pacing.
- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and a live
  `pnpm chat:smoke`.
- [x] Check the controls in the browser: three chips, the More help menu,
  keyboard navigation, a narrow pane, streaming, Stop, Retry, and restored
  conversations, using disposable practice data.
- [x] Confirm zero hard failures across the three runs.

**Original phase gate (15.1–15.5):** a beginner reading the recorded replies understands why a tool
helps and what to try next, without receiving the complete algorithm unless they
asked for it. No hard failures in the evaluation. Without a live-model
evaluation, the teaching gate stays pending.

### 15.5 Review corrections and renewed acceptance

- [x] Preserve identical public problem context in the previous and current
  contracts, and keep baseline selection in the evaluation script only.
- [x] Correct the bracket counterexample and clarify the local-help boundary
  with examples that answer a clarification without advancing the algorithm.
- [x] Grade remaining implementations, including short snippets and prose
  walkthroughs, and test the recorded regression failures.
- [x] Require a completed reply for Make it concrete, including Stop, failures,
  disconnects, regenerated replies, and restored threads.
- [x] Make browser failures exit nonzero and exercise actual streaming, Stop,
  Retry, keyboard selection, and restored conversations on disposable data.
- [x] Re-record both contracts, review all revised replies, run lint, typecheck,
  tests and build, and close the phase only after the renewed gate passes.

### 15.6 Explain the approach, then guide implementation

**Approval:** the user explicitly requested implementation of the proposed
"Tutor: explain the approach, then guide implementation" plan on 2026-10-21.

**Evidence and decision:** the supplied Longest Consecutive Sequence chat gives
isolated corrections without connecting counting, maximum tracking, and the
return value. The production prompt requires "one idea per message" and calls
a remaining-algorithm walkthrough a full solution; the evaluation also rejects
ordered prose approaches. Replace those conflicting rules rather than layering
exceptions onto them. Complete prose explanations answer broad help requests;
focused hints and clarifications stay focused. "Okay done" means inspect the
live buffer and continue, correcting a blocking mistake without assuming an edit.

- [x] Rewrite the teaching contract and examples; preserve focused chat actions,
  explicit requests for complete code, learner approach, and disclosure rules.
- [x] Update prompt assertions and behavioral evaluation boundaries; preserve
  unsolicited-code, narrow-clarification, stale-result, and hidden-case checks.
- [x] Add supplied-history and connected Longest Consecutive conversations with
  clearly labelled reconstructed buffers, including unchanged-code continuation.
- [x] Run three live repetitions per conversation; save new evidence and manually
  review correctness, continuity, useful completeness, and code disclosure.
- [x] Run lint, typecheck, tests, build, and chat smoke; update active project
  instructions and scope, and record actual results.

**Gate:** broad help explains the connected approach through the final result;
continuation moves from the actual editor through a meaningful part of the
implementation. Narrow requests remain focused and complete code remains
explicitly requested. No public API, model, database, persistence, or UI changes.
Teaching acceptance remains pending if live evaluation is unavailable.

#### 15.6 Verification record (2026-10-21)

- Focused prompt/evaluation tests: **39 passed**, including the final code
  boundary and factual checks after live-review corrections. Lint and typecheck
  passed; the production build passed with Next.js 16.3.5.
- The default full-suite invocation ran **505 tests**, with one unrelated coach
  count failure: saved practice on its fixed date adds to its fixture counts.
  An empty temporary database also exposed overlap between the coach's empty-day
  assertion and the dashboard's parallel fixtures on `2019-01-01`.
- All intended test globs, expanded and run with `tsx --test
  --test-concurrency=1`, passed **516 tests** on a fresh temporary database using
  the existing migrations. The original database's complete public-table data
  fingerprint matched before/after:
  `387729a461499246d264f35ddfae8b78f107420aea677b8ed1cf2fb0f46365ba`.
  The temporary database was removed. No existing database was migrated or seeded.
- This host has pnpm 12.11.2; invocations used
  `--config.manage-package-manager-versions=false
  --config.verify-deps-before-run=false` to use installed dependencies without
  writing package-manager setup files or automatically installing packages.
- [First live attempt](./evals/tutor-consistency-approach-follow-up-attempt1.json):
  57 conversation runs, 174 replies, **12 hard failures** (eight remaining-code
  handoffs on Longest Consecutive, two decoder code handoffs, and two narrow
  append clarifications teaching cursor advancement). This failed acceptance.
  The corrected contract makes broad help/done replies prose-only unless code is
  explicitly requested, and keeps narrow questions focused even after an overview.
- [Second live attempt](./evals/tutor-consistency-approach-follow-up-attempt2.json)
  passed its 50 automated checks with zero hard failures under the checks then
  present, but **failed manual acceptance**: the connected decoder validation
  (run 2) called an empty word's chunk `#` instead of `0#`; the supplied stack
  overview/resume (run 1) and alternative stack overview (run 2) omitted removal
  of matched openers. These are now covered by regression checks against the
  actual recording. The revised contract teaches state changes for each outcome,
  traces examples before using them, and demonstrates both matched-opener removal
  and the zero length digit. Other minor wording notes were not treated as an
  automated quality score.
- [Final live recording](./evals/tutor-consistency-approach-follow-up.json):
  **50/50 checks passed**, **57 conversation runs**, **174 replies**, and **zero
  hard failures**, using `gpt-6-luna` with the production teaching contract and
  public Postgres problem context. No evaluation chats were written to practice
  history. Longest Consecutive buffers are labelled reconstructed/synthetic.
- [Manual review of all 174 replies](./evals/phase15-6-approach-review.json):
  the requested teaching behavior passes across all 19 conversations and three
  repetitions. Longest Consecutive overviews connect set/start/count/maximum to
  the answer, continuations explain the return, and unchanged buffers are noticed.
  Explicit small hints and narrow decoder questions stay focused; stack
  explanations include removal and empty words use `0#`. All three explicitly
  requested complete Two Sum implementations passed five examples each
  (15 checks: ordinary, later pair, duplicates, negatives, and zero).
- Two nonblocking wording notes remain recorded: one stack trace immediately
  corrects its own initial ordering phrase; one decoder validation describes the
  intended empty-list result while acknowledging that the decoder is unfinished;
  that draft still needs a return. The review does not claim perfect generative replies.
  Keyword diagnostics (157/174) remain diagnostics, including valid cursor
  alternatives and supplied nested-loop history; they are not the teaching gate.

**15.6 gate: passed.** The final lint, typecheck, production build, 39 focused
checks, 516 isolated serial tests, live checks, and scoped manual acceptance are
complete. Public APIs, model/provider, chat controls, persistence, judging, and
hidden-case disclosure are unchanged. Phase 17's browser gate remains pending.

## Renewed acceptance (2026-10-10)

All five review issues are corrected: baseline selection is evaluation-only and
retains identical public problem context; local help does not expand into the
remaining decoder; Make it concrete requires a completed nonempty reply; browser
failures exit nonzero and the checks exercise actual interactions; the bracket
counterexample identifies `)` arriving while `[` is on top.

Additional hand review corrected modified-example attribution and invented
missing-loop-body claims. Known factual regressions now fail the smoke gate,
while keyword/style matches remain diagnostics. The active project instructions
include the remaining-algorithm boundary and completed-reply requirement.

### Teaching gate — passed

Both contracts used `gpt-6-luna` and the same public problem context, verified by
SHA-256 hashes for all three problems. Each recording contains 16 conversations,
three runs each (48 conversation runs, 129 replies), including supplied histories
and connected threads. The previous instructions are swapped only by evaluation
code; production has no `CHAT_SMOKE_CONTRACT` branch or previous-prompt import.

- [Corrected baseline](./evals/tutor-consistency-beginner-baseline-corrected.json)
- [Final revised replies](./evals/tutor-consistency-beginner-revised-corrected.json)
- [Verified comparison](./evals/beginner-comparison-corrected.txt)
- [Manual rubric review of all 129 final replies](./evals/phase15-renewed-review.json)

| Diagnostic | Previous | Final revised |
| --- | --- | --- |
| Keyword matches (not a quality score) | 98/129 | 101/129 |
| Hard failures under current checks | 0 | 0 |
| Replies containing fenced code | 29 | 19 |
| Mean reply length | 60.3 words | 52.0 words |

Every final conversation meets correctness, useful guidance, appropriate
disclosure, continuity, and readable pacing across all three runs. Local return
snippets can appear during confusion or resumption; they address the current
branch and do not provide the remaining implementation. All three explicitly
requested complete Two Sum implementations passed five ordinary, duplicate,
negative, and zero-value examples.

Three unsuccessful review recordings are retained as
`tutor-consistency-beginner-revised-review-attempt{1,2,3}.json`. The first supplied
an unsolicited append snippet; the second added future operations to a
validation. Hand review of the third caught a shortened input called a statement
example and an invented missing loop body. Cursor-state diagnostics also needed
correction: quoting an assignment already in the editor, or describing a move the
editor has already made, is not a new cursor-advancement instruction. Regression
tests distinguish those observations from new instructions.

The final live invocation passed 48/48 checks with zero hard failures. New factual
checks added during that run were subsequently applied to its unchanged replies
using `CHAT_SMOKE_REPLAY`, also passing 48/48. Replay verifies the selected
teaching-contract hash, model, public context, exact editor/user fixtures,
uniqueness, and all three runs. It preserves generation dates and original grades
and records the regrading date; it makes no new model calls. Contract hashes for
these two recordings were backfilled from the unchanged teaching source used
for each run; future live recordings write them directly. Keyword differences
alone are not the teaching gate.

### Implementation and browser gates — passed

`pnpm lint`, `pnpm typecheck`, **398 tests**, and `pnpm build` passed. The browser
script passed **33 checks** on a production build using an isolated database:
primary/menu controls, Escape and ArrowDown/Enter selection, streaming disabled
states, Stop, partial failed replies, Retry completion, interrupted/completed
conversation restoration, and the action row at 430px. Browser transport checks
used the existing scripted stream with a 100ms chunk delay; a failed partial
stream was injected through CDP without changing `/api/chat`. Live teaching was
evaluated separately with the configured model.

The blank-page negative check exited **1**, proving a missing chat panel cannot
produce a successful browser result. The corrected screenshot is
[recorded here](./evals/phase15-chat-controls-corrected.png).

All database-backed checks used `dsa_phase15_recheck`, a disposable copy. The
original database dump, ignoring only PostgreSQL's random restrict/unrestrict
markers, matched before and after checks (SHA-256
`784775d24cab4f93c9a413efa046e8a93653b0f30bcd400ca961d9aeb2fec6b5`). No migrations,
practice-data changes, provider/model changes, judging/review changes, or API
schema changes were made for these corrections. The disposable copy was removed
after verification.

## Original verification record (superseded by review)

The original comparison omitted public problem context in baseline mode. The
revised transcripts also include later decoder stages, so the original zero
hard-failure count and teaching-gate claim do not establish acceptance. The
records below are retained as historical evidence, not a current release gate.

### Live evaluation (2026-10-10, `gpt-6-luna`, 3 runs per conversation)

Both contracts were recorded through the same 16 conversations, three runs each:
48 conversation runs and 129 replies per contract, over 21 distinct questions.
The baseline used `CHAT_SMOKE_CONTRACT=previous`, which swaps in the pre-Phase-15
instructions from `lib/ai/previous-prompts.ts`; the revised run used the new
contract and the new actions.

| | Previous contract | This phase |
| --- | --- | --- |
| Keyword log | 83/129 clean | 97/129 clean |
| Recorded misses | 54 | 38 |
| Hard failures | 0 | 0 |
| Mean reply length | 65.9 words | 65.4 words |
| Replies containing code | 49 | 23 |
| Replies ending on a question | 0 | 0 |

Keyword matches are diagnostics, not a teaching score. The hand review of the
revised replies is what the gate rests on:

- **Concrete hints.** "Start with the simplest idea: check every pair. One loop
  picks an index, and a second loop checks the indices after it…" Names the
  structure, explains what it buys, and stops before the body.
- **The idea behind the step.** The counting question is answered with the
  limitation and the counterexample: "`"([)]"` has matching counts for every
  bracket type, but it's invalid: `(` is still waiting when `)` appears. That's
  what your `stack = []` is for."
- **Natural interaction.** No reply ends on a question; two of 129 contain a
  question mark at all. There are no `Next:` lines and no closing homework.
- **Confusion.** "Try it on just `[2, 7]` with target 9" shrinks the example
  instead of repeating the previous sentence.
- **Direct requests.** "be really specific, what exact line do i write next"
  gets `seen[num] = i` with the reason for it, and does not grow into the method.
- **The learner's approach.** The nested-loop plans stay nested loops. The
  tradeoff is stated once — "it's slower than the hashmap approach, but easy to
  follow" — and the faster idea still only appears when the learner asks.
- **Resume.** "We switched from the double loop to the hashmap approach. Your
  editor has the one loop started, with `pass` inside it" plus the next piece.
- **Disclosure.** No reply leaked an unrevealed hidden case, and both stale
  results were labeled as earlier runs.

The Encode/Decode clarification regression is better than the previous contract
on the answered question and worse on restraint: the replied
`while i < len(s)` scans and the `length = int(s[i:j])` / `i = j + 1` pair land
in a fenced snippet in most runs, where the old contract stopped at the scan in
prose. It reads them as the piece in front of them, which the contract permits,
and it does not walk the rest of `decode`. Phase 12's stricter "no code at all"
reading is not the target here.

Comparison output for the whole set is in
`docs/plan/evals/beginner-comparison.txt`; the raw transcripts are
`tutor-consistency-beginner-baseline.json` and
`tutor-consistency-beginner-revised.json`.

### Checks

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 392 tests, 0 failures.
- `pnpm build` passed with Next.js 16.3.5.
- `pnpm chat:smoke` passed all 48 checks, including the prompt-payload
  assertions, with 0 hard failures on both contracts.
- Live chat against the app itself: a `POST /api/chat` turn on a disposable
  database returned the streamed reply above ("Start with the simplest idea…"),
  the "Make it concrete" message produced the local snippet, and the four-message
  thread persisted with `gpt-6-luna`.
- Browser pass, `node scripts/chat-controls-check.mjs`, against the production
  build on a disposable database: all 15 checks passed. The three chips and More
  help render, Make it concrete is enabled with a saved reply and disabled on a
  fresh conversation, the menu opens with its four secondary actions, Escape
  closes it, and the row fits a 430px pane. The screenshot is
  `docs/plan/evals/phase15-chat-controls.png`.
- **Bug found and fixed by that pass:** rendering `DropdownMenuLabel` outside a
  `DropdownMenuGroup` crashed the whole page with Base UI error #31 (the label
  reads its group id from context). The label now sits inside a group. This is
  the one client-visible defect the evaluation did not catch.
- Stop, Retry, and streaming were exercised through the live `POST /api/chat`
  turns rather than by pressing the buttons, and a restored conversation was
  loaded from the saved thread. A human pass over those three controls in a
  browser is still worth doing.
- The disposable `dsa_phase15_verify` database was dropped afterwards. The
  original `dsa_software` database still holds its 8 threads, 38 messages, 9
  submissions, 2 progress rows, and 2 drafts.
- The teaching gate passes on the recorded replies. Two caveats stay recorded
  rather than fixed: the Encode/Decode clarification hands over the digit-scan
  snippet where the previous contract stopped at prose, and 97 of 129 replies
  clear the keyword diagnostics, which is not a teaching score either way.

## Out of scope

A model switch, a provider or model picker, automatic coaching, learner
profiles, gamification, a summarizer, `/api/chat` schema or persistence changes,
database migrations, judging or review-behaviour changes, and any change to
hidden-case disclosure. Phase 9's remaining units are untouched.
