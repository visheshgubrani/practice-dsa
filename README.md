# DSA Software

A personal, AI-native workbench for algorithm practice: a problem list, a
LeetCode-shaped workspace (statement / solution notes / AI chat on the left,
Monaco on the right, a minimizeable console below), Run and Submit buttons, and
a streaming tutor that sees the problem and your current code.

## Run it

```bash
pnpm install
pnpm db:up                   # Postgres + the code-execution engine
pnpm db:migrate && pnpm db:seed
pnpm piston:runtimes         # install Python into the engine (once)
docker compose -f docker-compose.dev.yml restart piston
cp .env.example .env.local   # add PISTON_URL to turn real judging on
pnpm dev
```

- `/` — the problem list (search, difficulty and tag filters, solved progress)
- `/problems/two-sum` — the workspace

`pnpm dev` and `pnpm build` first run `scripts/sync-monaco.mjs`, which copies
Monaco's AMD build out of `node_modules` into `public/monaco/vs` (~24 MB,
gitignored). The editor loads from there, so it works offline and stays pinned
to the installed `monaco-editor` version — no bundler plugin, which matters
because Next 16 builds with Turbopack.

## Database (dev)

The schema lives in `lib/db/schema/` and runs on a local Postgres from
`docker-compose.dev.yml`. **The app reads the problem catalog from it on every
page load**, through `lib/db/queries/problems.ts`; if the container is stopped the
app says so and names the fix instead of rendering the workbench.

```bash
pnpm db:up         # postgres:18-alpine on 127.0.0.1:5441 (5432-5440 are taken on this machine)
pnpm db:migrate    # apply everything in drizzle/, through lib/db/migrate.ts
pnpm db:seed       # copy lib/problems/catalog.ts into the catalog tables
pnpm db:studio     # browse the result
pnpm db:down       # stop it (add -v to that command to wipe the data)
```

Migrations are generated from the schema, never hand-written:

```bash
pnpm db:generate   # diff lib/db/schema/* against drizzle/ and write SQL
```

`DATABASE_URL` falls back to `postgresql://postgres:postgres@127.0.0.1:5441/dsa_software`
(see `lib/db/env.ts`), so the defaults need no `.env.local`. Compose substitutes
from `.env`, not `.env.local` — a different port has to be changed in both
places.

Editing a module under `lib/problems/` changes nothing until `pnpm db:seed` runs:
the catalog is seed input, not the app's data source. The catalog's
order is the `problems.position` column, also written by the seed.

| Table | Holds |
| --- | --- |
| `problems`, `problem_examples`, `problem_testcases`, `problem_starter_code` | the catalog — read by the app, seeded from `lib/problems/catalog.ts` |
| `drafts` | the editor buffer per problem and language |
| `problem_progress` | verified status, preferred language, and your own notes |
| `legacy_accepted` | imported pre-Postgres accepted-code snapshots (never verified solved) |
| `submissions`, `submission_cases` | every Run and Submit, plus each reported case |
| `chat_threads`, `chat_messages` | tutor transcripts per problem, including code snapshot and linked submission |

Practice state is **Postgres**. Browser `dsa.*` keys are a recovery copy for
unsaved edits and a one-time import source; they are not the store. Stopping
the container with `pnpm db:down` keeps the volume; `pnpm db:down` **with
`-v`** wipes drafts, notes, progress, and history. Do not do that unless you
mean to.

### Backup and restore

The data lives in the `postgres_data` volume from `docker-compose.dev.yml`.
Restarting Postgres or the app does not replace it. A dump does:

```bash
# custom-format dump (safe to keep next to the repo; gitignored if you name it *.dump)
docker compose -f docker-compose.dev.yml exec -T postgres \
  pg_dump -U postgres -Fc dsa_software > dsa-software.dump

# restore into the running container (replaces database objects, not the volume)
docker compose -f docker-compose.dev.yml exec -T postgres \
  pg_restore -U postgres -d dsa_software --clean --if-exists --no-owner \
  < dsa-software.dump
```

`pg_restore --clean` drops and recreates the dumped objects inside
`dsa_software`. It does not run `db:down -v`. After a restore, `pnpm db:migrate`
is only needed if the dump is from an older schema.

## Configuration

Everything is optional; the app is fully usable without any of it.
See `.env.example`.

| Variable | Effect when set |
| --- | --- |
| `DEEPSEEK_API_KEY` | The AI chat talks to DeepSeek. Without it, a scripted tutor streams through the same protocol and the pane shows a `demo` badge. |
| `PISTON_URL` | The execution engine. **This is what turns real judging on**; unset, Run and Submit are answered by the mock and the console says `simulated`. Defaults to `http://127.0.0.1:2001`. |
| `RUNNER_KIND` | `mock` forces simulated verdicts even with an engine configured; anything else defers to `PISTON_URL`. |
| `PISTON_RUN_TIMEOUT_MS` / `PISTON_RUN_MEMORY_MB` / `PISTON_MAX_CONCURRENCY` | Per-case limits (defaults 2000 ms, 256 MB, 4 at a time). The compose service advertises a higher ceiling than the runner asks for. |
| `PISTON_TRACE_MAX_STEPS` / `PISTON_TRACE_MAX_BYTES` / `PISTON_TRACE_RUN_TIMEOUT_MS` | The visualizer's budget (defaults 500 steps, 3.5 MB, 4000 ms). A bigger byte budget also needs `PISTON_OUTPUT_MAX_SIZE` raised in `docker-compose.dev.yml` and the piston service recreated. |
| `DATABASE_URL` | Where `pnpm db:*` points. Defaults to the compose database above. |
| `NEXT_PUBLIC_MONACO_VS_URL` | Load Monaco from elsewhere (e.g. a CDN) instead of the self-hosted copy. |

## Code execution

Judging is real: [Piston](https://github.com/engineer-man/piston) runs the
submission in an Isolate sandbox inside its own container, and the console shows
the verdict the engine produced along with the CPU time and peak memory.

```bash
pnpm db:up                # starts postgres and piston (127.0.0.1:2001)
pnpm piston:runtimes      # install/verify the runtimes; prints the restart command
pnpm piston:check         # run reference solutions through the whole judging path
pnpm piston:logs          # what the engine is doing
```

Three things about it are worth knowing:

- **Runtimes are not in the image.** They are downloaded into the `piston_data`
  volume on demand, and the API reads them once at start-up — which is why
  `pnpm piston:runtimes` prints a `docker compose restart piston` to run after it.
  `pnpm piston:check` is what confirms the versions actually match
  `lib/piston/config.ts`.
- **The engine needs `privileged: true`.** Isolate sandboxes each job with its own
  namespaces and cgroup; that is also why the port is bound to loopback. Piston
  requires the host to run cgroup v2 with cgroup v1 disabled (Fedora 44 satisfies
  this), which is the constraint that ruled Judge0 out.
- **The editor holds a bare function, and Piston runs programs.** The gap is
  closed by `lib/harness/python.ts`, which wraps the user's source — verbatim,
  never rewritten — in a prelude and a harness that reads the case's arguments
  from stdin, calls `Solution.<name>`, and prints the result as JSON. One
  `ProblemSignature` per problem drives the whole thing, so a new problem is a
  data change rather than new plumbing.

Python is currently the only language with a harness and the only one the picker
offers. The other three remain in the database enum, and a row written for one of
them is still readable — adding a language back means writing its harness and one
entry in `lib/languages.ts`.

## Dry runs you can step through

The **Visualize** tab in the workspace runs the selected visible case and draws
it: call stack, every list, dict and object as a box, arrows between them, and
prev / next / slider to move through the steps. It is the answer to "I read the
explanation and I still cannot see what the loop does".

```bash
pnpm visualizer:sync     # copy the vendored browser assets into public/vendor
pnpm visualizer:check    # trace every seeded problem's visible cases for real
```

Five things about it are worth knowing:

- **Nothing is submitted.** Visualizing writes no submission, no progress row and
  no draft, and it never marks a problem solved. `pnpm visualizer:check` asserts
  the row counts are unchanged.
- **One visible case only.** The case index is resolved against public problem
  content on the server, so the hidden suite is not reachable from the tab.
- **It runs where judging runs** — the same Piston sandbox and the same pinned
  Python 3.12.0, calling `Solution().<name>(*_args)` with the same JSON
  arguments. The traced program is exactly what the frame displays, so the
  highlighted line is never a lie; the only difference from Run is that the
  prelude's `from typing import *` is replaced by an inert annotation shim,
  because the tracer re-encodes every global at every step (48 KB per step
  against 2 KB — measured, and the reason the step budget exists).
- **It is [Python Tutor](https://pythontutor.com), vendored.** The tracer
  (`pg_logger.py`, `pg_encoder.py`) and the visualizer (`pytutor-embed.bundle.js`,
  `pytutor.css`) are MIT, © Philip J. Guo, kept verbatim under
  `vendor/python-tutor/` with their provenance and hashes. The upstream repository
  no longer resolves and its logger cannot run on Python 3.12 (`import imp`), so
  the vendored copy comes from a maintained mirror — see that directory's README.
- **A trace is megabytes, and the engine buffers stdout.** `PISTON_OUTPUT_MAX_SIZE`
  is therefore raised to 4 MiB in `docker-compose.dev.yml`, and the tracer budgets
  its own payload so an oversized trace shortens itself (or reports the step
  limit) rather than being killed. A stale compose file is reported in the panel
  with the exact fix.

## Authoring a problem

A new problem is a module under `lib/problems/`, then an entry in
`lib/problems/catalog.ts` (which is ordered by the NeetCode 150 roadmap). Catalog
edits take effect only after `pnpm db:seed`. Stay on the current argument kinds
and the return-value harness — no linked lists, trees, custom classes, or
in-place (`void`) contracts. Use larger stress cases only when they stay inside
the execution and output limits.

Problems on the [NeetCode 150 sheet](docs/catalog/README.md) come with tooling:

```bash
pnpm catalog:status                       # what is authored, what is left, what is still a draft
pnpm catalog:fetch --slug 3sum            # metadata, statement input, MIT reference + notes
pnpm catalog:scaffold --slug 3sum         # a draft module with TODO markers
pnpm problems:check --slug 3sum           # iterate on one problem
```

The scaffolder writes identity, signature, starter, reference, example
arguments, and a hidden-case battery. It never writes a statement, an
expectation, or a wrong answer: those carry `TODO(` markers, and a draft with a
marker cannot pass conformance or seed.

For each problem, in this order:

1. Original statement, precise constraints, signature, Python starter.
2. 2–3 visible cases with explanations, at least 8 hidden cases.
3. Cover minima, duplicates, negatives, ordering, and constraint boundaries.
   Empty inputs only when the contract allows them.
4. Reference solution, comparison policy, approach, complexity notes,
   `sourceUrl`.
5. `pnpm problems:check`. Review generated expectation candidates by hand.
   Never auto-replace a mismatch.
6. Add at least one plausible incorrect implementation the suite rejects:
   either in `lib/harness/fixtures.ts`, or as `rejection` on the problem module
   itself (what the scaffolder emits).
7. `pnpm db:seed`, `pnpm piston:check`, then practice it in the UI (fail a
   hidden case, then accept).

`pnpm problems:check` and seed refuse a catalog that skips those structural
steps. `pnpm piston:check` walks every seeded problem and fails if one has no
wrong-answer fixture.

## Current plan

Work is sequenced in [`docs/plan`](docs/plan/README.md). All currently planned
phases (1–8) are complete. Phase 7 closed with 104 of the 150 NeetCode problems
ready and seeded; 46 remain deferred with reasons. The catalog has 105 rows in
total because it also includes the out-of-sheet `search-insert-position`
problem. See [`docs/catalog/README.md`](docs/catalog/README.md).

## What is real and what is not

The notes below are the state after Phase 5 (persisted chats and contextual tutoring).

- **Durable (Postgres)**: the catalog, drafts, notes, preferred language,
  verified solved status, imported legacy snapshots, every Run/Submit plus
  its cases, and tutor conversations. Restarting the app or Postgres keeps that
  data. Only a successful **Piston Submit** marks a problem solved; a later
  failing Submit keeps the original `solvedAt`. Historical rows keep a catalog
  revision and are not rewritten on reseed. The first failing hidden case is
  revealed; hidden successes stay status-and-metrics. The tutor sees that same
  disclosed attempt, not the unrevealed hidden suite or the reference-solution
  source.
- **Browser recovery only**: `dsa.*` keys are a local copy of unsaved edits and
  the source for a one-time import. Import never overwrites Postgres and never
  turns a legacy accept into verified solved. If a save fails, the console
  still shows the verdict with a **not saved** state; reload does not claim
  durable progress.
- **Simulated only when asked for**: `lib/runner/mock.ts` never runs anything; it
  maps shapes of the submitted source onto verdicts. It answers when `PISTON_URL`
  is unset, or when `RUNNER_KIND=mock` asks for it, and the console labels those
  runs `simulated`. Mock rows are stored as history but excluded from genuine
  progress. Mark any submission with `force:wrong-answer`,
  `force:runtime-error`, or `force:tle` inside a comment to reach a state on
  demand. Without `DEEPSEEK_API_KEY`, the tutor streams a scripted demo answer
  through the same protocol.
- **Not built yet**: custom test input, and a light theme.

## Layout of the code

```
app/                 routes: list page, workspace page, /api/chat, /api/run, /api/practice, /api/submissions
components/ui/       shadcn components (base-nova preset, Base UI primitives)
components/problems/ problem list + difficulty badge
components/workspace/ header, problem panel, editor, console, history, chat
lib/                 problem types + seed data, languages, runner types, AI prompts, hooks
lib/ai/              tutor prompts and disclosed workspace context
lib/chat/            client-safe chat types and the server turn handler
lib/practice/        load/save recovery, import scan, serial write queues
lib/submissions/     client-safe history types and fetch helpers
lib/visualizer/      the dry run: trace program, driver, engine call, panel client
vendor/python-tutor/ the vendored Python Tutor tracer + visualizer (MIT), with its provenance
lib/harness/         the generated Python program: argument parsing, comparison, wrapping
lib/piston/          the engine client: runtimes, execute, caching, verdict mapping
lib/runner/          the seam: Piston runner, the deterministic mock, shared result types
lib/db/              drizzle schema, relations, client, queries, migrate + seed scripts
drizzle/             generated migrations (one folder each, with its snapshot)
scripts/sync-monaco.mjs    Monaco's AMD build into public/monaco/vs
scripts/sync-visualizer.mjs  the vendored visualizer's browser assets into public/vendor
scripts/piston-runtimes.mjs  install/verify the engine's language runtimes
scripts/piston-check.mts     reference solutions through the whole judging path
scripts/piston-latency.mts   Submit wall-time checkpoint (largest suite, cache bypassed)
scripts/visualizer-check.mts every seeded problem's visible cases, traced for real
scripts/chat-smoke.mts       disclosed tutor payload; live DeepSeek when a key is set
docker-compose.dev.yml
```

## Checks

```bash
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # unit + Postgres persistence checks next to the code they cover
pnpm problems:check   # catalog conformance, no Docker
pnpm build            # production build
pnpm piston:check     # needs the engine: reference + broken solutions, seeded catalog
pnpm piston:latency   # Phase 4 Submit wall-time checkpoint (cache bypassed)
pnpm visualizer:check # needs the engine: a trace per visible case, and no rows written
pnpm chat:smoke       # disclosed tutor payload; live DeepSeek when a key is set
```

Note: `PageProps` route types are generated by `next dev`, `next build`, or
`next typegen` — run one of those before a bare `tsc`.
