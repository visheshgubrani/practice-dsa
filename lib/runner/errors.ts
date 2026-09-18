/**
 * The error type the run path throws.
 *
 * It lives on its own so `lib/piston/*` can raise it without importing
 * `lib/runner/index.ts` — which imports the Piston runner, which imports the
 * client. The message on a `RunnerError` is what the console shows the user, so
 * it should always name the fix.
 */
export class RunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunnerError";
  }
}

/** A Run asked for a case that does not exist — the request is wrong. */
export class InvalidRunRequestError extends RunnerError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRunRequestError";
  }
}

/**
 * The catalog cannot be judged: empty suite, a missing case, or no expected
 * value. Callers turn this into `internal_error`, never `accepted`.
 */
export class JudgingDataError extends RunnerError {
  constructor(message: string) {
    super(message);
    this.name = "JudgingDataError";
  }
}
