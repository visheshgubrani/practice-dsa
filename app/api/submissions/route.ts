import {
  listSubmissions,
  submissionListQuerySchema,
} from "@/lib/db/queries/submissions";

/**
 * Paginated execution history for one problem. Case payloads live on the
 * detail route so this list cannot leak the unrevealed hidden suite.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = submissionListQuerySchema.safeParse({
    slug: url.searchParams.get("slug") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid submissions query.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await listSubmissions(
      parsed.data.slug,
      parsed.data.limit,
      parsed.data.offset,
    );
    if (!result) {
      return Response.json({ error: "Unknown problem." }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load submissions.";
    return Response.json({ error: message }, { status: 500 });
  }
}
