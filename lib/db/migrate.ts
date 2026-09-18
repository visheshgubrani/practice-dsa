import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";

import { backfillTestcaseArguments } from "./backfill-arguments";
import { loadEnv } from "./env";
import { db, pool } from "./index";

/**
 * Applies every migration in `drizzle/` that the database has not seen yet.
 *
 * Migrations commit one at a time so the 2.4 stdin → arguments backfill can
 * run after the column is added and before `stdin` is dropped. Drizzle's
 * stock migrator wraps every pending file in a single transaction, which
 * would SET NOT NULL on still-empty arguments.
 *
 * Run through `pnpm db:migrate`. The connection string comes from the same
 * loader the app and the seed use (`lib/db/env.ts`). Fresh-install coverage is
 * `pnpm db:migrate && pnpm db:seed` on an empty volume, not an automated wipe.
 *
 * No top-level await: these scripts run under tsx, and the package is CommonJS.
 */

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

async function ensureJournal(): Promise<void> {
  await db.execute(
    sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`,
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      name text,
      applied_at timestamp with time zone DEFAULT now()
    )
  `);
}

async function appliedNames(): Promise<Set<string>> {
  const result = await pool.query<{ name: string | null }>(
    `select name from ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
  );
  return new Set(
    result.rows
      .map((row) => row.name)
      .filter((name): name is string => typeof name === "string"),
  );
}

async function applyPending(): Promise<void> {
  await ensureJournal();
  const files = readMigrationFiles({ migrationsFolder: "drizzle" });
  const applied = await appliedNames();
  const pending = files.filter((migration) => {
    return Boolean(migration.name) && !applied.has(migration.name as string);
  });

  for (const migration of pending) {
    await db.transaction(async (tx) => {
      for (const stmt of migration.sql) {
        const trimmed = stmt.trim();
        if (trimmed.length === 0) continue;
        await tx.execute(sql.raw(trimmed));
      }
      await tx.execute(sql`
        insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
          ("hash", "created_at", "name")
        values (${migration.hash}, ${migration.folderMillis}, ${migration.name ?? null})
      `);
    });
    console.log(`  applied ${migration.name}`);

    const backfill = await backfillTestcaseArguments();
    if (backfill.updated > 0) {
      console.log(
        `  backfilled arguments on ${backfill.updated} testcase` +
          `${backfill.updated === 1 ? "" : "s"}`,
      );
    }
  }
}

async function main() {
  loadEnv();
  try {
    await applyPending();
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

/** drizzle wraps driver failures, so the useful message is on `cause`. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause =
    error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
}

main().catch((error: unknown) => {
  console.error(describe(error));
  process.exitCode = 1;
});
