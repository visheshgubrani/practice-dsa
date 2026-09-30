import {
  loadNotesContext,
  notesGenerateBodySchema,
} from "@/lib/ai/notes-context";
import { generateNotesDraft } from "@/lib/ai/notes-draft";
import {
  buildNotesDraftPrompt,
  notesSessionIsEmpty,
  NOTES_DRAFT_UNAVAILABLE,
} from "@/lib/ai/notes-prompt";

/**
 * Preview a memory aid from the current session.
 *
 * This endpoint is a read: it loads the problem, the selected conversation, and
 * the referenced run, builds a bounded prompt, and returns text. It never writes
 * personal notes, never starts a chat turn, and never stores a message. Applying
 * a field happens in the browser through the ordinary notes save path.
 */

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = notesGenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid notes draft request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let loaded: Awaited<ReturnType<typeof loadNotesContext>>;
  try {
    loaded = await loadNotesContext(parsed.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load the session.";
    return Response.json({ error: message }, { status: 500 });
  }
  if (!loaded.ok) {
    return Response.json({ error: loaded.error }, { status: loaded.status });
  }

  const { problem, language, source, starter, notes, messages, submission } =
    loaded.context;

  if (notesSessionIsEmpty({ starter, source, notes, messages, submission })) {
    return Response.json({
      status: "insufficient",
      message: NOTES_DRAFT_UNAVAILABLE,
    });
  }

  const result = await generateNotesDraft({
    prompt: buildNotesDraftPrompt({
      problem,
      language,
      source,
      notes,
      messages,
      submission,
    }),
    signal: request.signal,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ status: "draft", notes: result.notes });
}
