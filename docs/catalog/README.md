# The NeetCode 150 sheet and how it gets in

`neetcode-150.json` is the sheet: 150 entries in NeetCode roadmap order, each with its group, LeetCode number and slug, difficulty, and a verdict from `scripts/catalog-sheet.ts` about whether **this** harness can judge it.

```bash
pnpm catalog:status                        # what is done, what is left, what carries TODO markers
pnpm catalog:fetch --manifest              # rebuild the manifest (network; review the diff)
pnpm catalog:fetch --slug two-sum          # fetch one problem's authoring snapshot (network)
pnpm catalog:scaffold --slug two-sum        # write a draft lib/problems/two-sum.ts
pnpm problems:check --slug two-sum          # conformance for one problem (needs Python 3)
pnpm problems:check                         # the gate: the whole catalog
pnpm db:migrate && pnpm db:seed             # the app reads Postgres, not the catalog modules
pnpm piston:check                           # every seeded problem accepts / rejects for real
```

## Where each piece comes from

| Piece | Source | Notes |
| --- | --- | --- |
| Sheet order, groups, membership | the NeetCode roadmap, mirrored as TOML | vendored into the manifest; #271 Encode and Decode Strings is added by hand because the mirror omits it |
| Number → slug, title, difficulty, topic tags | `leetcode.com/api/problems/all` + `question` GraphQL | unauthenticated; a snapshot is a point-in-time copy |
| Signature (method, parameter names, kinds) | GraphQL `metaData` | used only when it maps onto `VALUE_KINDS`; the classifier defers the rest |
| Python starter | GraphQL `codeSnippets[python3]` | LeetCode's own signature, so the editor opens on the right shape |
| Reference solution | [`neetcode-gh/leetcode`](https://github.com/neetcode-gh/leetcode) `python/NNNN-slug.py` | **MIT**; vendored verbatim where it runs under the harness |
| Approach and complexity notes | the same repository's `articles/*.md` | **MIT**; the optimal section's Intuition prose and its `Time & Space Complexity` lines. See the matching caveat below |
| Statement, example explanations, comparisons | **written here** | the snapshot's statement HTML is an authoring input. LeetCode's prose is copyrighted and is not committed |
| `expected` values | `pnpm problems:check` prints a candidate | a human reviews and pastes it. Nothing writes expectations automatically |
| Rejection fixture | written here | a plausible near-miss the suite must reject; `piston:check` requires one per problem |

Snapshots land in `docs/catalog/sources/`, which is gitignored: a fresh clone needs no network, and no fetched text enters the repository.

**Article matching is only as good as the method name.** A candidate article is accepted when its code contains `def <method>(`, which rules out the common `valid-palindrome` / `valid-palindrome-ii` confusion — but not when two problems share a method name: `search` matched the article for *search-in-rotated-sorted-array-ii*, and `maxProfit` matched the *best-time-to-buy-and-sell-stock-ii* article for the plain one. The snapshot records `articleCandidates` and `articleVerified` so the mismatch is visible, and the notes are a draft to review either way. When in doubt, write the notes from the reference — `happy-number` matched no article at all (`articleVerified: false`), so its notes describe the two-pointer cycle walk the vendored reference actually runs.

## What the scaffolder leaves for a human

The scaffolder writes identity, signature, starter, reference, example arguments, and a hidden-case battery. It cannot write: the statement, the constraints in our own words, why each example explains what it does, any `expected`, or a plausible wrong answer. Each of those carries a `TODO(` marker, and `validateCatalog` refuses a problem that still has one — so a draft cannot pass conformance, cannot seed, and cannot reach the app.

The hidden battery ignores **cross-parameter** constraints, because they are prose: for Top K Frequent Elements the battery cannot know `k <= number of distinct elements`, so it proposes `k = 10` for a one-element array. Conformance reports those rows (a runtime error, or an expected value that is not the declared kind) and the author replaces them. Treat the battery as a first draft of the edge cases, not as coverage.

## Adaptations to vendored references

References are vendored verbatim unless a change is unavoidable, and every change is recorded here.

| Problem | Change | Why |
| --- | --- | --- |
| `3sum` | the duplicate-skipping loop reads `while l < r and nums[l] == nums[l - 1]` (the upstream file tests the value first) | index-before-value reads the array only when the bound allows it. Behaviour on the authored suite is unchanged |
| `kth-largest-element-in-an-array` | `from heapq import heapify, heappop` is prepended | the vendored file calls `heapify` and `heappop` unqualified, and the harness prelude only imports the `heapq` module |
| `number-of-islands` | retain the first complete `Solution` implementation from the fetched file | the snapshot also contains duplicate implementations and a trailing malformed BFS experiment; Python parses the entire file, so the unrelated trailing snippet cannot remain in the reference program |
| all | the LeetCode starter's `list[int]` spelling became `List[int]` | matches the rest of the catalog; the harness prelude provides `typing`, so both run |

## Batch 5 — Graphs and Advanced Graphs

The 13 ready problems in these two groups are seeded in roadmap order. Pacific Atlantic uses `unordered_outer`: each [row, column] pair stays ordered, but the outer list is a set of reachable coordinates. Course Schedule II uses exact comparison only on cases with a unique valid topological order; a general any-valid-order rule cannot be expressed by the text comparator. Course Schedule allows a self-prerequisite input, so the suite includes that cycle case; Course Schedule II explicitly excludes self-edges. Reconstruct Itinerary asks for the lexicographically smallest complete route, so exact comparison matches the contract.

Independent small-input oracles live in `lib/problems/graph-oracles.ts`. They use direct downhill reachability, Kahn topological sorting, connectivity before each edge, exhaustive itinerary enumeration, Kruskal, Bellman–Ford, threshold-plus-flood-fill, and bounded flight relaxations. They return `null` outside their small bounds, so production-sized cases still use the reference and reviewed anchors.

### Reference adaptation

The fetched Number of Islands file contains multiple `Solution` definitions and a trailing malformed BFS experiment. The catalog keeps the first complete `Solution` implementation so Python can parse and run the reference program. This selection is recorded in the adaptation table above.

## Compare modes

`compare` is a per-problem decision, not a default:

| Mode | Use it when | Examples here |
| --- | --- | --- |
| `exact` | the answer is a value, or LeetCode's own order is the required order | `sliding-window-maximum`, `merge-intervals` (with `intervals`), `spiral-matrix` |
| `unordered` | the answer is a bag of things and their order carries no meaning | `group-anagrams`, `top-k-frequent-elements`, `word-search-ii` |
| `unordered_outer` | the answer is a **set of ordered sequences**: the pieces may be listed in any order, but the order inside a piece is the answer | `3sum`, `permutations`, `n-queens`, `palindrome-partitioning`, `pacific-atlantic-water-flow`, `k-closest-points-to-origin` |
| `index_pair` | exactly two indices, either order | `two-sum` |
| `intervals` | `[start, end]` pairs, ascending, endpoints in order | `merge-intervals`, `insert-interval` |

`unordered` canonicalises recursively, so it sorts inner arrays too: it accepts `[[1,2,3],[1,2,3],…]` as a set of permutations and `[[2,1]]` as `[[1,2]]`. That is why `unordered_outer` exists, and why the six problems above are listed explicitly.

Two more rules that keep judging honest:

- When a mode is stricter than LeetCode's checker, the **statement says the required order**. A stricter mode must never be a hidden trap.
- When the answer is "any valid answer" (Course Schedule II accepts any valid topological order), text comparison cannot express it: choose cases where the valid answer is unique.

`word-search-ii` is the reverse case: LeetCode's own checker accepts the found words in any order, so `unordered` matches it and the statement says the order is free. No case relies on the order the reference's DFS happens to produce.

## Where the harness narrows the input

The `int` kind is int32-checked on both sides, so a problem whose *input* range can produce an out-of-range answer needs its inputs narrowed rather than its comparator relaxed. `reverse-bits` is the one problem where that bites: reversing an odd 32-bit value sets bit 31 (`1` reverses to `2³¹`), which `int` cannot hold. LeetCode's own constraints already read `0 <= n <= 2³¹ - 2` and `n is even`, so the module keeps them, says why in the statement, and authors only even inputs. Nothing else in the catalog is affected.

## Deferred problems

46 of the 150. They are listed in the manifest with a reason and never scaffolded; each reason is a real gap, not a preference.

| Reason | Count | What opening it needs |
| --- | --- | --- |
| `tree` | 15 | level-order array parsing into `TreeNode` and back |
| `design` | 10 | multi-method dispatch (`MinStack`, `LRUCache`, `Trie`, `MedianFinder`, `Twitter`) and custom node classes (`Clone Graph`) |
| `linked_list` | 9 | `ListNode` serialising in the harness |
| `premium` | 7 | a LeetCode subscription: `isPaidOnly` problems have no public statement, starter, or examples |
| `in_place_void` | 3 | a `void` return contract (`rotate-image`, `set-matrix-zeroes`, `surrounded-regions`) |
| `float_return` | 2 | a tolerance comparator (`median-of-two-sorted-arrays`, `powx-n`) |

All of it is out of scope for Phase 7 and belongs to a later phase that says so explicitly.

## Attribution

Reference solutions and approach notes come from [`neetcode-gh/leetcode`](https://github.com/neetcode-gh/leetcode), MIT licensed. Each scaffolded module records the reference's path in the scaffold output; the manifest records the article path per snapshot.
