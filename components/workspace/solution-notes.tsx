"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SaveStatus } from "@/lib/hooks/use-practice";
import { getLanguage, isLanguageId, type LanguageId } from "@/lib/languages";
import type { LegacySnapshot } from "@/lib/practice/types";
import type { SolutionNotes } from "@/lib/problems";

import { SaveStatusLabel } from "./save-status";

export type AcceptedSolution = {
  source: string;
  language: LanguageId;
  at: string;
} | null;

function languageShort(id: string): string {
  return isLanguageId(id) ? getLanguage(id).short : id;
}

function StoredCode({
  title,
  language,
  at,
  source,
  copyLabel,
  onLoad,
  note,
}: {
  title: string;
  language: string;
  at: string;
  source: string;
  copyLabel: string;
  onLoad: () => void;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-xs text-muted-foreground">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground/70">
          {languageShort(language)} · {new Date(at).toLocaleString()}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copyLabel}
            onClick={() => {
              void navigator.clipboard?.writeText(source).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? (
              <CheckIcon className="text-success" />
            ) : (
              <CopyIcon />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onLoad}>
            <DownloadIcon data-icon="inline-start" />
            Load into editor
          </Button>
        </div>
      </div>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-panel-2 p-3 font-mono text-[12.5px] leading-[1.6]">
        {source}
      </pre>
    </section>
  );
}

export function SolutionNotesPanel({
  notes,
  onNotesChange,
  accepted,
  onLoadAccepted,
  legacySnapshot,
  onLoadLegacy,
  saveStatus = "idle",
  onRetrySave,
  simulated = false,
}: {
  notes: SolutionNotes;
  onNotesChange: (notes: SolutionNotes) => void;
  accepted: AcceptedSolution;
  onLoadAccepted: () => void;
  legacySnapshot?: LegacySnapshot | null;
  onLoadLegacy?: () => void;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
  /** True when Run and Submit are answered without executing anything. */
  simulated?: boolean;
}) {
  const showAccepted = Boolean(accepted);
  const showLegacy = Boolean(legacySnapshot);
  const showEmpty = !showAccepted && !showLegacy;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xs text-muted-foreground">
              My approach
            </h2>
            <SaveStatusLabel status={saveStatus} onRetry={onRetrySave} />
          </div>
          <p className="text-sm text-muted-foreground">
            Notes to your future self. Saved as you type, per problem.
          </p>
        </div>
        <Textarea
          value={notes.approach}
          onChange={(event) =>
            onNotesChange({ ...notes, approach: event.target.value })
          }
          rows={7}
          aria-label="Approach notes"
          placeholder="What is the key observation? What did you try first, and why did it fail?"
          className="resize-y text-sm leading-[1.7]"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs text-muted-foreground">Complexity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="complexity-time" className="font-mono text-xs">
              Time
            </FieldLabel>
            <Input
              id="complexity-time"
              value={notes.timeComplexity}
              onChange={(event) =>
                onNotesChange({ ...notes, timeComplexity: event.target.value })
              }
              placeholder="O(n log n)"
              className="font-mono text-sm"
            />
            <FieldDescription>Same notation the AI tutor uses.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel
              htmlFor="complexity-space"
              className="font-mono text-xs"
            >
              Space
            </FieldLabel>
            <Input
              id="complexity-space"
              value={notes.spaceComplexity}
              onChange={(event) =>
                onNotesChange({ ...notes, spaceComplexity: event.target.value })
              }
              placeholder="O(1)"
              className="font-mono text-sm"
            />
            <FieldDescription>Extra space, excluding the input.</FieldDescription>
          </Field>
        </div>
      </section>

      {showAccepted && accepted ? (
        <StoredCode
          title="Last accepted submission"
          language={accepted.language}
          at={accepted.at}
          source={accepted.source}
          copyLabel="Copy accepted code"
          onLoad={onLoadAccepted}
        />
      ) : null}

      {showLegacy && legacySnapshot ? (
        <StoredCode
          title="Legacy snapshot"
          language={legacySnapshot.language}
          at={legacySnapshot.at}
          source={legacySnapshot.source}
          copyLabel="Copy legacy snapshot"
          onLoad={() => onLoadLegacy?.()}
          note="Imported from this browser. It is not a verified submit and does not mark the problem solved."
        />
      ) : null}

      {showEmpty ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>No accepted submission yet</EmptyTitle>
            <EmptyDescription>
              {simulated
                ? "Run and Submit are being answered by the mock runner, so " +
                  "nothing was executed and no submission was recorded. A mock " +
                  "verdict never counts as solved — point PISTON_URL at the " +
                  "engine in .env.local (see .env.example) and Submit again."
                : "The code you get accepted with lands here, so the solution " +
                  "tab keeps both the idea and the working version."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}
