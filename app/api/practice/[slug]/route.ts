import {
  getPractice,
  patchPractice,
  practiceGetQuerySchema,
  practicePatchSchema,
  PracticeConflictError,
} from "@/lib/db/queries/practice";

/**
 * Draft, notes, progress, and the latest verified accepted submission for one
 * problem. PATCH never writes solved status — that comes from a genuine Piston
 * Submit, not from this endpoint.
 */

type RouteContext = { params: Promise<{ slug: string }> };

async function readJson(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; response: Response }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const parsed = practiceGetQuerySchema.safeParse({
    language: url.searchParams.get("language") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid practice query.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const state = await getPractice(slug, parsed.data.language);
    if (!state) {
      return Response.json({ error: "Unknown problem." }, { status: 404 });
    }
    return Response.json(state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load practice state.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = practicePatchSchema.safeParse(json.value);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid practice update.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const state = await patchPractice(slug, parsed.data);
    if (!state) {
      return Response.json({ error: "Unknown problem." }, { status: 404 });
    }
    return Response.json(state);
  } catch (error) {
    if (error instanceof PracticeConflictError) {
      return Response.json(
        {
          error: error.message,
          resource: error.resource,
          revision: error.revision,
          updatedAt: error.updatedAt,
        },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not save practice state.";
    return Response.json({ error: message }, { status: 500 });
  }
}
