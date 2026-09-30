import {
  enrollReview,
  getReviewCard,
  reviewActiveSchema,
  ReviewNotEnrolledError,
  setReviewActive,
} from "@/lib/db/queries/reviews";
import { reviewErrorResponse } from "../responses";

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

/** Enrollment state for one problem; an un-enrolled problem is a valid state. */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const state = await getReviewCard(slug);
    if (!state) return Response.json({ error: "Unknown problem." }, { status: 404 });
    return Response.json(state);
  } catch (error) {
    return reviewErrorResponse(error);
  }
}

/** Idempotently enroll an existing problem; never resumes a paused card. */
export async function PUT(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const state = await enrollReview(slug, new Date());
    if (!state) return Response.json({ error: "Unknown problem." }, { status: 404 });
    return Response.json(state);
  } catch (error) {
    return reviewErrorResponse(error);
  }
}

/** Pause or resume while preserving the saved FSRS schedule and history. */
export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = reviewActiveSchema.safeParse(json.value);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid review update.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const state = await setReviewActive(
      slug,
      parsed.data.active,
      parsed.data.expectedRevision,
    );
    if (!state) return Response.json({ error: "Unknown problem." }, { status: 404 });
    return Response.json(state);
  } catch (error) {
    if (error instanceof ReviewNotEnrolledError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return reviewErrorResponse(error);
  }
}
