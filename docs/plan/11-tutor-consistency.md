# Follow-up — A consistent beginner DSA tutor

**Status:** complete

Phase 10 made replies complete and plain, and that contract still jumped between ideas, refused workable approaches, and treated prints or extra runs as a reason to change the lesson. This follow-up keeps `deepseek-flash` and fixes prompting and context handling first. A model change waits on these same fixtures if a later pass still fails.

Worked ahead of Phase 9 by direct request. It does not change that phase's status. No provider, model picker, conversation summarizer, or historical run-comparison feature. Existing conversations and practice data stay intact. No chat request, database schema, judging, or source-wrapping changes.

## Work units

### 11.1 Tutoring behavior

- [x] Rewrite `lib/ai/prompts.ts` so the priority is: answer the current question, preserve the agreed approach, then suggest one useful next action.
- [x] “What approach should I take?” explains the central idea, why it works, and a short roadmap. An overview is allowed. A complete implementation waits for an explicit request.
- [x] “Can we do it this way?” evaluates the proposal. A valid approach, including brute force, continues. A concrete limitation comes before a suggested change. Reference approach notes are guidance, not the only acceptable solution.
- [x] “What now?” locates the current step from the conversation and the editor, then explains one small action and its purpose.
- [x] “I’m confused.” stays on the same concept, uses a smaller example or a different explanation, and reduces the next ask. Reusing an example is allowed.
- [x] Tiny Python snippets are allowed when syntax is the obstacle. A large snippet or detailed pseudocode does not hand over the remaining algorithm.
- [x] The closing `Next:` action may be a thinking step, a small trace, a debug experiment, or code.
- [x] Reply length matches the question. The rigid word cap and “one idea only” rule are gone.
- [x] A few short examples of these interactions are in the prompt. Quick actions follow the same behavior.

### 11.2 Context and continuity

- [x] Conversation window is 48 messages / 48,000 characters. Order, the latest question, and filtering of unfinished assistant replies stay. Omission notices count what was actually left out.
- [x] The tutor continues the established approach unless the user changes direction or the evidence shows it cannot work. If essential earlier context was omitted, it asks one focused question instead of inventing the agreement.
- [x] Editor code and execution results are separate evidence. A referenced result is labeled as matching the editor or as an earlier version.
- [x] The latest result stays available and is used only when the question needs it. Repeated runs are not treated as frustration or a reason to change algorithms.
- [x] Returned output is distinct from debug prints. Prints are observations, not the intended return value.
- [x] Attempt state stays advisory. “body has statements” does not mean a method is implemented or understood. No print-stripping parser.
- [x] Hidden-case disclosure and server-side submission loading are unchanged.

### 11.3 Validation

- [x] `scripts/chat-smoke.mts` runs repeatable conversations on Two Sum, Valid Parentheses, and Encode/Decode Strings: hand-holding, a valid alternative, prints and repeated runs, a stale result after an edit, an explicit debug question, a thread past the old 16-message window, and syntax help versus an explicit full solution.
- [x] The same fixtures run three times. Responses and latency are saved under `docs/plan/evals/` and are not written into practice history.
- [x] The current and revised prompts are compared on these fixtures. Word-count and vocabulary checks are replaced by the behavioral rubric. Deterministic disclosure and payload tests stay.
- [x] Acceptance: no unsolicited full solutions, hidden-data leaks, or stale-result claims, and satisfactory behavior on at least 90% of evaluated turns. If that fails, record the recurring failures for a later model comparison on these fixtures.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and live `pnpm chat:smoke`.

**Files:** `lib/ai/prompts.ts`, `lib/ai/prompts.test.ts`, `lib/ai/attempt.ts`, `lib/ai/attempt.test.ts`, `lib/chat/tutor-context.test.ts`, `scripts/chat-smoke.mts`, `docs/plan/00-scope.md`, `docs/plan/README.md`, `AGENTS.md`

## Gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm chat:smoke`

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (319), and `pnpm build` passed. Live `pnpm chat:smoke` against `deepseek-flash` passed 34 deterministic payload checks and the conversation gate: **40/42 turns satisfactory (95.2%), 0 hard failures** (no unsolicited full solution, no hidden-data leak, no stale-result claim). Transcripts and latency are in `docs/plan/evals/tutor-consistency-revised.json` (average reply 3.8s). The two misses were Valid Parentheses debug replies that explained “the counts return true, and `([)]` is not valid” without the exact tokens the checker wanted. The checker was widened after that run to accept that wording; those answers were not regenerated.

The previous prompt, on the same fixtures and model, is in `docs/plan/evals/tutor-consistency-baseline.json`. Its automated score was 34/42 under a stricter token checker, so the percentages are not a clean A/B. The behavioral difference that showed up in both transcripts:

- A 21-message thread whose first turn agreed on nested loops was **dropped** by the old 16-message window (`payloadIncludes: false` on all 3 runs). Every reply then taught the hash map from the problem notes and forgot the agreement. The 48-message window **kept** that agreement (`payloadIncludes: true` on all 3 runs), and every reply stayed on nested loops.
- Asked “can we use a nested loop?”, the old prompt sometimes ended by switching the next step to `seen = {}`. The revised prompt called the loops correct, named the 10⁴ / n² limitation, and left the next step on the inner loop.
- Encode/Decode with `print(len(word), word)` and a `null` return: the revised replies treated `2 hi` as a print and named `null` as what the judge compared, then pointed at `chunks.append(word)` missing the length prefix. They did not treat the extra runs as a reason to change the design.
- An edited Two Sum draft after an old `return [0, 0]` submit was tutored from the new `seen` loop. The old output was not described as what the current editor returned.
- `enumerate` was a short snippet. “Give me the full solution” then produced a complete `twoSum`.

No model change. These fixtures stay in `scripts/chat-smoke.mts` if a later comparison is needed.

## Out of scope

A different model, a provider or model picker, an automatic conversation summarizer, historical run comparison, and any change to judging, submissions, progress, or hidden-case disclosure. Phase 9's remaining units.
