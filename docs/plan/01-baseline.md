# Phase 1 — Repair baseline checks and judging correctness

**Status:** complete

Make the existing four problems honest to judge before changing catalog shape, persistence, or the tutor.

Do **not** add `args` columns, hidden cases, Postgres writers, or new problems in this phase.

## Work units

### 1.1 Fix `piston:check`

- [x] Point `package.json` `piston:check` at `tsx scripts/piston-check.mts` (the script already exists; the npm script still targets `.mjs`).
- [x] Run it against the compose engine when Docker is available. If the socket is unavailable, record that and leave the command correct anyway.

Verified 2026-09-17: compose `piston` + `postgres` up; `pnpm piston:check` — all 17 checks passed.

**Files:** `package.json`, `scripts/piston-check.mts`

### 1.2 Add `pnpm test`

- [x] Add a lightweight TypeScript test command using existing tooling (`tsx --test` or equivalent). No new test framework unless it is clearly cheaper.
- [x] Put tests next to the code they cover (`*.test.ts`) or under `lib/**/__tests__` — pick one layout and stay with it.
- [x] Cover in this phase, even if some later areas stay empty:
  - Comparison: reversed Two Sum indices accepted; incorrect values rejected; valid Group Anagrams permutations accepted; reversed Merge Intervals endpoints rejected (use a fixture even if Merge Intervals is not in the catalog yet).
  - Harness protocol: debug prints must not corrupt comparison; malformed returns fail closed.
  - Engine mapping (mock is enough here): accepted, wrong answer, syntax/runtime error, timeout, output limit, unavailable engine.

Layout: `*.test.ts` next to the module. Command: `pnpm test` → `tsx --test lib/harness/*.test.ts lib/piston/*.test.ts lib/runner/*.test.ts`.

Two Sum reversed indices and the debug-print split are locked as helpers (`compareIndexPair`, `splitHarnessOutput`) for 1.6 / 1.7 to wire into judging. The mock gained `force:output-limit`.

**Files:** `package.json`, new test files under `lib/harness/` and `lib/runner/`

### 1.3 Snapshot source when Run / Submit begins

- [x] Capture the editor buffer at click time. That exact string is what `/api/run` receives.
- [x] Later accepted-code restoration and AI context in this phase use that snapshot, not whatever is in the editor after the request returns.
- [x] Typing during a run must not change the judged source.

`run()` copies `codeState.value` into a local `source` before `fetch`. Accepted-code writes and the tutor's `code` payload use that snapshot (`judgedSource`).

**Files:** `components/workspace/workspace.tsx`, related editor/console wiring

### 1.4 Only a genuine Piston Submit marks solved

- [x] `markAccepted` runs only when `mode === "submit"`, `runner === "piston"`, and `verdict === "accepted"`.
- [x] A sample Run that happens to pass all visible cases does not mark solved.
- [x] A mock / `simulated` result does not mark solved.
- [x] Keep this gate in the client for now; Phase 3 will move solved status to the server. Do not invent a “solved” write API here.

Gate is `isVerifiedAcceptance` in `lib/runner/types.ts`. Both progress and the accepted-code snapshot go through it.

**Files:** `components/workspace/workspace.tsx`, `lib/hooks/use-progress.ts` if the helper needs to know runner/mode

### 1.5 Missing or invalid judging data is an error

- [x] Empty suite, missing expected, or unreadable judging payload → `internal_error` (or a thrown application error), never `accepted`.
- [x] Run rejects an out-of-range `testcaseIndex` instead of clamping it.
- [x] Cover empty-suite rejection and invalid index in tests.

Empty suite / blank expected → `internal_error`. Out-of-range Run index → `InvalidRunRequestError` (HTTP 400). Shared in `lib/runner/suite.ts`; mock and Piston both use it. Live check: `POST /api/run` with `testcaseIndex: 9` returned 400 `out of range (0–2)`.

**Files:** `app/api/run/route.ts`, `lib/runner/piston.ts`, `lib/runner/index.ts`

### 1.6 Explicit comparison semantics

Two Sum’s catalog currently sets `compare: "exact"` with a comment that canonicalizing pairs would be wrong. The problem statement allows either index order, and there is exactly one pair.

- [x] Accept reversed Two Sum indices under the unique-answer constraint. Prefer a dedicated compare mode (or a documented Two Sum policy) over silently switching Two Sum onto recursive `unordered`, which would also accept nonsense permutations later.
- [x] Ordered results stay ordered (`valid-parentheses`, `trapping-rain-water`).
- [x] Group Anagrams continues to allow group and member permutations (`unordered` nested canonicalize is already this).
- [x] Merge Intervals policy is implemented now (ordered endpoints, ascending interval order) even though the problem lands in Phase 4. Reversed endpoints must not pass.
- [x] Tests lock the four bullets above.

Modes: `exact`, `unordered`, `index_pair` (Two Sum), `intervals` (Merge Intervals, catalog later). Additive migration `drizzle/20260917195419_nosy_gamma_corps`. `pnpm piston:check` accepts a Two Sum solution that returns `[i, seen]`.

**Files:** `lib/harness/compare.ts`, `lib/problems.ts` (Two Sum `compare` only), `lib/db/schema/enums.ts` if a new compare mode is added

If a new compare-mode enum value is added, generate an **additive** Drizzle migration. Do not reset the database.

### 1.7 Separate debug prints from the serialized return

- [x] The Python harness keeps `print()` / stderr as debug output and compares only the serialized return value.
- [x] The console still shows debug output.
- [x] Cover this protocol in unit tests and in `piston:check` (a reference solution that prints debug text must still accept).
- [x] Keep the current text-stdin parser working. JSON-args harness changes belong to Phase 2.

`CaseResult.debug` holds captured prints. Console Result tab shows them on every case.

**Files:** `lib/harness/python.ts`, `lib/runner/piston.ts`, `lib/runner/types.ts` (`CaseResult` may need an explicit debug/stdout split), console UI if the fields change

### 1.8 Engine-check coverage

- [x] `scripts/piston-check.mts` still runs known-good and deliberately broken fixtures.
- [x] Add or keep fixtures for: wrong answer, syntax/runtime error, timeout, output limit, debug-print-but-correct.
- [x] Keep broken implementations as regression fixtures; do not delete them when Phase 2 moves reference solutions into problem modules.

Verified: `pnpm piston:check` — 19 checks passed, including debug-print accept, reverse-pair accept, and output-limit runtime_error.

**Files:** `scripts/piston-check.mts`, `lib/harness/fixtures.ts`

## Phase gate

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm piston:check` when the engine is up (or a written note that Docker was unavailable, with the command itself proven to invoke the `.mts` file)

## Out of scope

Structured `args`, hidden cases, `getProblemForJudging`, `pnpm problems:check`, Postgres practice/submission writers, new problems, chat persistence.
