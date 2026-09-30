import {
  ReviewConflictError,
  ReviewNotEnrolledError,
  ReviewPausedError,
  ReviewRequestMismatchError,
  ReviewSubmissionError,
  ReviewSubmissionNotFoundError,
} from "@/lib/db/queries/reviews";

export function reviewErrorResponse(error: unknown): Response {
  if (error instanceof ReviewConflictError) {
    return Response.json(
      { error: error.message, revision: error.revision },
      { status: 409 },
    );
  }
  if (error instanceof ReviewRequestMismatchError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ReviewNotEnrolledError || error instanceof ReviewPausedError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ReviewSubmissionNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ReviewSubmissionError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  return Response.json(
    { error: "Could not process the review." },
    { status: 500 },
  );
}
