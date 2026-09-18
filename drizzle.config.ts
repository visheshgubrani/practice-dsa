import { defineConfig } from "drizzle-kit";

import { DEV_DATABASE_URL, loadEnv } from "./lib/db/env";

/**
 * drizzle-kit configuration — used by `pnpm db:generate`, `db:push` and
 * `db:studio`. Migrations are applied by lib/db/migrate.ts, not by drizzle-kit,
 * but they share the connection string through lib/db/env.ts.
 */

// drizzle-kit runs as its own Node process, so it needs the same .env.local
// loading that Next does for free.
loadEnv();

export default defineConfig({
  dialect: "postgresql",
  // Listed explicitly rather than globbed: lib/db/schema/index.ts re-exports
  // every table, and handing the diff engine the same table twice would be
  // ambiguous.
  schema: [
    "./lib/db/schema/chat.ts",
    "./lib/db/schema/enums.ts",
    "./lib/db/schema/practice.ts",
    "./lib/db/schema/problems.ts",
    "./lib/db/schema/submissions.ts",
  ],
  out: "./drizzle",
  dbCredentials: {
    // Falls back to the docker-compose.dev.yml defaults, so generation and
    // `db:studio` work on a fresh clone.
    url: process.env.DATABASE_URL ?? DEV_DATABASE_URL,
  },
  // `push` and `generate` only; migrations themselves are versioned in drizzle/.
  strict: false,
  verbose: true,
});
