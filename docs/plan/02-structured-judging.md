# Phase 2 — Structured cases, hidden judging, and conformance

**Status:** complete

Arguments are authoritative. Displayed input is generated. Submit judges the full suite, reveals the first failing hidden case, and the existing four problems pass a Docker-free conformance gate before seed.

Do **not** add the extra twelve problems, Postgres practice writers, or chat persistence in this phase.

## Work units

### 2.1 Split authoring from the public problem interface

- [x] Keep `@/lib/problems` as the shared public interface (types + helpers the UI may import).
- [x] Move each of the four problems into its own authoring module. Do not re-export reference solutions or the full catalog into client-facing imports.
- [x] Distinct types:
  - **authoring** — a testcase may omit `expected`
  - **judging** — every case has `args`, `expected`, `hidden`, optional compare override, optional `note`
  - **public** — visible cases only; no reference source
- [x] Store `note` as the existing `explanation` column.
- [x] Reuse `formatArguments(args, signature)` for console input. Generate executable sample `input` from the same arguments. Keep example explanations authored separately.

**Files:** `lib/problems.ts` (split), new `lib/problems/` modules, `lib/db/queries/problems.ts` consumers

### 2.2 Strengthen authoring validation

A malformed catalog fails before execution or seed.

- [x] Argument count matches the signature.
- [x] Recursively correct value kinds; integers are not booleans; numbers are finite; integer precision is in range.
- [x] Expected return shape is valid for the signature.
- [x] Problem identifiers (slug, number) are unique.
- [x] Python starter is required.
- [x] Every judging testcase has `expected`. Authoring without it is allowed only before conformance fills it in as a **candidate printed for review**, never auto-written.

**Files:** new validator next to the authoring modules

### 2.3 JSON-args Python harness

- [x] Send a JSON argument array to the harness. Decode JSON and call the signature’s method directly.
- [x] Do not parse display text on the judging path.
- [x] Retain the old text parser only for the migration backfill in 2.4.
- [x] Keep Phase 1’s debug-print protocol.

**Files:** `lib/harness/python.ts`, `lib/harness/args.ts`, runner

### 2.4 Additive database migration for `args`

Do not reset the database. Preserve problem IDs and practice data.

1. [x] Add `arguments` JSONB on `problem_testcases` while retaining `stdin`.
2. [x] Backfill existing rows from stored signatures + the old parser. Stop with actionable diagnostics if any row cannot be converted.
3. [x] Verify every row, switch reads/writes to `arguments`, enforce non-null, then remove `stdin` in a **subsequent** migration.
4. [x] Keep `expected` as validated canonical JSON text for this phase.
5. [x] Retain `hidden`, per-case compare overrides, and `note` → `explanation`.

Historical submission rows are snapshots. Do not rewrite them.

**Files:** `lib/db/schema/problems.ts`, generated `drizzle/` migrations, `lib/db/seed.ts`, a one-shot backfill script if seed is not the right place

### 2.5 Public vs judging reads, and disclosure

- [x] `getProblem` remains public content and visible cases only.
- [x] Add `getProblemForJudging` for the server runner, with every testcase.
- [x] Run evaluates the selected visible case; reject invalid indices (Phase 1 already forbids clamping).
- [x] Submit evaluates visible cases first, then hidden cases, stopping at the first failure.
- [x] `totalCount` is the entire suite, including cases not reached.
- [x] Public hidden-case **successes** contain status and metrics only.
- [x] The **first failing hidden case** reveals input, expected, output, and diagnostics.
- [x] The same disclosure rules apply to any result shape the UI or (later) history/AI will see. Do not invent a second, leakier DTO.

**Files:** `lib/db/queries/problems.ts`, `lib/runner/*`, `lib/runner/types.ts`, console UI

### 2.6 Catalog conformance gate

- [x] Add `pnpm problems:check`.
- [x] Run repository-authored Python reference solutions locally, with time and output limits, against every visible and hidden case.
- [x] Requires Python. Requires neither Postgres nor Docker.
- [x] Reuse production harness serialization and comparison.
- [x] On failure print problem, case, visibility, arguments, expected, and actual.
- [x] For missing expectations, print ready-to-paste candidates and exit non-zero until they are reviewed and added by hand.
- [x] Never silently replace a mismatching expectation.
- [x] Seed must refuse to write until this check has passed in the same command, then seed the validated catalog transactionally.
- [x] Move existing reference solutions out of duplicated engine fixtures into their problem modules. Keep deliberately broken implementations as regression fixtures for `piston:check`.
- [x] Where practical, add a hand-verified anchor and a small brute-force oracle for generated small inputs. Reference/expectation disagreements require reviewing the testcase, solution, and comparator.

**Files:** `scripts/` conformance checker, `package.json`, `lib/db/seed.ts`, `lib/harness/fixtures.ts`

### 2.7 Strengthen the existing four problems

For `two-sum`, `valid-parentheses`, `group-anagrams`, `trapping-rain-water`:

- [x] Original statement, precise constraints, signature, Python starter (keep quality; rewrite if the current text is thin).
- [x] 2–3 visible cases with explanations.
- [x] At least 8 hidden cases covering minima, duplicates, negatives, ordering, and constraint boundaries. Empty inputs only where the contract allows them.
- [x] Reference solution, comparison policy, approach, complexity, `sourceUrl`.
- [x] At least one plausible incorrect implementation that the suite rejects.
- [x] Conformance passes. Then seed. Then `piston:check`. Then practice each problem once in the UI (Run a sample, fail a hidden case on Submit, then pass).

Do not add the extra twelve problems yet.

### 2.8 Tests for judging behaviour

- [x] Visible-first ordering, early stop, full counts, empty-suite rejection, hidden-result disclosure (success redacts; first failure reveals).
- [x] Arguments/harness: escaped strings, matrices, booleans, invalid nested types, debug prints, malformed returns.
- [x] Migration: existing-data backfill, invalid-row diagnostics, repeat seed, preserved practice data. Fresh-install coverage can be a documented `pnpm db:migrate && pnpm db:seed` on an empty volume, not necessarily an automated wipe.

Covered next to the modules (`lib/runner/*.test.ts`, `lib/harness/*.test.ts`, `lib/db/*.test.ts`). Fresh install is documented on `lib/db/seed.ts` and `lib/db/migrate.ts`; this database is not wiped.

## Phase gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm problems:check`
- [x] `pnpm db:migrate && pnpm db:seed` on the existing database (no wipe)
- [x] `pnpm piston:check`
- [x] Manual: Submit on a wrong solution reveals the first hidden failure; a correct solution accepts the full suite

Verified 2026-09-18: existing Postgres volume (no wipe); `pnpm piston:check` — 19 checks; Two Sum in the UI — sample Run accepted, Submit of a visible-only solution was Wrong Answer 3/12 with Hidden 1 revealed (`nums = [1,2]`, expected `[0,1]`, output `[0,0]`), reference Submit accepted 12/12.

## Out of scope

Drafts/notes APIs, submission persistence, the extra twelve problems, chat threads, batching.
