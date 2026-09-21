"use client";

import { AlertTriangleIcon, InboxIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { SaveStatus } from "@/lib/hooks/use-practice";

export function SaveStatusLabel({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry?: () => void;
}) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <Spinner />
          saving
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="font-mono text-[11px] text-muted-foreground">saved</span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-destructive">
      save failed
      {onRetry ? (
        <Button variant="ghost" size="xs" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </span>
  );
}

export function LoadErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Could not load saved work</AlertTitle>
      <AlertDescription>
        {message} Edits stay in this browser until the database is reachable.
      </AlertDescription>
      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Alert>
  );
}

export function SaveConflictAlert({
  resource,
  onReload,
  onOverwrite,
}: {
  resource: "draft" | "progress";
  onReload: () => void;
  onOverwrite: () => void;
}) {
  const label = resource === "draft" ? "draft" : "notes";
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>This {label} was saved in another tab</AlertTitle>
      <AlertDescription>
        This tab still has your local edits. Reload the saved version, or
        overwrite it with this buffer.
      </AlertDescription>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={onReload}>
          Reload
        </Button>
        <Button size="sm" onClick={onOverwrite}>
          Overwrite
        </Button>
      </div>
    </Alert>
  );
}

export function ImportPracticeAlert({
  summary,
  importing,
  error,
  onImport,
  onDismiss,
}: {
  summary: string;
  importing: boolean;
  error: string | null;
  onImport: () => void;
  onDismiss: () => void;
}) {
  return (
    <Alert>
      <InboxIcon />
      <AlertTitle>Browser practice data found</AlertTitle>
      <AlertDescription>
        Found {summary}. They can be copied into the database without
        overwriting anything already saved. Original browser copies stay as a
        recovery backup. Old accepted runs become labeled snapshots and do not
        count as solved — only a full Piston Submit will.
        {error ? ` ${error}` : null}
      </AlertDescription>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={onImport} disabled={importing}>
          {importing ? (
            <>
              <Spinner data-icon="inline-start" />
              Importing
            </>
          ) : (
            "Import"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          disabled={importing}
        >
          Not now
        </Button>
      </div>
    </Alert>
  );
}
