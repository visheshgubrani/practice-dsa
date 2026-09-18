import { config as loadDotenv } from "dotenv";

/**
 * Environment loading for the runner.
 *
 * Next reads `.env.local` on its own for the app it serves, but the check and
 * probe scripts are plain Node processes and do not — so they import this. It is
 * the same two-file order `lib/db/env.ts` uses, and dotenv never overrides a
 * variable that is already set, which makes the call idempotent and safe to make
 * from several modules.
 *
 * It is deliberately *not* called while the app is running: nothing should load
 * dotenv into a request-handling process that already has its environment.
 */

let loaded = false;

export function loadPistonEnv(): void {
  if (loaded) return;
  loaded = true;
  loadDotenv({ path: ".env.local", quiet: true });
  loadDotenv({ path: ".env", quiet: true });
}
