import { pool } from "@/lib/db";

/**
 * Readiness check for Docker Compose and the deploy script.
 *
 * 200 means the app is up *and* Postgres answered a trivial query; 503 means
 * the app process is alive but not ready to serve practice pages. The body is
 * deliberately two words: a public health route must not turn a connection
 * failure into a diagnostic leak.
 *
 * Forced dynamic so Next never caches the result at build time, and no-store
 * so a proxy in front of it cannot either.
 */

export const dynamic = "force-dynamic";

/** A hung database must fail the check, not hang the checker. */
const DB_CHECK_TIMEOUT_MS = 2_000;

const NO_STORE = { "Cache-Control": "no-store" } as const;

async function databaseReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      pool.query("select 1"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("database health check timed out")),
          DB_CHECK_TIMEOUT_MS,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const ready = await databaseReachable();

  return Response.json(
    { status: ready ? "ok" : "unavailable" },
    { status: ready ? 200 : 503, headers: NO_STORE },
  );
}
