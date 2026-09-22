import type { LanguageId } from "@/lib/languages";

/**
 * Everything about the execution engine that is configuration rather than logic.
 *
 * `PISTON_URL` is the switch that turns real execution on: unset, the app falls
 * back to the deterministic mock runner and the workspace says so. See
 * `lib/runner/index.ts` for that decision.
 */

/** Where the engine listens. The compose service binds this to loopback only. */
export const PISTON_URL = process.env.PISTON_URL ?? "http://127.0.0.1:2001";

/**
 * The runtime version to ask for, per language.
 *
 * Pinned rather than ranged so a rerun of a submission is the run that was
 * reported. `pnpm piston:check` fails when the engine offers something else —
 * which is the honest outcome, since a different Python is a different judge.
 */
export const RUNTIMES: Partial<Record<LanguageId, string>> = {
  python: "3.12.0",
};

/** The pinned version for a language, or a message saying there is none. */
export function runtimeFor(id: LanguageId): string {
  const version = RUNTIMES[id];
  if (!version) {
    throw new Error(
      `No execution runtime is configured for ${id}. ` +
        `Only languages in lib/languages.ts LANGUAGES can run.`,
    );
  }
  return version;
}

/** Per-case limits, in the units Piston wants (ms, bytes). */
export const LIMITS = {
  /** A single case's CPU budget — what the console reports as the time limit. */
  runMs: numberFromEnv("PISTON_RUN_TIMEOUT_MS", 2000),
  /** The ceiling for the compile stage. Python has none, so it is only a report. */
  compileMs: numberFromEnv("PISTON_COMPILE_TIMEOUT_MS", 20_000),
  /** Per-case memory ceiling. */
  memoryBytes: numberFromEnv("PISTON_RUN_MEMORY_MB", 256) * 1024 * 1024,
  /** Headroom over the run stage, so a slow engine reports a timeout, not a reset. */
  overheadMs: 3000,
  /** How many cases may be in flight at the engine at once. */
  concurrency: numberFromEnv("PISTON_MAX_CONCURRENCY", 4),
  /** Cases beyond the running ones that may wait before a run is refused. */
  queueLimit: numberFromEnv("PISTON_QUEUE_LIMIT", 64),
} as const;

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** How long one case's HTTP request may take, engine round trip included. */
export const CASE_DEADLINE_MS = LIMITS.runMs + LIMITS.overheadMs;

/**
 * The engine's own ceilings, from the compose service.
 *
 * The app cannot ask for more than these: Piston answers 400 to a request above
 * them, which would turn a slow machine into an unreadable error. Keep in sync
 * with `docker-compose.dev.yml` — `PISTON_OUTPUT_MAX_SIZE` there is mirrored in
 * `lib/piston/map.ts`.
 */
export const ENGINE_RUN_CEILING_MS = 5_000;

/**
 * The engine's stdout cap, from the same service (`PISTON_OUTPUT_MAX_SIZE`).
 *
 * Raised into the megabytes because a visualizer trace is a megabyte of JSON on
 * stdout. A job that prints past it is killed by the sandbox, which is why the
 * tracer budgets its own payload — and why this number appears in the message
 * when that protection is not enough.
 */
export const ENGINE_OUTPUT_LIMIT = 4_194_304;

/**
 * The visualizer's budget, which is a different job from judging one case.
 *
 * A trace is not a verdict: nobody is waiting on milliseconds, but every step
 * is bytes on stdout — the engine kills a job that prints past its buffer — and
 * bytes to the browser. So a trace gets a longer wall budget than a case, and a
 * hard ceiling on both steps and payload. 500 steps is roughly 1–1.5 MB and
 * well under a second for a typical solution; a loop that needs more stops with
 * a step-limit marker rather than an aborted job.
 */
export const TRACE_LIMITS = {
  /** Steps to trace before stopping. Python Tutor's own limit is 1000. */
  maxSteps: Math.floor(numberFromEnv("PISTON_TRACE_MAX_STEPS", 500)),
  /** The trace payload, in bytes, the driver will print to stdout. */
  maxBytes: Math.floor(numberFromEnv("PISTON_TRACE_MAX_BYTES", 3_500_000)),
  /** Tracing is slower than running: bdb pays per line. Clamped to the engine. */
  runMs: Math.min(
    Math.floor(numberFromEnv("PISTON_TRACE_RUN_TIMEOUT_MS", 4_000)),
    ENGINE_RUN_CEILING_MS,
  ),
} as const;

/** How long one trace's HTTP request may take, engine round trip included. */
export const TRACE_DEADLINE_MS = TRACE_LIMITS.runMs + LIMITS.overheadMs;
