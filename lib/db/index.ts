import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { databaseUrl } from "./env";
import { relations } from "./relations";

/**
 * The database client. Server-only: catalog and practice queries in
 * lib/db/queries/ are imported by pages and route handlers — never by a
 * client component.
 *
 * `pg` is already in Next's default `serverExternalPackages`, so importing it
 * from a route handler or server component needs no config change.
 */

/**
 * Next dev re-evaluates modules on every edit. Caching the pool on globalThis
 * keeps that from opening a new set of connections per edit (and, in the limit,
 * exhausting the server's connection slots).
 */
const globalForDb = globalThis as unknown as { dsaPool?: Pool };

export const pool =
  globalForDb.dsaPool ??
  new Pool({
    connectionString: databaseUrl(),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dsaPool = pool;
}

/**
 * `client:` is required: drizzle v1 dropped the `drizzle(pool)` shorthand, and
 * passing a Pool positionally makes it build its own credential-less pool
 * (which fails at the first query with "client password must be a string").
 */
export const db = drizzle({ client: pool, relations });
