# Phase 5 — Persist chats and deliver contextual tutoring

**Status:** complete

This is an improvement to the existing `/api/chat` integration, not an AI rewrite. No SDK migration.

Do **not** send the unrevealed hidden suite or reference-solution source.

## Work units

### 5.1 Durable conversations

Use the existing `chat_threads` / `chat_messages` tables. Additive columns if needed (completion status, provider metadata, token usage).

- [x] Restore the most recent thread for each problem.
- [x] “New conversation” starts a new thread. Prior threads stay accessible.
- [x] Chat requests include thread id, stable message id, and optional submission id.
- [x] Load conversation history and referenced submissions **server-side**.
- [x] Persist the user turn before requesting generation. Persist the assistant response and completion status afterward.
- [x] Store message parts, code snapshot, submission link, provider/model metadata, and token usage when available.
- [x] Retries are idempotent (stable message id).
- [x] Allocate `seq` transactionally. Do not use an unprotected `max(seq) + 1`.
- [x] Interrupted or failed generations stay stored and distinguishable from a completed answer.

**Files:** `lib/db/schema/chat.ts`, new chat queries, `app/api/chat/route.ts`, `components/workspace/ai-chat.tsx`

### 5.2 Useful debugging context

Give the tutor:

- [x] Statement, constraints, public examples, and reference **approach notes** (not the solution source).
- [x] Current editor snapshot.
- [x] The referenced submission’s exact source and structured verdict.
- [x] The first failing case, including a revealed hidden case under Phase 2 policy.
- [x] A clear indication when current code differs from the code that produced the result.

Do not send unrevealed hidden cases.

- [x] Hint-first behaviour remains. Full solutions only when explicitly requested.
- [x] The tutor may invent illustrative examples, labeled as its own, never as official judge cases.
- [x] Bound conversation and code context. Explain truncation when it happens.
- [x] Keep existing provider-error / retry handling, DeepSeek when configured, and demo mode otherwise.

**Files:** `lib/ai/prompts.ts`, `app/api/chat/route.ts`

### 5.3 Chat tests and live smoke

- [x] Restored history after restart.
- [x] Correct failure context (the revealed case, the submitted source).
- [x] Interruption and retry do not duplicate turns.
- [x] No unrevealed-case leakage in the prompt payload (assert in tests).
- [x] Live smoke of the configured model before declaring live tutoring ready. If the key is missing, demo mode is still required to pass the persistence tests.

**Files:** `lib/ai/prompts.ts`, `lib/chat/turn.ts`, `lib/chat/tutor-context.test.ts`, `scripts/chat-smoke.mts`

Verified 2026-09-21: existing Postgres volume (no wipe); `pnpm test` — 172 tests, including restore, revealed-failure context, interrupt/retry without duplicate turns, prompt-payload leakage, and the 00-scope recovery scenario; `pnpm chat:smoke` — disclosed payload checks passed; live DeepSeek skipped (`DEEPSEEK_API_KEY` unset). Demo persistence is the gate until a key is configured. Live tutoring is not declared ready without that smoke.

## Phase gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm problems:check && pnpm build`
- [x] `pnpm piston:check`
- [x] End-to-end completion scenario from [00-scope.md](./00-scope.md):

> Solve a problem in Python, fail and inspect a hidden case, ask the tutor about that exact attempt, submit successfully, restart the application, and recover the draft, notes, accepted solution, history, and conversation.

Verified 2026-09-21: lint, typecheck, test (172), problems:check (358), build, piston:check (71). Recovery scenario covered by `lib/chat/tutor-context.test.ts` against Postgres (fail a hidden Submit, chat about that attempt, accept, reload draft / notes / accepted source / history / conversation).

## Out of scope

Hosting, accounts, other languages, study-coach features, AI SDK migration.
