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
| `drafts` | the editor buffer per problem and language (`dsa.code.*`) |
| `problem_progress` | status, preferred language and your own notes (`dsa.progress`, `dsa.language`, `dsa.notes`) |
| `submissions`, `submission_cases` | every Run and Submit, plus each reported case |
| `chat_threads`, `chat_messages` | tutor transcripts, each turn carrying the code and run it was asked about |

## Configuration

Everything is optional; the app is fully usable without any of it.
See `.env.example`.

| Variable | Effect when set |
| --- | --- |
| `DEEPSEEK_API_KEY` | The AI chat talks to DeepSeek. Without it, a scripted tutor streams through the same protocol and the pane shows a `demo` badge. |
| `PISTON_URL` | The execution engine. **This is what turns real judging on**; unset, Run and Submit are answered by the mock and the console says `simulated`. Defaults to `http://127.0.0.1:2001`. |
| `RUNNER_KIND` | `mock` forces simulated verdicts even with an engine configured; anything else defers to `PISTON_URL`. |
| `PISTON_RUN_TIMEOUT_MS` / `PISTON_RUN_MEMORY_MB` / `PISTON_MAX_CONCURRENCY` | Per-case limits (defaults 2000 ms, 256 MB, 4 at a time). The compose service advertises a higher ceiling than the runner asks for. |
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

## Current plan

Work is sequenced in [`docs/plan`](docs/plan/README.md). Execute one phase at a
time and tick boxes there as they land. The order is trustworthy judging, then
durable persistence, then a larger catalog, then a durable tutor.

## What is real and what is not

The notes below are the state after Phase 1 (trustworthy judging). Drafts,
progress, and chat transcripts are still browser-side; Submit still judges
visible cases only.

- **Real**: routing, layout, editor, code persistence, notes and progress
  persistence in `localStorage`, the chat transport and streaming UI, the
  run/submit flow and every console state — and **code execution**, through
  Piston. The problem catalog — statement, examples, visible testcases, starter
  templates, reference notes — comes from Postgres. Only a successful Piston
  Submit marks a problem solved. Debug prints do not corrupt comparison. Two Sum
  accepts either index order; Group Anagrams allows group/member permutations.
- **Simulated only when asked for**: `lib/runner/mock.ts` never runs anything; it
  maps shapes of the submitted source onto verdicts. It answers when `PISTON_URL`
  is unset, or when `RUNNER_KIND=mock` asks for it, and the console labels those
  runs `simulated`. Mark any submission with `force:wrong-answer`,
  `force:runtime-error`, or `force:tle` inside a comment to reach a state on
  demand.
- **Still in the browser**: drafts, progress, accepted solutions and notes live in
  `localStorage`, so they do not follow you to another device; `submissions`,
  `submission_cases` and the chat tables are migrated but nothing writes to them
  yet — a run is judged and returned, not stored.
- **Not built yet**: persisting drafts, progress, runs and chat transcripts,
  hidden testcases for `Submit` (every case is currently a visible sample),
  problem import, custom test input, and a light theme.

## Layout of the code

```
app/                 routes: list page, workspace page, /api/chat, /api/run
components/ui/       shadcn components (base-nova preset, Base UI primitives)
components/problems/ problem list + difficulty badge
components/workspace/ header, problem panel, editor, console, chat
lib/                 problem types + seed data, languages, runner types, AI prompts, hooks
lib/harness/         the generated Python program: argument parsing, comparison, wrapping
lib/piston/          the engine client: runtimes, execute, caching, verdict mapping
lib/runner/          the seam: Piston runner, the deterministic mock, shared result types
lib/db/              drizzle schema, relations, client, queries, migrate + seed scripts
drizzle/             generated migrations (one folder each, with its snapshot)
scripts/sync-monaco.mjs    Monaco's AMD build into public/monaco/vs
scripts/piston-runtimes.mjs  install/verify the engine's language runtimes
scripts/piston-check.mts     reference solutions through the whole judging path
docker-compose.dev.yml
```

## Checks

```bash
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm test          # unit checks next to the code they cover
pnpm build         # production build
pnpm piston:check  # needs the engine: reference + broken solutions, all four problems
```

Note: `PageProps` route types are generated by `next dev`, `next build`, or
`next typegen` — run one of those before a bare `tsc`.
