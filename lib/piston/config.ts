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
