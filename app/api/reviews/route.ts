import { listReviewQueue } from "@/lib/db/queries/reviews";
import { reviewErrorResponse } from "./responses";

/** Active due and upcoming reviews, evaluated against the server clock. */
export async function GET() {
  try {
    return Response.json(await listReviewQueue(new Date()));
  } catch (error) {
    return reviewErrorResponse(error);
  }
}
