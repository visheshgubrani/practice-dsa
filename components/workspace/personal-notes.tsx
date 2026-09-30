"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NotesDraftController } from "@/lib/hooks/use-notes-draft";
import type { SaveStatus } from "@/lib/hooks/use-practice";
import {
  APPROACH_MAX,
  COMPLEXITY_MAX,
  NOTE_FIELD_LABELS,
  PITFALLS_MAX,
  STEPS_MAX,
  type PersonalNotes,
} from "@/lib/practice/notes";

import { NotesDraftPanel } from "./notes-draft";
import { SaveStatusLabel } from "./save-status";

/**
 * The user's own memory aid. Catalog guidance stays on the Solution tab and
 * is never copied into these fields.
 */
export function PersonalNotesPanel({
  notes,
  onNotesChange,
  saveStatus = "idle",
  onRetrySave,
  draft,
  onGenerateDraft,
  reviewControls,
}: {
  notes: PersonalNotes;
  onNotesChange: (notes: PersonalNotes) => void;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
  /** The AI preview controller, when a draft can be generated here. */
  draft?: NotesDraftController;
  onGenerateDraft?: () => void;
  reviewControls?: React.ReactNode;
}) {
  function update(patch: Partial<PersonalNotes>) {
    onNotesChange({ ...notes, ...patch });
  }

  return (
    <FieldGroup className="gap-7">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-xs text-muted-foreground">My notes</h2>
          <SaveStatusLabel status={saveStatus} onRetry={onRetrySave} />
        </div>
        <p className="text-sm text-muted-foreground">
          Saved as you type. Catalog guidance stays on the Solution tab.
        </p>
      </div>

      {draft && onGenerateDraft ? (
        <NotesDraftPanel draft={draft} notes={notes} onGenerate={onGenerateDraft} />
      ) : null}

      {reviewControls}

      <Field>
        <FieldLabel htmlFor="notes-key-idea" className="font-mono text-xs">
          {NOTE_FIELD_LABELS.approach}
        </FieldLabel>
        <Textarea
          id="notes-key-idea"
          value={notes.approach}
          onChange={(event) => update({ approach: event.target.value })}
          rows={5}
          maxLength={APPROACH_MAX}
          placeholder="The observation you want to remember next time."
          className="resize-y text-sm leading-[1.7]"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="notes-steps" className="font-mono text-xs">
          {NOTE_FIELD_LABELS.steps}
        </FieldLabel>
        <Textarea
          id="notes-steps"
          value={notes.steps}
          onChange={(event) => update({ steps: event.target.value })}
          rows={6}
          maxLength={STEPS_MAX}
          placeholder="The moves, in the order you would repeat them."
          className="resize-y text-sm leading-[1.7]"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="notes-pitfalls" className="font-mono text-xs">
          {NOTE_FIELD_LABELS.pitfalls}
        </FieldLabel>
        <Textarea
          id="notes-pitfalls"
          value={notes.pitfalls}
          onChange={(event) => update({ pitfalls: event.target.value })}
          rows={4}
          maxLength={PITFALLS_MAX}
          placeholder="The mistake or edge case that cost you time."
          className="resize-y text-sm leading-[1.7]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="notes-time" className="font-mono text-xs">
            {NOTE_FIELD_LABELS.timeComplexity}
          </FieldLabel>
          <Input
            id="notes-time"
            value={notes.timeComplexity}
            onChange={(event) => update({ timeComplexity: event.target.value })}
            maxLength={COMPLEXITY_MAX}
            placeholder="O(n)"
            className="font-mono text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes-space" className="font-mono text-xs">
            {NOTE_FIELD_LABELS.spaceComplexity}
          </FieldLabel>
          <Input
            id="notes-space"
            value={notes.spaceComplexity}
            onChange={(event) => update({ spaceComplexity: event.target.value })}
            maxLength={COMPLEXITY_MAX}
            placeholder="O(1) extra"
            className="font-mono text-sm"
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
