"use client";

import { AlertTriangleIcon, SparklesIcon, XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { NotesDraftController } from "@/lib/hooks/use-notes-draft";
import {
  APPROACH_MAX,
  COMPLEXITY_MAX,
  NOTE_FIELDS,
  NOTE_FIELD_LABELS,
  PITFALLS_MAX,
  STEPS_MAX,
  type NoteField,
  type PersonalNotes,
} from "@/lib/practice/notes";
import { cn } from "@/lib/utils";

/**
 * The AI draft, previewed.
 *
 * Generation is a read: the preview holds text and nothing else. A field only
 * reaches the notes when the user applies it, one field at a time or through
 * **Fill empty fields**, and that goes through the normal autosave path. Every
 * field is editable here so a draft can be corrected before it is used.
 */

const FIELD_MAX: Record<NoteField, number> = {
  approach: APPROACH_MAX,
  steps: STEPS_MAX,
  pitfalls: PITFALLS_MAX,
  timeComplexity: COMPLEXITY_MAX,
  spaceComplexity: COMPLEXITY_MAX,
};

function CurrentAndProposed({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <p className="max-h-40 overflow-y-auto text-sm leading-[1.7] whitespace-pre-wrap">
        {value.trim().length > 0 ? value : "(empty)"}
      </p>
    </div>
  );
}

function DraftField({
  field,
  draft,
  notes,
  controller,
}: {
  field: NoteField;
  draft: PersonalNotes;
  notes: PersonalNotes;
  controller: NotesDraftController;
}) {
  const proposed = draft[field];
  const label = NOTE_FIELD_LABELS[field];
  const blank = proposed.trim().length === 0;
  const applied = controller.applied.includes(field) && notes[field] === proposed;
  const stale = controller.staleField === field;
  const inputId = `draft-${field}`;

  return (
    <Field>
      <div className="flex flex-wrap items-center gap-2">
        <FieldLabel htmlFor={blank ? undefined : inputId} className="font-mono text-[11px]">
          {label}
        </FieldLabel>
        {applied ? (
          <Badge
            variant="outline"
            className="border-success/40 bg-success/10 font-mono text-[10px] text-success"
          >
            applied
          </Badge>
        ) : blank ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            left blank
          </span>
        ) : (
          <Button
            variant="outline"
            size="xs"
            className="ml-auto"
            onClick={() => controller.useField(field)}
          >
            Use this field
          </Button>
        )}
      </div>

      {blank ? (
        <FieldDescription>
          The session did not support this one, so nothing is proposed.
        </FieldDescription>
      ) : (
        <Textarea
          id={inputId}
          value={proposed}
          maxLength={FIELD_MAX[field]}
          rows={field === "approach" ? 4 : field === "steps" ? 5 : 3}
          onChange={(event) => controller.setDraftField(field, event.target.value)}
          className={cn(
            "resize-y text-sm leading-[1.7]",
            applied && "border-success/40",
          )}
        />
      )}

      {stale ? (
        <div className="flex flex-col gap-2 rounded-md border border-difficulty-medium/40 bg-difficulty-medium/10 p-2">
          <p className="text-xs text-foreground/90">
            You changed this field while the draft was being written, so nothing
            was replaced. Compare both, then choose.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <CurrentAndProposed label="yours now" value={notes[field]} />
            <CurrentAndProposed label="draft" value={proposed} />
          </div>
          <div className="flex gap-2">
            <Button size="xs" onClick={() => controller.confirmField(field)}>
              Replace with draft
            </Button>
            <Button variant="ghost" size="xs" onClick={controller.keepField}>
              Keep mine
            </Button>
          </div>
        </div>
      ) : null}
    </Field>
  );
}

export function NotesDraftPanel({
  draft,
  notes,
  onGenerate,
}: {
  /** The preview controller. Its `draft` field is the proposed text. */
  draft: NotesDraftController;
  /** What is saved right now, for the stale-field comparison. */
  notes: PersonalNotes;
  onGenerate: () => void;
}) {
  const generating = draft.status === "generating";
  const preview = draft.draft;
  const hasEmptyTarget =
    preview != null &&
    NOTE_FIELDS.some(
      (field) => notes[field].trim().length === 0 && preview[field].trim().length > 0,
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          {preview ? "Draft again" : "Draft from my session"}
        </Button>
        {generating ? (
          <>
            <span className="font-mono text-[11px] text-muted-foreground">
              reading your session…
            </span>
            <Button variant="ghost" size="xs" onClick={draft.cancel}>
              <XIcon data-icon="inline-start" />
              Cancel
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            A preview only. Nothing is saved until you use a field.
          </span>
        )}
      </div>

      {draft.status === "insufficient" ? (
        <Alert>
          <SparklesIcon />
          <AlertTitle>Not enough to summarize yet</AlertTitle>
          <AlertDescription>{draft.message}</AlertDescription>
        </Alert>
      ) : null}

      {draft.status === "error" ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>The draft did not come through</AlertTitle>
          <AlertDescription>
            <p>{draft.message}</p>
            <Button
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={draft.retry}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="flex flex-col gap-4 rounded-md border border-border bg-panel-2 p-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-mono text-xs text-muted-foreground">
              Draft preview
            </h3>
            <p className="text-sm text-muted-foreground">
              Written from your code, this conversation, and the attached run.
              Edit anything before using it.
            </p>
          </div>

          {NOTE_FIELDS.map((field) => (
            <DraftField
              key={field}
              field={field}
              draft={preview}
              notes={notes}
              controller={draft}
            />
          ))}

          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" onClick={draft.fillEmpty} disabled={!hasEmptyTarget}>
              Fill empty fields
            </Button>
            <Button variant="ghost" size="xs" onClick={draft.discard}>
              Discard
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {draft.applied.length > 0
                ? `${draft.applied.length} field${draft.applied.length === 1 ? "" : "s"} applied — saved as you type.`
                : "Nothing applied yet."}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
