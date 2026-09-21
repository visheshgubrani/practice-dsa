# Follow-up — Tutor hints grounded in the current attempt

**Status:** complete

Phase 5 shipped durable chats and disclosed context. This unit tightens *how* the tutor uses that context: a focused nudge plus a small next step, aimed at the code actually in the editor.

No model, API, database, or UI changes. Preserve existing uncommitted work.

Do **not** send the unrevealed hidden suite or reference-solution source.

## Work units

### 6.1 Make tutor hints follow the current attempt

- [x] Tighten the tutor instructions in `lib/ai/prompts.ts`: identify one relevant issue or unfinished step, explain why it matters, and suggest a small action. Avoid jumping ahead into the remaining algorithm.
- [x] Treat unfinished code as work in progress. Discuss syntax when it blocks the requested task or explains an actual execution failure.
- [x] Increase hint detail when the thread shows they remain stuck; use conversation history to avoid repeating advice. Full solutions only on explicit request.
- [x] Remove generic praise and unsupported reassurance such as “exactly right” or “you’re close.”
- [x] Replace “your own example” instructions with clear attribution: “the failing test case,” “the statement example,” or “consider this illustrative input.” Attribute an example to the user only when they explicitly supplied it.
- [x] Use examples only when they clarify the current issue; avoid repeatedly tracing the same case.
- [x] Align hint, review, and debug quick-action prompts with this behavior. Explicit requests for broader reviews or deeper explanations can receive more detail.
- [x] Remove unsupported diagnoses and algorithm claims from scripted demo replies; clearly state that demo mode cannot analyse the current attempt.
- [x] Extend prompt/context tests for example attribution, incomplete code, and current editor versus previously submitted code. Preserve hidden-case disclosure checks.
- [x] Extend the live smoke scenarios to cover partial Valid Parentheses code, an actual failing attempt, and a follow-up requesting more help.
- [x] Review generated answers for relevance, useful direction, accurate attribution, and no premature solution disclosure. Prompt assertions alone do not establish answer quality.
- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm chat:smoke`. Report live validation as skipped if no API key is available.

**Files:** `lib/ai/prompts.ts`, `lib/ai/prompts.test.ts`, `lib/chat/tutor-context.test.ts`, `scripts/chat-smoke.mts`

Verified 2026-09-21: existing uncommitted editor-attachment work left in place; `pnpm lint`, `pnpm typecheck`, `pnpm test` (179), `pnpm build`; `pnpm chat:smoke` — disclosed payload checks passed; live DeepSeek reviewed four answers (partial Valid Parentheses, failing count-based attempt, follow-up, two-sum debug) for relevance, attribution, and no pairing-map dump.

## Gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm chat:smoke`

## Out of scope

Hosting, accounts, other languages, study-coach features, AI SDK migration, model/API/database/UI changes.
