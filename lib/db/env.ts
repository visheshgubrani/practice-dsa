import { config as loadDotenv } from "dotenv";

/**
 * Environment loading for everything that runs outside Next.
 *
 * Next reads `.env.local` on its own; `drizzle.config.ts`, `lib/db/migrate.ts`
 * and `lib/db/seed.ts` are plain Node processes and do not. dotenv never
 * overrides a variable that is already set, so loading `.env.local` first makes
 * it win over `.env`.
 */

/**
 * The development defaults, identical to docker-compose.dev.yml. Having them
 * here means `pnpm db:migrate` and `pnpm db:seed` work on a fresh clone with no
 * `.env.local` at all.
 */
export const DEV_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5441/dsa_software";

let loaded = false;

/** Idempotent: a script that imports both this and the db client loads once. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  // A missing file is reported on the returned object, never thrown.
  loadDotenv({ path: ".env.local", quiet: true });
  loadDotenv({ path: ".env", quiet: true });
}

export function databaseUrl(): string {
  loadEnv();
  return process.env.DATABASE_URL ?? DEV_DATABASE_URL;
}
