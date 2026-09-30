import {
  rateReview,
  reviewRateSchema,
} from "@/lib/db/queries/reviews";
import { reviewErrorResponse } from "../../responses";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reviewRateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid review rating.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await rateReview(slug, parsed.data, new Date());
    if (!result) return Response.json({ error: "Unknown problem." }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    return reviewErrorResponse(error);
  }
}
