import { z } from "zod";

import type { CoachNoteRequest } from "./types";

/**
 * The only shape `/api/coach/note` accepts.
 *
 * Deliberately no title, slug, statement, source, chat, note, or other free
 * text. The coach note is a presentation layer over facts the planner already
 * decided, so the model cannot be steered by client copy and cannot name a
 * problem the plan did not choose.
 */

const itemSchema = z
  .object({
    kind: z.enum(["review", "continue", "new"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    minutes: z.number().int().min(1).max(60),
  })
  .strict();

export const coachNoteRequestSchema = z
  .object({
    fingerprint: z.string().regex(/^[0-9a-f]{8}$/),
    state: z.enum(["active", "done", "empty"]),
    tone: z.enum(["start", "comeback", "steady", "push"]),
    minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    items: z.array(itemSchema).max(6),
    reviewsDone: z.number().int().min(0).max(100),
    reviewsRemaining: z.number().int().min(0).max(100),
    newDone: z.number().int().min(0).max(100),
    newRemaining: z.number().int().min(0).max(100),
    practicedToday: z.boolean(),
    minimumKind: z.enum(["review", "continue", "new"]).nullable(),
  })
  .strict();

export type CoachNoteRequestInput = z.infer<typeof coachNoteRequestSchema>;

/** Compile-time check that the wire contract stays the planner's shape. */
export type CoachNoteRequestMatches = CoachNoteRequestInput extends CoachNoteRequest
  ? true
  : never;
