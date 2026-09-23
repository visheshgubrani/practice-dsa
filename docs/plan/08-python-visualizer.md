# Phase 8 — Python visualizer: step-through dry runs

**Status:** complete

Draw the selected visible case as a step-through: call stack, every list, dict
and object as a box, arrows between them, prev / next / slider. The picture is
Python Tutor's `ExecutionVisualizer`; the trace comes from Python Tutor's own
`bdb` logger, run **inside the judging sandbox** on the **same Python 3.12.0**
the judge uses, against the **editor buffer**.

This phase was inserted ahead of the rest of Phase 7 because it changes how the
already-seeded 60 problems are studied, and it touches no catalog code. Phase 7
is paused at 59/104 and resumes after this one closes.

## What the spikes settled before any of this was written

Measured against the running engine, not assumed:

| Question | Answer | Consequence |
| --- | --- | --- |
| Does `bdb` tracing work on Piston's Python 3.12? | Yes — syntax errors, runtime exceptions and normal runs all trace | The approach is viable |
| Does the upstream logger run there? | No: `pg_logger.py` does `import imp`, removed in 3.12 | Vendor the mirror that already uses `importlib.util` |
| How big is a trace step with the judging prelude? | **48 KB per step** (`from typing import *` binds ~100 names, re-encoded at every step) | The trace prelude replaces that one line with an inert shim → **2 KB per step** |
| How much stdout will the engine return? | Exactly `PISTON_OUTPUT_MAX_SIZE`, then `SIGKILL` | Raise the knob to 4 MiB **and** have the tracer budget its own payload |
| Is 1000 steps (Python Tutor's default) sane? | 29 MB and 3 s of tracing | 500 steps is the app's ceiling, and hitting it is reported |

## Work units

### 8.1 Vendor the tracer and the picture

- [x] `vendor/python-tutor/` — `pg_logger.py`, `pg_encoder.py`, `pytutor-embed.bundle.js`, `pytutor.css`, `LICENSE`, `VERSION`, `README.md` with the upstream URL, the commit, per-file sha256, and why the original repository is not the source (404, and `imp`).
- [x] `vendor/python-tutor/frame.html` — the same-origin frame: loads the two browser assets, waits for a trace by `postMessage`, calls `window.addVisualizerToPage({code, trace}, "visualizerDiv", options)`, relays the current step, and reports its own failures to the parent.
- [x] `scripts/sync-visualizer.mjs` — copies the browser assets into `public/vendor/python-tutor/` with a content-aware stamp, like `scripts/sync-monaco.mjs`; wired into `pnpm dev` / `pnpm build`, with `pnpm visualizer:sync` to run it alone.
- [x] `.gitignore` and `eslint.config.mjs` — the generated copy is ignored and lint-exempt, and so is `vendor/**` (upstream code is not ours to lint).

### 8.2 The trace program and the engine seam

- [x] `lib/harness/python.ts` — the module-import lines are exported as `PRELUDE_IMPORTS` so the judging prelude and the trace prelude cannot drift; the judging prelude's bytes are unchanged.
- [x] `lib/visualizer/program.ts` — `TRACE_PRELUDE` (the judging prelude with the typing line replaced by `TRACE_ANNOTATION_SHIM`), `TRACE_DRIVER` (reads `{script, cap, maxBytes}` from stdin, sets `pg_logger.MAX_EXECUTED_LINES`, traces with `allow_all_modules=True`, re-traces with fewer steps when its own payload is too big, prints `TRACE <json>`), and `buildTraceProgram` (entry `main.py`, the two vendored files beside it, the case's arguments as a JSON string literal, the `Solution().<name>(*_args)` call).
- [x] `lib/piston/client.ts` — `extraFiles` on a job (entry first, names carry their extensions), folded into `cacheKey`, plus a `cache: false` option for jobs whose reply is megabytes.
- [x] `lib/piston/config.ts` — `TRACE_LIMITS` (`maxSteps` 500, `maxBytes` 3.5 MB, `runMs` 4000 clamped to the engine's 5000 ms ceiling), `ENGINE_OUTPUT_LIMIT`, `TRACE_DEADLINE_MS`.
- [x] `docker-compose.dev.yml` — `PISTON_OUTPUT_MAX_SIZE: '4194304'`, with `lib/piston/map.ts` reading the same number from `lib/piston/config.ts` instead of mirroring it privately.
- [x] `.env.example` — the three trace knobs and what raising them requires.
- [x] `lib/harness/fixtures.ts` — the "prints more than the output limit" fixture now prints `ENGINE_OUTPUT_LIMIT + 64 kB` instead of a hard-coded 70 kB. Raising the cap turned that fixture into a *wrong answer* (70 kB no longer overflows anything), which is exactly what `pnpm piston:check` caught: the fixture has to be derived from the cap, not from a number that used to be bigger than it.
- [x] **Gate:** `pnpm visualizer:check --slug two-sum` — 3 traces, 16–19 steps, ~1.8 KB/step, ~180 ms, nothing written. (The first run of this gate is what caught the compose container still holding the old 64 KiB cap: the engine answered `OL` / "stdout length exceeded" with exactly 65536 bytes of stdout.)

### 8.3 `POST /api/visualize`

- [x] `lib/visualizer/types.ts` — the request schema (one language, one buffer, one visible case index) and the response shape with its guard.
- [x] `lib/visualizer/errors.ts` — a `VisualizerError` that carries its own status, so a bad request and an unreachable engine are not the same answer.
- [x] `lib/visualizer/trace.ts` — `visualizeTrace`: refuses an empty buffer, refuses the mock runner, loads **public** problem content only, validates the index against the visible cases, reads the vendored tracer from `vendor/python-tutor`, runs one job with `cache: false`, then parses `TRACE` / `TRACE_ERROR`, summarizes the outcome (completed / exception / syntax error / step limit), and explains an engine kill in terms of the byte cap and the restart it needs.
- [x] `lib/visualizer/client.ts` — the browser side: one fetch, an `AbortSignal`, and a refusal to interpret an unexpected body.
- [x] `app/api/visualize/route.ts` — parse, schema, call, map errors. Imports nothing that can write.
- [x] **Gate (live route):** `200` with a 16-step trace for `two-sum` case 1 in ~200 ms; `400` for case 10 of 3, for a negative index, for an empty buffer, for `language: "cpp"`, and for a junk body; `404` for an unknown slug.

### 8.4 The panel

- [x] `components/workspace/visualize-panel.tsx` — case selector beside a Visualize / Trace again button, cancel while tracing, pop-out, and states for idle, tracing, engine-off, syntax error, step limit, and a trace that could not be drawn. The picture is a `postMessage` away in `TraceFrame`, which owns one iframe and only ever sends the trace it was mounted with.
- [x] `components/workspace/problem-panel.tsx` — a fourth tab, `Visualize`, after AI Chat, kept mounted like the chat so your place in a trace survives a look at the statement. The panel still owns which tab is active and reports changes upward.
- [x] `components/workspace/workspace.tsx` — the left panel gets a `usePanelRef` handle and takes its full 64% while Visualize is showing, restoring the previous width on the way out; the editor buffer and the console's selected case are threaded into the tab.
- [x] `lib/visualizer/program.test.ts` / `trace.test.ts` / `types.test.ts`, and `lib/piston/client.test.ts` — the shim covers every annotation name the catalog's starters use, the preludes differ in exactly one line, the driver's output is read from its last line, outcomes are classified, the refusals happen before any lookup, the visualizer imports nothing that writes, `extraFiles` reach the job and the cache key, and `cache: false` is honoured.
- [x] **Gate:** `pnpm test` (221 tests), `pnpm lint`, `pnpm typecheck` clean; the running dev server serves the frame, the bundle and the stylesheet; and the whole path was driven headlessly — Chrome, no display — against the running app: `POST /api/visualize` for `two-sum` case 1 (16 steps, 28 kB, ~200 ms), the trace posted into the frame, `dsa:rendered` back, then ten `Next` clicks and three `Back` clicks with the code pane, the heap and the step counter all moving (`Step 1 of 15` → `Done running (15 steps)`), the heap growing from 2 tables to 20, and no page errors. Two things that probe settled are worth keeping: the frame's `ready` can arrive before a parent's listener exists (so the panel also sends on the iframe's `load` event), and the gutter arrow that marks the executing line is animated over ~450 ms by d3, so a headless reader that never produces animation frames sees it one step stale while the library's own `curLineNumber` is already correct. In a real browser the arrow tracks the line.

### 8.5 Checks, docs, and the phase gate

- [x] `scripts/visualizer-check.mts` (`pnpm visualizer:check`, `--slug` supported) — traces every seeded problem's visible cases with its reference solution and requires: ≥ 5 steps, ≤ the step cap, ≤ 6 KB per step, every step pointing at a line the code pane has, and **unchanged `submissions` / `problem_progress` / `drafts` counts**.
- [x] `package.json` — `lib/visualizer/*.test.ts` in the `test` glob, plus `visualizer:sync` and `visualizer:check`.
- [x] Docs: this file, `docs/plan/README.md`, `docs/plan/00-scope.md`, `docs/plan/07-neetcode-150.md`, `README.md`, `vendor/python-tutor/README.md`, `.env.example`.

### 8.6 Hide the runner scaffolding

The tracer still runs the full program. The picture does not: the code pane is the editor buffer, and the Global frame does not list the prelude or the call.

- [x] `lib/visualizer/present.ts` — drop steps outside the buffer's line span, shift the rest onto the buffer's own lines, strip prelude and harness globals, and keep a harness-only exception pointed at the last buffer line.
- [x] `buildTraceProgram` returns that span. `visualizeTrace` summarizes the raw trace first, so a step limit or an error on the harness call is not lost, then presents the trace the frame draws.
- [x] The code pane in `pnpm visualizer:check` is the solution that was traced, and every remaining step lands on a line of it.

## Phase gate

- [x] `pnpm visualizer:check` — 167 traces across 60 seeded problems, worst payload 216 kB (4385 B/step on `word-search-ii`), worst time ~200 ms, nothing written
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — 221 tests, build lists `/api/visualize`
- [x] `pnpm piston:check` — 247 checks, after the output-limit fixture was derived from the cap
- [x] `pnpm problems:check` — 1127 checks, unaffected
- [x] A UI pass in the browser: driven by Chrome over the DevTools protocol against the production build at 1600×1000 — the rail sits at 44% at load, clamps at its 26% minimum and moves back under the divider's arrow keys, widens to 64% while Visualize is open and returns to the width it had on the way out; then the tab's own flow — click Visualize, wait for the frame (15 code rows, both gutter arrows, `Step 1 of 17`, no frame error), five `Next` clicks (`Step 6 of 17`, heap tables 2 → 16), the status strip reading `18 steps` and `visualizing is not submitting`, pop-out reopening **at step 6**, and closing back to the inline frame with no page errors.
- [x] Fixed after that pass: `maxSize={64}` was a *number*, and this API reads numbers as pixels, so the left rail was pinned to 64 px — the editor swallowed the window and the divider had nothing to drag. The constant is a percentage string again, and the comment says why. Verified in the same browser run, before (left 64 px / 4%, unmovable) and after (44%, movable, 64% while visualizing).

## Out of scope

Theming the visualizer (it keeps its own light palette inside a light frame; the
app is dark-only), tracing the hidden suite, multiple methods or custom classes
per problem, saving or sharing a trace, server-side trace caching, and any
change to the judging path's semantics. Phase 7 resumes when this phase closes.
