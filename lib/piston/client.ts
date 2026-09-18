import { createHash } from "node:crypto";

import { getLanguage, type LanguageId } from "@/lib/languages";
import { PISTON_URL, RUNTIMES, runtimeFor } from "@/lib/piston/config";
import {
  executeResponseSchema,
  errorSchema,
  runtimeSchema,
  type ExecuteResponse,
  type Runtime,
} from "@/lib/piston/types";
import { RunnerError } from "@/lib/runner/errors";

/**
 * The HTTP client for the execution engine.
 *
 * Three things make it more than a `fetch` wrapper:
 *
 *   - **Version selection.** Piston is asked which runtimes it actually has, and
 *     its own version string is sent back. The app never guesses a version, so
 *     an engine whose Python moved from 3.12.0 to 3.12.1 keeps working instead
 *     of failing with a 400.
 *   - **Caching.** Repeat runs of the same program against the same input are
 *     answered from memory. A "Run" press recompiles nothing; this is most of
 *     the difference between a snappy console and a slow one.
 *   - **One-at-a-time discipline.** A submission fires several cases at once, so
 *     the client owns the concurrency limit rather than the caller.
 */

type ExecuteRequest = {
  /** `lib/languages.ts` id, used to pick the runtime and its pinned version. */
  language: LanguageId;
  /** The whole file to run — prelude, user source and harness together. */
  source: string;
  fileName: string;
  stdin: string;
  runMs: number;
  compileMs: number;
  memoryBytes: number;
};

/** What one case is: input to a program, and what running it produced. */
export type EngineResult = {
  response: ExecuteResponse;
  /** True when this response was served from the cache. */
  cached: boolean;
};

const RUNTIME_TTL_MS = 60_000;

/**
 * Per-language versions, read from the engine and refreshed rarely.
 *
 * Keyed by the name the engine uses, because that is what it answers with.
 */
let runtimeCache: { at: number; runtimes: Runtime[] } | null = null;

/** Discards the runtime list; used by the check script after an install. */
export function forgetRuntimes(): void {
  runtimeCache = null;
}

export async function listRuntimes(): Promise<Runtime[]> {
  if (runtimeCache && Date.now() - runtimeCache.at < RUNTIME_TTL_MS) {
    return runtimeCache.runtimes;
  }

  let response: Response;
  try {
    response = await fetch(`${PISTON_URL}/api/v2/runtimes`, {
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    throw new RunnerError(
      `The execution engine is not reachable at ${PISTON_URL} (${
        error instanceof Error ? error.message : "network error"
      }). Start it with: pnpm piston:up`,
    );
  }

  if (!response.ok) {
    throw new RunnerError(
      `The execution engine answered ${response.status} for its runtime list.`,
    );
  }

  const parsed = runtimeSchema.array().safeParse(await response.json());
  if (!parsed.success) {
    throw new RunnerError("The execution engine returned an unexpected runtime list.");
  }

  runtimeCache = { at: Date.now(), runtimes: parsed.data };
  return parsed.data;
}

/**
 * The version to ask for.
 *
 * The configured version is tried first, then any version of the same language.
 * Falling back rather than failing is deliberate: the point of the pinned
 * versions is reproducibility, and `pnpm piston:check` is what reports drift. A
 * submission that cannot run at all reports nothing.
 */
async function versionFor(language: LanguageId): Promise<string> {
  const program = getLanguage(language).pistonName;
  const runtimes = await listRuntimes();
  const matches = runtimes.filter((runtime) =>
    matchesProgram(runtime, program),
  );

  if (matches.length === 0) {
    throw new RunnerError(
      `The execution engine has no "${program}" runtime installed. ` +
        `Install it with: pnpm piston:runtimes`,
    );
  }

  const configured = runtimeFor(language);
  const exact = matches.find((runtime) => runtime.version === configured);

  return (exact ?? matches[0]).version;
}

function matchesProgram(runtime: Runtime, program: string): boolean {
  return runtime.language === program || runtime.aliases.includes(program);
}

/** The pinned versions the engine is not offering, for `piston:check`. */
export async function missingRuntimes(): Promise<string[]> {
  const runtimes = await listRuntimes();
  return (Object.keys(RUNTIMES) as LanguageId[]).flatMap((id) => {
    const program = getLanguage(id).pistonName;
    const version = runtimeFor(id);
    const found = runtimes.some(
      (runtime) =>
        matchesProgram(runtime, program) && runtime.version === version,
    );
    return found ? [] : [`${program} ${version}`];
  });
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A small LRU over finished jobs.
 *
 * The key is everything that could change the answer: the program text, the
 * input, and the limits. A cached result carries the version that produced it,
 * so an engine upgrade invalidates by mismatch even before the TTL.
 */
const CACHE_LIMIT = 256;
const cache = new Map<string, EngineResult>();

export function cacheKey(request: ExecuteRequest): string {
  return createHash("sha256")
    .update(request.language)
    .update("\u0000")
    .update(request.source)
    .update("\u0000")
    .update(request.stdin)
    .update("\u0000")
    .update(`${request.runMs}:${request.compileMs}:${request.memoryBytes}`)
    .digest("hex");
}

function cacheGet(key: string): EngineResult | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  // Re-insert so the most recently used entry is last.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, result: EngineResult): void {
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

export function clearCache(): void {
  cache.clear();
}

/* -------------------------------------------------------------------------- */
/* Concurrency                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A counting semaphore, so a submission's cases do not all hit the engine at
 * once. The queue is bounded: past the limit a run is refused rather than
 * accepted and left to time out.
 */
class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly limit: number,
    private readonly queueLimit: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      if (this.waiting.length >= this.queueLimit) {
        throw new RunnerError(
          "Too many runs are already queued. Wait for the current run to finish.",
        );
      }
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

let semaphore: Semaphore | null = null;

/** Lazily built so the env-configured limits are read after dotenv has run. */
export function engineSemaphore(concurrency: number, queueLimit: number): Semaphore {
  semaphore ??= new Semaphore(concurrency, queueLimit);
  return semaphore;
}

/* -------------------------------------------------------------------------- */
/* Execute                                                                    */
/* -------------------------------------------------------------------------- */

export async function execute(
  request: ExecuteRequest,
  options: { timeoutMs: number; concurrency: number; queueLimit: number },
): Promise<EngineResult> {
  const key = cacheKey(request);
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const version = await versionFor(request.language);

  const result = await engineSemaphore(options.concurrency, options.queueLimit).run(
    async (): Promise<EngineResult> => {
      let response: Response;
      try {
        response = await fetch(`${PISTON_URL}/api/v2/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: getLanguage(request.language).pistonName,
            version,
            files: [
              { name: request.fileName, content: request.source, encoding: "utf8" },
            ],
            stdin: request.stdin,
            run_timeout: request.runMs,
            compile_timeout: request.compileMs,
            run_memory_limit: request.memoryBytes,
          }),
          signal: AbortSignal.timeout(options.timeoutMs),
        });
      } catch (error) {
        throw new RunnerError(
          error instanceof Error && error.name === "TimeoutError"
            ? `The execution engine did not answer within ${options.timeoutMs} ms.`
            : `Could not reach the execution engine at ${PISTON_URL}: ${
                error instanceof Error ? error.message : "network error"
              }`,
        );
      }

      if (response.status === 400) {
        const body = errorSchema.safeParse(await response.json().catch(() => null));
        throw new RunnerError(
          `The execution engine rejected the job${
            body.success ? `: ${body.data.message}` : ""
          }`,
        );
      }

      if (!response.ok) {
        throw new RunnerError(
          `The execution engine failed the job (HTTP ${response.status}).`,
        );
      }

      const parsed = executeResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success) {
        throw new RunnerError("The execution engine returned an unreadable result.");
      }

      return { response: parsed.data, cached: false };
    },
  );

  cacheSet(key, result);
  return result;
}
