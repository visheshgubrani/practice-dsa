<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DSA Software

A personal LeetCode-shaped DSA workbench: a dashboard, the problem list, statement / notes / AI chat, Monaco, Run / Submit, and a minimizeable console. The tutor gives hints and debug help when you get stuck.

One user. No auth, no accounts. Progress is for this local install. Package manager: **pnpm**. Stack: Next 16 + React 19, Drizzle + local Postgres, Piston for judging, AI SDK + OpenAI (`gpt-6-luna`) for the tutor and the short daily coach note (scripted demo stream if `OPENAI_API_KEY` is unset; the coach falls back to its deterministic note). UI: shadcn **base-nova** (Base UI) in `components/ui`.

Python is the only executable language today. More languages later means a harness plus one entry in `lib/languages.ts` `LANGUAGES` — the Postgres `language` enum already has cpp/java/javascript. Do not offer a language in the picker until it can run.

## Scope

Do: trustworthy judging, durable local practice, catalog growth, a hint-first tutor, personal notes, manually enrolled FSRS reviews, the dashboard that shows the practice, and a deterministic daily coach with one short LLM note.

Do not, unless the current phase file explicitly opens it: hosting, auth, Judge0, other-language harnesses, linked lists / trees / custom classes / in-place output contracts, AI SDK migration, a free-form dashboard coach chat, persisted plans, notifications/goals/badges, or Submit batching (only if Phase 4's latency checkpoint makes it a **separate** milestone).

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
- Personal Notes start empty; catalog guidance stays read-only in Solution. AI drafts are previews: only explicit field application uses the normal notes autosave path. They share the tutor's hidden-case disclosure rules.
- Review enrollment is explicit, including unsolved problems. Ratings are self-assessments and write only review cards/logs; they never mark solved or contribute a practice day. Retry the entire captured rating payload with its original request ID.
- Review (`?review=1`) starts on Description with fresh starter code and explicit Notes/Solution reveals; it takes precedence over Revise (`?revise=1`), which starts from accepted code. Both code buffers are temporary and never write ordinary draft/recovery keys. Notes stay durable in every mode.
- A solved Review Submit is a revision; an unsolved Review Submit can create a first solve through verified Piston judging. Revise Submits always write history only. Do not infer a rating from either the judge or the AI.
- **The daily coach is read-only.** `/api/coach/plan` composes public summaries, progress, the review queue, activity, and today's worked counts; it never calls `getProblem` and writes nothing. `/api/coach/note` accepts only enums, counts, and item kinds/difficulties — no titles, slugs, statements, source, cases, notes, or free text — and writes nothing.
- **The deterministic planner owns the plan.** The LLM writes one short note; it never chooses, reorders, adds, or removes items, and never chooses a rating. The review slice is FSRS order, not the whole backlog; new work is attempted-first/roadmap-order, easy/medium only, and hard problems are never auto-picked.
- **Completing the plan does not create more work.** Reviews done are distinct cards rated inside the browser-local day; new done is a distinct first solve (`problem_progress.solved_at`) inside that day. Targets use `dueAtStart = dueNow + reviewsDone` and only shrink as work lands. No plan row is persisted. `dsa.coach.*` browser keys are a time preference and a note cache, never practice state and never imported by the `dsa.*` recovery scan.

## Architecture

```
app/(study)/layout.tsx       shared shell: collapsible sidebar, queue badge, cookie-backed state
app/(study)/page.tsx         dashboard: today's plan, progress summary, streak+calendar, topics
app/(study)/problems/page.tsx  problem list (table, ?topic= filter)
app/(study)/reviews/page.tsx   reviews hub: Due / Upcoming / Paused, search, pause/resume
app/problems/[slug]          workspace; ?review=1 recall, ?revise=1 accepted-code pass
app/api/run                  Run / Submit
app/api/chat                 tutor
app/api/notes/generate       disclosure-safe AI note preview; no persistence writes
app/api/reviews              queue (due/upcoming/paused), pause/resume, idempotent ratings
app/api/coach/plan           deterministic today plan; read-only
app/api/coach/note           one bounded coach note over structured plan facts; no writes
components/shell/            study shell, sidebar nav, page header/body chrome
components/dashboard/        today's plan card, progress summary, streak calendar, heatmap, topic rows
components/reviews/          reviews hub, queue summary, review rows and their per-tab actions
components/problems/         list table, difficulty badge, revise button
components/workspace/        header, problem panel, editor, console, chat
lib/problems                 public types (UI); authoring modules + catalog are seed-only
lib/problems/topics.ts       roadmap groups; the topic a seeded problem gets (seed-only)
lib/db/queries/problems.ts   catalog reads from Postgres
lib/db/queries/dashboard.ts  activity days, progress statuses, history totals
lib/db/queries/coach.ts      today's first solves and distinct review ratings (read-only)
lib/db/schema/               Drizzle tables
lib/practice/days.ts         local day keys and offsets (client-safe, no db import)
lib/progress/                streak, heatmap grid, month labels, solved rollups (pure)
lib/practice/notes.ts         client-safe five-field personal notes and apply guards
lib/notes/                   AI draft request/response types and browser client
lib/reviews/                 client DTOs, dates, queue view logic, due-boundary timer, FSRS adapter
lib/coach/                   pure daily planner, copy, fingerprint, note contract, client/cache
lib/hooks/use-review-queue.ts  the one client review-queue loader (badge, plan footer, page)
lib/hooks/use-coach-plan.ts    the one client plan loader (day, budget, refresh triggers)
lib/hooks/use-coach-note.ts    fallback-first LLM note loader; localStorage cache
lib/db/queries/reviews.ts    atomic review card/log persistence; no practice writes
lib/runner/                  Piston vs mock seam
lib/piston/                  engine client; Python 3.12.0 pinned in lib/piston/config.ts
lib/harness/python.ts        wraps the editor buffer into a runnable program
lib/ai/prompts.ts            hint-first tutor instructions; bound code context
lib/ai/attempt.ts            computed attempt state (which methods exist, bodies empty)
lib/ai/coach-prompt.ts       bounded coach-note prompt over structured plan facts
lib/ai/coach-note.ts         validated coach-note generation; no persistence
lib/languages.ts             executable languages (Python only) vs stored enum
```

`PISTON_URL` turns real judging on. `RUNNER_KIND=mock` forces the deterministic mock even with an engine configured. An unreachable engine is a hard failure, not a silent fallback to mock.

A practice day is a verified Piston Submit and nothing else. `submissions.day` is stamped at insert time from the client's `utcOffsetMinutes`; do not re-derive a day from a timezone at read time. A revise Submit (`revision: true`) writes history and never touches `problem_progress` or the stored draft.

The daily coach is a plan, not a quota. The deterministic planner owns the day's review slice and one new/continued problem; the LLM only writes a short note. Reviews are a slice of the due queue in FSRS order; new work is attempted-first, roadmap order, easy/medium only, never a hard auto-pick. Completing the plan does not create more work: today's distinct ratings and first solves count against fixed targets. The plan uses the browser's day; the note request carries no titles or free text.

The tutor is a friendly coding buddy, not a solution printer. It hints concretely: name the tool (hashmap, stack, two loops) and say what it does for this problem, teaching the idea behind the step rather than issuing a chore. Stay with the learner's approach — a working nested loop stays the plan, and a tradeoff gets named once instead of used to switch them. Pace replies for a beginner: one clear focus, one to three short chunks, at most one question, no closing task. Confusion shrinks the example; it does not repeat the hint or change the algorithm. A direct request ("what exact line next?") gets a direct answer including that line; the complete implementation or detailed walkthrough of the remaining algorithm waits for an explicit full-solution request, and "be specific" or "I'm stuck" is not one. Directional questions ("what now?", "is this right?") are answered with the purpose of the piece, not with code. Prints, incomplete code, and repeated runs inform debugging when relevant; they never change the lesson. The prompt carries an advisory attempt state (a non-empty body is not proof a method is done) so it does not ask for work the buffer already shows. Do not invent constraints, official examples, or judge cases in prompts. Chat actions live in `lib/ai/prompts.ts` (`PRIMARY_ACTIONS`, `MORE_ACTIONS`), their availability rule in `lib/chat/actions.ts` (Make it concrete requires a completed, nonempty reply; partial or failed streams do not qualify), and the row renders in `components/workspace/chat-composer.tsx`.

## Conventions

- TypeScript strict. Tests are `*.test.ts` next to the module (`pnpm test` via `tsx --test`).
- Hooks live in `lib/hooks/`, imported as `@/lib/hooks/...` (the shadcn `hooks` alias in `components.json` points there, so generated hooks land beside the existing ones).
- Study-page typography is a scale, not a per-screen decision: `text-page` (32px) for a page title, `text-section` (22px) for a section heading, 16px body and navigation, `text-support` (14px) as the floor. Counts and dates use `tabular-nums`; amber is for the page's primary action and the selected nav item.
- `PageProps` / `LayoutProps` come from `next typegen` (`next dev` or `next build`).
- Compose existing shadcn components; semantic tokens; `cn()`; no new UI libraries.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Also `pnpm problems:check` and `pnpm piston:check` when the current phase requires them.
