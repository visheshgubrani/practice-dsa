# Phase 5 — Persist chats and deliver contextual tutoring

**Status:** blocked on Phase 4

This is an improvement to the existing `/api/chat` integration, not an AI rewrite. No SDK migration.

Do **not** send the unrevealed hidden suite or reference-solution source.

## Work units

### 5.1 Durable conversations

Use the existing `chat_threads` / `chat_messages` tables. Additive columns if needed (completion status, provider metadata, token usage).

- [ ] Restore the most recent thread for each problem.
- [ ] “New conversation” starts a new thread. Prior threads stay accessible.
- [ ] Chat requests include thread id, stable message id, and optional submission id.
- [ ] Load conversation history and referenced submissions **server-side**.
- [ ] Persist the user turn before requesting generation. Persist the assistant response and completion status afterward.
- [ ] Store message parts, code snapshot, submission link, provider/model metadata, and token usage when available.
- [ ] Retries are idempotent (stable message id).
- [ ] Allocate `seq` transactionally. Do not use an unprotected `max(seq) + 1`.
- [ ] Interrupted or failed generations stay stored and distinguishable from a completed answer.

**Files:** `lib/db/schema/chat.ts`, new chat queries, `app/api/chat/route.ts`, `components/workspace/ai-chat.tsx`

### 5.2 Useful debugging context

Give the tutor:

- [ ] Statement, constraints, public examples, and reference **approach notes** (not the solution source).
- [ ] Current editor snapshot.
- [ ] The referenced submission’s exact source and structured verdict.
- [ ] The first failing case, including a revealed hidden case under Phase 2 policy.
- [ ] A clear indication when current code differs from the code that produced the result.

Do not send unrevealed hidden cases.

- [ ] Hint-first behaviour remains. Full solutions only when explicitly requested.
- [ ] The tutor may invent illustrative examples, labeled as its own, never as official judge cases.
- [ ] Bound conversation and code context. Explain truncation when it happens.
- [ ] Keep existing provider-error / retry handling, DeepSeek when configured, and demo mode otherwise.

**Files:** `lib/ai/prompts.ts`, `app/api/chat/route.ts`

### 5.3 Chat tests and live smoke

- [ ] Restored history after restart.
- [ ] Correct failure context (the revealed case, the submitted source).
- [ ] Interruption and retry do not duplicate turns.
- [ ] No unrevealed-case leakage in the prompt payload (assert in tests).
- [ ] Live smoke of the configured model before declaring live tutoring ready. If the key is missing, demo mode is still required to pass the persistence tests.

## Phase gate

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm problems:check && pnpm build`
- [ ] `pnpm piston:check`
- [ ] End-to-end completion scenario from [00-scope.md](./00-scope.md):

> Solve a problem in Python, fail and inspect a hidden case, ask the tutor about that exact attempt, submit successfully, restart the application, and recover the draft, notes, accepted solution, history, and conversation.

## Out of scope

Hosting, accounts, other languages, study-coach features, AI SDK migration.
