# Phase 7 — Import the NeetCode 150

**Status:** in progress

Grow the catalog from 16 problems to the **104** NeetCode 150 problems this harness can judge honestly. Sourcing is data work, not new plumbing: LeetCode's public GraphQL for metadata and statement input, the MIT-licensed `neetcode-gh/leetcode` repository for reference solutions and approach notes, and a hand-written paraphrase for every statement.

Nothing is scraped with a browser, nothing LeetCode-authored is committed, and no expectation is ever written by a machine: conformance keeps proposing and a human keeps pasting.

## Work units

### 7.1 Sheet manifest and dev-time sourcing tools

- [x] Add `scripts/catalog-fetch.mts` — one networked, dev-time-only script. `--manifest` rebuilds `docs/catalog/neetcode-150.json`; `--slug` / `--group` / `--all` write `docs/catalog/sources/<slug>.json`. It never writes under `lib/problems/` and never touches Postgres.
- [x] Vendor `docs/catalog/neetcode-150.json`: 150 entries in roadmap order with the group, LeetCode number and slug, difficulty, and a harness verdict (`ready` or `deferred` + reason). #271 Encode and Decode Strings is stated explicitly; the mirror it comes from omits it. Verified: 104 ready, 46 deferred — tree 15, design 10, linked list 9, premium 7, in-place 3, float 2.
- [x] Gitignore the snapshot directory, so no LeetCode-derived text is committed and a fresh clone needs no network.
- [x] Document the pipeline, the MIT attribution, the compare-mode table, and the deferred list in `docs/catalog/README.md`.

**Files:** `scripts/catalog-fetch.mts`, `scripts/catalog-sheet.ts`, `docs/catalog/`, `.gitignore`, `package.json`

### 7.2 Harness changes the sheet forces

- [x] Add the `unordered_outer` compare mode: top-level order free, inner order significant. `unordered` canonicalises recursively, so it silently accepts a permuted permutation, a swapped point coordinate, and a permuted palindrome partition — all three now pinned as regressions against the real comparator.
- [x] Migration for the new enum value (`pnpm db:generate`: `ALTER TYPE "compare_mode" ADD VALUE 'unordered_outer' BEFORE 'index_pair'`).
- [x] Move the rejection fixture onto the problem module: `AuthoredProblem.rejection` is a plausible wrong implementation, used by `lib/harness/fixtures.ts` as the fallback for `BROKEN[slug]`. Writing 89 entries into one shared registry by hand is the alternative, and it is worse.
- [x] Make drafts unseedable: `validateCatalog` rejects any `TODO(` marker left in a statement, constraint, note, example, or testcase note, and it covers the rejection source too.
- [x] Add `scripts/catalog-scaffold.mts` and `scripts/catalog-status.mts`, and `--slug`/`--group` on `scripts/problems-check.mts`.
- [x] Regression tests: `unordered_outer` accept/reject cases, the draft-marker scan, and the catalog tests that were coupled to `PROBLEMS[0]` now look problems up by slug (the order is the roadmap order now).

**Files:** `lib/harness/compare.ts`, `lib/problems/index.ts`, `lib/db/schema/enums.ts`, `drizzle/`, `lib/problems/authoring.ts`, `lib/harness/fixtures.ts`, `lib/problems/validate.ts`, `scripts/catalog-scaffold.mts`, `scripts/catalog-status.mts`, `scripts/problems-check.mts`

### 7.3 Batch 1 — Arrays & Hashing + Two Pointers (pipeline smoke test)

Stop here and review the tooling before batch 2.

- [x] Top K Frequent Elements (`unordered`)
- [x] Valid Sudoku
- [x] Valid Palindrome
- [x] Two Sum II (`exact` — 1-indexed and ordered)
- [x] 3Sum (`unordered_outer`)
- [x] Reorder `lib/problems/catalog.ts` into roadmap order and tag the existing fifteen sheet problems `neetcode-150`
- [x] Batch gate: `catalog:status`, `problems:check`, `test`, `db:migrate && db:seed`, `piston:check`, one UI practice run

Verified (batch 1): `pnpm problems:check` — 434 checks in 15.5 s; `pnpm test` — 187 tests, 0 failures, 18.6 s; `pnpm catalog:status` — Arrays & Hashing 8/8, Two Pointers 5/5, 20/104 done, no draft markers; `pnpm db:migrate` applied the `unordered_outer` enum migration to the existing volume and `pnpm db:seed` wrote 21 problems / 61 examples / 242 testcases with **no reset** — the `two-sum`, `trapping-rain-water`, and `3sum` row IDs were byte-identical before and after a second seed; `pnpm piston:check` — all 91 checks passed (every reference accepted, every `rejection` rejected, every untouched starter refused); `pnpm lint`, `pnpm typecheck`, and `pnpm build` clean.

Not verified there: the UI practice run. The app was not running (port 3000 belongs to another project on this machine) and starting a second server is out of scope for this phase. `pnpm piston:check` exercises the same judging path headlessly — `runWithPiston` plus `getProblemForJudging` against the seeded database — for all 21 problems, so judging is covered; what is not confirmed by hand is the list page's `neetcode-150` tag filter and the workspace rendering a new problem.

Gate closed later, against the running app and the real engine:

- `pnpm problems:check` — 616 checks; `pnpm test` — 187 tests, 0 failures; `pnpm catalog:status` — 20/104 done, no draft markers; `pnpm lint` and `pnpm typecheck` clean.
- `pnpm db:migrate && pnpm db:seed` — **no reset**: the `3sum`, `contains-duplicate`, `trapping-rain-water`, and `two-sum` row IDs were byte-identical before and after; now 33 problems / 91 examples / 394 testcases / 132 starters. A re-seed rewrites `problems`, so it moves `problems.updated_at` and therefore the `catalog_revision` label of any *later* submission — history rows keep the revision they were written with.
- `pnpm piston:check` against the real engine — **139 checks passed** (every reference accepted, every `rejection` rejected, every untouched starter refused).
- UI practice run: `submit` of the draft solution for Contains Duplicate through `POST /api/run` on the running dev server — `runner: "piston"`, `verdict: "accepted"`, 11/11 cases, 36 ms, Python 3.12.0, `persisted: true`. `problem_progress` gained its first row (`solved`, `revision 1`), `GET /api/practice/contains-duplicate` returned `status: "solved"` with a non-null `latestAccepted`, and the history endpoint listed the stored submission. Repeating the same `requestId` returned the existing row in ~20 ms instead of judging again — the idempotency guard works on the real path, not just in tests.

The trap this closed, worth remembering for the remaining batches: the dev server was running with **`PISTON_URL` unset**, so Run and Submit were answered by the deterministic mock. The mock executes nothing and returns `accepted` for any source that is not blank, an untouched starter, or a `force:*` marker — so a correct solution looks solved while nothing was judged. Both guards then behaved correctly: mock runs write no progress row, and `getPractice` only reads a latest accepted where `runner = 'piston'`, which is why the workspace sat at "todo" and the Solution tab showed "No accepted submission yet". Fixed by `.env.local` with `PISTON_URL=http://127.0.0.1:2001` (compose defaults do not turn on real judging on their own), and the workspace now says so in the Solution tab and the console's `simulated` badge. `pnpm piston:check` had also never run against the engine before this gate.

Tooling notes for the next batch:

- `pnpm piston:runtimes` assumed the pinned image ships `cli/index.js`; the current digest is the API-only build, so it now falls back to `POST /api/v2/packages` and says which path it used. Python 3.12.0 installed through that fallback, after which the engine needed a restart before `GET /api/v2/runtimes` listed it.
- `lib/problems/authoring.test.ts` and `validate.test.ts` used to index `PROBLEMS[0]`; the roadmap order made that wrong, so they look problems up by slug now.
- No oracle was added for the five new problems, so conformance verifies them with the reference plus the hand-verified example anchors instead of an independent brute force. Adding oracles for the higher-risk batches is worth doing when a problem's comparator is subtle.

### 7.4 Batch 2 — Sliding Window, Stack, Binary Search

- [x] Sliding Window: Longest Repeating Character Replacement, Permutation in String, Minimum Window Substring, Sliding Window Maximum
- [x] Stack: Evaluate Reverse Polish Notation, Generate Parentheses (`unordered`, stated in the statement), Car Fleet, Largest Rectangle in Histogram
- [x] Binary Search: Search in Rotated Sorted Array, Search a 2D Matrix, Find Minimum in Rotated Sorted Array, Koko Eating Bananas
- [x] Batch gate

Notes from the batch, worth carrying forward:

- `permutation-in-string`'s hidden case `["abc", "bbbca"]` was authored as `false`; conformance refused it because the trailing window `bca` *is* a permutation. The reference was right and the case was corrected by hand — which is the mismatch path working, not a failure.
- `generate-parentheses` allows only `1 <= n <= 8`, so eight hidden cases means covering the whole input space. Its hidden lists were produced by an independent enumerator and checked against the Catalan counts (1, 2, 5, 14, 42, 132, 429, 1430) before conformance compared them with the reference. That module is therefore much larger than the others, and says so in a comment.
- Three rejection fixtures were rewritten during authoring because the first draft of each was *correct* code (a sorted-window check, a reservoir-style deque update, and a fleet counter), which `piston:check` would have reported as `accepted`. A near-miss has to be genuinely wrong on at least one authored case.
- Article matching is only as good as the method name: `search-in-rotated-sorted-array` picked up the article for **search-in-rotated-sorted-array-ii** (`search` is the method name of both), and `best-time-to-buy-and-sell-stock` picked up its `-ii` article. Notes for those were written by hand. See the limitation recorded in `docs/catalog/README.md`.

Verified: `pnpm problems:check` — 616 checks; `pnpm test` — 187 tests, 0 failures; `pnpm catalog:status` — Sliding Window 6/6, Stack 6/6, Binary Search 5/5, 32/104 done, no draft markers; seed — 33 problems, 91 examples, 394 testcases, existing rows untouched; `pnpm piston:check` — all 139 checks passed; `pnpm lint` and `pnpm typecheck` clean. The UI practice run is still the one gate item this environment cannot do (the app is not running, and starting a second server is out of scope).

### 7.5 Batch 3 — Intervals, Greedy, Heap

- [x] Intervals: Insert Interval, Non-overlapping Intervals, Minimum Interval to Include Each Query
- [x] Greedy: Jump Game, Jump Game II, Gas Station, Hand of Straights, Merge Triplets, Partition Labels, Valid Parenthesis String
- [x] Heap: Last Stone Weight, Kth Largest Element in an Array, Task Scheduler, K Closest Points to Origin (`unordered_outer`)
- [x] Batch gate

Notes from the batch, worth carrying forward:

- Catalog order now follows the sheet groups that are actually seeded: Heap, then Greedy, then Intervals. `maximum-subarray` and `merge-intervals` moved with their groups. Their row IDs did not change.
- `insert-interval` uses `intervals` (sorted by start, endpoints in order), and the statement says so. `k-closest-points-to-origin` uses `unordered_outer`. The statement says the points may be listed in any order and that each point stays `[x, y]`. Every closest-set in the suite is unique, including the case where two points share a distance and both belong in the answer.
- `gas-station` cases all have a single legal start. The vendored reference returns one index even when several stations would work, so a non-unique case would judge only one of the legal answers.
- `kth-largest-element-in-an-array` needed `from heapq import heapify, heappop` prepended; recorded in `docs/catalog/README.md`. `last-stone-weight`, `task-scheduler`, and `valid-parenthesis-string` are vendored with two `Solution` classes, and the second definition is the one that runs. Piston accepted the last-stone private max-heap (`heapq._heapify_max`). `task-scheduler` had no verified article, so the notes describe the greedy formula that actually executes.
- The first `partition-labels` rejection never terminated: it closed each piece on the first index of the current letter, and that index can sit behind the cursor. The replacement still forgets to extend a piece for letters inside it, and it finishes.
- Independent oracles cover this batch. The gas oracle returns nothing when more than one start works, and the k-closest oracle returns nothing on a distance tie at the boundary, so those cases stay a review instead of a silent preference.

Verified: `pnpm problems:check` — 812 checks; `pnpm test` — 187 tests, 0 failures; `pnpm catalog:status` — Heap / Priority Queue 4/4, Greedy 8/8, Intervals 4/4, 46/104 done, no draft markers; seed — **no reset**, existing problem IDs unchanged, now 47 problems, 133 examples, 548 testcases, 188 starters; `pnpm piston:check` — all 195 checks passed; `pnpm lint` and `pnpm typecheck` clean. The UI practice run is still the one gate item this environment did not do (the app was not running).

### 7.6 Batch 4 — Bit Manipulation, Math & Geometry, Tries, Linked List leftovers

- [x] Bit: Single Number, Number of 1 Bits, Counting Bits, Reverse Bits, Missing Number, Sum of Two Integers, Reverse Integer
- [x] Math & Geometry: Happy Number, Plus One, Spiral Matrix, Multiply Strings
- [x] Tries: Word Search II
- [x] Linked List group: Find the Duplicate Number
- [x] Batch gate

Notes from the batch, worth carrying forward:

- Catalog order picks up the sheet's group order: Linked List (group 6) and Tries (group 8) sit between Binary Search and Heap, and Math & Geometry (17) and Bit Manipulation (18) follow Intervals. Re-seeding left every pre-existing row ID unchanged.
- `reverse-bits` is the first problem whose *input* range is narrowed by the harness rather than by LeetCode. `int` is int32-checked, and reversing an odd 32-bit value sets bit 31 (`1` reverses to `2³¹`), which `int` cannot hold. LeetCode's own constraints already say `0 <= n <= 2³¹ - 2` and `n is even`, so the module keeps them, states why, and authors only even inputs. Recorded in `docs/catalog/README.md`.
- `word-search-ii` uses `unordered`: LeetCode accepts the found words in any order, and both the statement and the compare comment say so. No case depends on the order the reference's DFS happens to produce.
- `multiply-strings` keeps its operands at or below 50 digits. The fifty-nines case already carries into a 100-digit product; a 200-digit `expected` would be unreadable in the module without exercising anything the shorter one does not.
- No vendored reference needed an adaptation this batch — no imports, no rewritten bounds. `counting-bits` ships a second `Solution2` class and `happy-number` a second method on `Solution`; both run as-is, and the harness calls the first class. `happy-number` matched no article (`articleVerified: false`), so its notes describe the two-pointer walk the reference actually runs.
- `find-the-duplicate-number` states LeetCode's own "do not modify `nums`, constant extra space" requirement even though the comparator cannot check it; the suite still judges only the returned value.
- Independent oracles cover all thirteen problems, with generated small inputs for each. Two hand-written case notes were wrong and the reference was right: `2147483646` reverses to itself (its bit pattern is a palindrome), and on `[["a","b","c"],["d","e","f"]]` the snake spells `abcfed`, not `abcdef`. Both notes were corrected by hand; no case or expectation was rewritten to fit.

Verified: `pnpm problems:check` — 1127 checks; `pnpm test` — 187 tests, 0 failures; `pnpm catalog:status` — Linked List 1/1, Tries 1/1, Math & Geometry 4/4, Bit Manipulation 7/7, 59/104 done, no draft markers; `pnpm db:migrate && pnpm db:seed` — **no reset**, the sampled pre-existing IDs (`two-sum`, `3sum`, `group-anagrams`, `insert-interval`, `valid-parentheses`) were byte-identical before and after, a second seed produced an identical `id|slug` fingerprint, and the practice rows (9 submissions, 2 progress rows, 2 drafts) survived; now 60 problems / 167 examples / 710 testcases / 240 starters; `pnpm piston:check` against the real engine — **all 247 checks passed** (every reference accepted, every `rejection` rejected, every untouched starter refused); `pnpm lint`, `pnpm typecheck`, and `pnpm build` clean. The UI practice run is once again the one gate item this environment did not do: the app is not running, and starting a server is out of scope. `pnpm piston:check` exercises the same judging path headlessly for all 60 problems.

### 7.7 Batch 5 — Graphs and Advanced Graphs

- [ ] Graphs: Number of Islands, Max Area of Island, Pacific Atlantic Water Flow (`unordered_outer`), Rotting Oranges, Course Schedule, Course Schedule II (unique-order cases only), Redundant Connection, Word Ladder
- [ ] Advanced Graphs: Reconstruct Itinerary, Min Cost to Connect All Points, Network Delay Time, Swim in Rising Water, Cheapest Flights Within K Stops
- [ ] Batch gate

### 7.8 Batch 6 — Backtracking

- [ ] Subsets, Combination Sum, Permutations (`unordered_outer`), Subsets II, Combination Sum II, Word Search, Palindrome Partitioning (`unordered_outer`), Letter Combinations, N-Queens (`unordered_outer`)
- [ ] Batch gate

### 7.9 Batch 7 — 1-D Dynamic Programming

- [ ] Climbing Stairs, Min Cost Climbing Stairs, House Robber, House Robber II, Longest Palindromic Substring, Palindromic Substrings, Decode Ways, Coin Change, Maximum Product Subarray, Word Break, Longest Increasing Subsequence, Partition Equal Subset Sum
- [ ] Batch gate

### 7.10 Batch 8 — 2-D Dynamic Programming

- [ ] Unique Paths, Longest Common Subsequence, Best Time to Buy and Sell Stock with Cooldown, Coin Change II, Target Sum, Interleaving String, Longest Increasing Path in a Matrix, Distinct Subsequences, Edit Distance, Burst Balloons, Regular Expression Matching
- [ ] Batch gate

### 7.11 Close out

- [ ] `docs/catalog/README.md` records every compare-mode decision and every reference adaptation
- [ ] README counts, `docs/plan/00-scope.md`, and this file agree with the seeded catalog
- [ ] Phase gate below

## Per-problem order (every problem)

Same order as the README's "Authoring a problem": statement → cases → reference → `pnpm problems:check` → a plausible wrong-answer fixture → seed / `pnpm piston:check` → one UI practice run. A scaffolded draft arrives with `TODO(` markers and cannot seed until each one is gone.

Rules that keep judging honest at this scale:

- Keep every suite at ~11–13 cases. Suite size is the only Submit latency lever; the per-case limits do not move.
- `compare` is a decision, not a default. When a mode is stricter than LeetCode's own checker, the statement says the required order explicitly.
- `int` returns are `int32`-checked, so choose answers that fit; `long` exists but is `Number.isSafeInteger`-bounded.
- Hidden cases stay inside the problem's real constraints — empty inputs only when the contract allows them.
- Never rewrite a reference expectation by hand to make a case pass. A mismatch is a review.

## Phase gate

- [ ] `docs/catalog/neetcode-150.json` says 104 ready, and 104 are seeded
- [ ] `pnpm catalog:status` reports no unfinished `TODO(` marker
- [ ] `pnpm problems:check` passes for the whole catalog
- [ ] `pnpm db:migrate && pnpm db:seed` ran against the existing volume with no reset, and the pre-existing problem IDs are unchanged
- [ ] `pnpm piston:check` covers every seeded problem
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Out of scope

The **46** deferred sheet problems, each recorded with a reason in the manifest and in `docs/catalog/README.md`:

| Reason | Count | Examples |
| --- | --- | --- |
| Linked lists | 9 | Reverse Linked List, Merge Two Sorted Lists, LRU-neighbour problems |
| Trees | 15 | Invert Binary Tree, Maximum Depth, Level Order Traversal |
| Design / multi-method classes | 10 | Min Stack, LRU Cache, Trie, Median Finder, Twitter |
| In-place `void` contracts | 3 | Rotate Image, Set Matrix Zeroes, Surrounded Regions |
| Float returns (no tolerance compare) | 2 | Median of Two Sorted Arrays, Pow(x, n) |
| LeetCode-premium only | 7 | Meeting Rooms I/II, Graph Valid Tree, Alien Dictionary, Encode and Decode Strings, Walls and Gates, Number of Connected Components |

Opening any of these needs its own phase: linked lists and trees need a serialiser in the harness, design problems need multi-method dispatch, in-place contracts need a `void` return rule, and float returns need a tolerance comparator. This phase does not start any of them, and it adds no new argument kind.

Also out of scope: a category-grouped sheet view (the `neetcode-150` tag plus roadmap order is the whole UI change), other languages, hosting, and auth.
