"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the unexpected kind of failure — a bug in a
 * render, a malformed row. A database outage does not arrive here: an error
 * thrown while a server component renders is answered by Next's own error
 * document, so the routes render components/database-unavailable.tsx instead.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-full flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <p className="font-mono text-xs text-muted-foreground">error</p>
      <h1 className="font-mono text-lg font-medium tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The workbench hit an unexpected error while rendering this page.
      </p>

      {error.message ? (
        <p className="max-w-lg font-mono text-[11px] break-words text-muted-foreground/70">
          {error.message}
        </p>
      ) : null}

      <Button variant="outline" size="sm" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
