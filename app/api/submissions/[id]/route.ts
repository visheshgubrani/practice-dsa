import {
  getSubmission,
  submissionIdSchema,
} from "@/lib/db/queries/submissions";

/**
 * Stored execution detail. Cases go through Phase 2 disclosure before they
 * leave this handler.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = submissionIdSchema.safeParse(id);
  if (!parsed.success) {
    return Response.json({ error: "Invalid submission id." }, { status: 400 });
  }

  try {
    const detail = await getSubmission(parsed.data);
    if (!detail) {
      return Response.json({ error: "Unknown submission." }, { status: 404 });
    }
    return Response.json(detail);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load submission.";
    return Response.json({ error: message }, { status: 500 });
  }
}
