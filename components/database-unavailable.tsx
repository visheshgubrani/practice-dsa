"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * The page shown when Postgres is unreachable.
 *
 * An outage is an expected condition here rather than a bug — every page reads
 * the catalog on each render — so the routes handle it themselves instead of
 * throwing: an error thrown while a server component renders never reaches
 * app/error.tsx, Next answers with its own error document instead. The fix is
 * spelled out rather than inferred from the message, which production redacts.
 */
export function DatabaseUnavailable({ message }: { message?: string }) {
  const router = useRouter();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <p className="font-mono text-xs text-muted-foreground">database</p>
      <h1 className="font-mono text-lg font-medium tracking-tight">
        Can&apos;t reach the database
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The problem catalog lives in Postgres, and the connection to{" "}
        <code className="font-mono text-[12px]">DATABASE_URL</code> failed. Start
        it, then try again.
      </p>

      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-panel-2 px-4 py-3 text-left">
        {[
          { command: "pnpm db:up", note: "start the container" },
          { command: "pnpm db:migrate", note: "if the schema is missing" },
          { command: "pnpm db:seed", note: "if the catalog is empty" },
        ].map(({ command, note }) => (
          <div key={command} className="flex items-center gap-3">
            <code className="font-mono text-[12.5px] text-foreground">
              {command}
            </code>
            <span className="font-mono text-[11px] text-muted-foreground">
              {note}
            </span>
          </div>
        ))}
      </div>

      {message ? (
        <p className="max-w-lg font-mono text-[11px] break-words text-muted-foreground/70">
          {message}
        </p>
      ) : null}

      <Button variant="outline" size="sm" onClick={() => router.refresh()}>
        Try again
      </Button>
    </main>
  );
}
