import { getSubmission } from "@/lib/db/queries/submissions";
import type { SubmissionDetail } from "@/lib/submissions/types";

/**
 * Load a stored run for the tutor. Disclosure happens in `getSubmission`;
 * a row for a different problem is ignored rather than mixed into context.
 */
export async function loadTutorSubmission(
  problemSlug: string,
  submissionId: string | null | undefined,
): Promise<SubmissionDetail | null> {
  if (submissionId == null) return null;
  const referenced = await getSubmission(submissionId);
  return referenced?.slug === problemSlug ? referenced : null;
}
