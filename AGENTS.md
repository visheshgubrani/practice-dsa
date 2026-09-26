<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DSA Software

A personal LeetCode-shaped DSA workbench: a dashboard, the problem list, statement / notes / AI chat, Monaco, Run / Submit, and a minimizeable console. The tutor gives hints and debug help when you get stuck.

One user. No auth, no accounts. Progress is for this local install. Package manager: **pnpm**. Stack: Next 16 + React 19, Drizzle + local Postgres, Piston for judging, AI SDK + DeepSeek for the tutor (scripted demo stream if `DEEPSEEK_API_KEY` is unset). UI: shadcn **base-nova** (Base UI) in `components/ui`.

Python is the only executable language today. More languages later means a harness plus one entry in `lib/languages.ts` `LANGUAGES` — the Postgres `language` enum already has cpp/java/javascript. Do not offer a language in the picker until it can run.

## Scope

Do: trustworthy judging, durable local practice, catalog growth, a hint-first tutor, and the dashboard that shows the practice.

Do not, unless the current phase file explicitly opens it: hosting, auth, Judge0, other-language harnesses, linked lists / trees / custom classes / in-place output contracts, AI SDK migration, or Submit batching (only if Phase 4's latency checkpoint makes it a **separate** milestone).

## How to work

Read `docs/plan/README.md` and the named current-phase file **before** changing code. Execute only the next unchecked work unit. Do not skip units or start a later phase.

After a unit lands, tick its boxes in the phase file. After the phase gate, tick the phase in `docs/plan/README.md` and move **Current phase**. Invariants live in `docs/plan/00-scope.md`.

## Hard constraints

- Never reset the database. Preserve problem IDs and practice data. Additive Drizzle migrations only (`pnpm db:generate` — never hand-write SQL).
- `@/lib/problems` is the shared **public** interface. Do not re-export reference solutions or the full catalog into client-facing imports.
- `getProblem` returns public content and visible cases only. Judging uses a separate server path (`getProblemForJudging` once Phase 2 lands).
- Only a successful Piston Submit marks a problem solved. Run and mock never qualify. Missing or invalid judging data is an application error, never acceptance.
- Historical submission rows are snapshots. Do not rewrite them when the catalog changes.
- Reveal the first failing hidden case (input, expected, output, diagnostics). Successful hidden cases are status-and-metrics only. Apply the same disclosure to the console, history, and AI context.
- Do not send the unrevealed hidden suite or reference-solution **source** to the tutor. Approach notes are fine.
- User source is wrapped, never rewritten (`lib/harness/python.ts`). A new problem is a data/signature change, not new plumbing. A design problem that is one class plus a script of methods is a `signature.calls` entry on that same path. Do not grow a second harness for a problem that fits it. A custom node class, a design problem whose methods return floats, or an in-place `void` function still needs its own phase. An ordinary `double` return uses the `tolerance` compare mode.
- Catalog edits in `lib/problems*` take effect only after `pnpm db:seed`. The app reads Postgres on every page load.

## Architecture

```
app/page.tsx                 dashboard: stats, streak calendar, topics
app/problems/page.tsx        problem list (table, filters)
app/problems/[slug]          workspace; ?revise=1 is a revise session
app/api/run                  Run / Submit
app/api/chat                 tutor
components/dashboard/        heatmap, streak card, stat card, topic section
components/problems/         list table, catalog header, revise button
components/workspace/        header, problem panel, editor, console, chat
lib/problems                 public types (UI); authoring modules + catalog are seed-only
lib/problems/topics.ts       roadmap groups; the topic a seeded problem gets (seed-only)
lib/db/queries/problems.ts   catalog reads from Postgres
lib/db/queries/dashboard.ts  activity days, progress statuses, history totals
lib/db/schema/               Drizzle tables
lib/practice/days.ts         local day keys and offsets (client-safe, no db import)
lib/progress/                streak, heatmap grid, solved rollups (pure)
lib/runner/                  Piston vs mock seam
lib/piston/                  engine client; Python 3.12.0 pinned in lib/piston/config.ts
lib/harness/python.ts        wraps the editor buffer into a runnable program
lib/ai/prompts.ts            hint-first tutor instructions; bound code context
lib/languages.ts             executable languages (Python only) vs stored enum
```

`PISTON_URL` turns real judging on. `RUNNER_KIND=mock` forces the deterministic mock even with an engine configured. An unreachable engine is a hard failure, not a silent fallback to mock.

A practice day is a verified Piston Submit and nothing else. `submissions.day` is stamped at insert time from the client's `utcOffsetMinutes`; do not re-derive a day from a timezone at read time. A revise Submit (`revision: true`) writes history and never touches `problem_progress` or the stored draft.

The tutor is a guide, not a solution printer. Full solutions only when the user explicitly asks. Do not invent constraints, official examples, or judge cases in prompts.

## Conventions

- TypeScript strict. Tests are `*.test.ts` next to the module (`pnpm test` via `tsx --test`).
- Hooks live in `lib/hooks/`, imported as `@/lib/hooks/...` (the shadcn `hooks` alias in `components.json` is unused).
- `PageProps` / `LayoutProps` come from `next typegen` (`next dev` or `next build`).
- Compose existing shadcn components; semantic tokens; `cn()`; no new UI libraries.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Also `pnpm problems:check` and `pnpm piston:check` when the current phase requires them.
