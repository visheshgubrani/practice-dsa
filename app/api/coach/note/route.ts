import { generateCoachNote } from "@/lib/ai/coach-note";
import { coachNoteRequestSchema } from "@/lib/coach/note-contract";

/**
 * A short coaching note over structured plan facts.
 *
 * This route is presentation-only: it reads no problem content, imports no
 * database, and writes nothing. A missing key, a provider failure, or invalid
 * output leaves the client's deterministic fallback in place.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = coachNoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid coach note request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await generateCoachNote({
    request: parsed.data,
    signal: request.signal,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    status: "note",
    fingerprint: parsed.data.fingerprint,
    note: result.note,
  });
}
