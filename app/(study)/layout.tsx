import { cookies } from "next/headers";

import { StudyShell } from "@/components/shell/study-shell";
import { listReviewQueue } from "@/lib/db/queries/reviews";
import type { ReviewQueue } from "@/lib/reviews/types";
import { STUDY_SIDEBAR_COOKIE } from "@/lib/shell/sidebar-cookie";

// Progress, the catalog, and the review queue are read per request.
export const dynamic = "force-dynamic";

/**
 * The shell reads the queue so the sidebar badge is right in the first paint.
 * Review errors belong to the shared queue state. The dashboard can still show
 * progress and activity when only the review read fails.
 */
async function readQueue(): Promise<{
  queue: ReviewQueue | null;
  error: string | null;
}> {
  try {
    return { queue: await listReviewQueue(), error: null };
  } catch (cause) {
    return {
      queue: null,
      error: cause instanceof Error ? cause.message : "Could not load reviews.",
    };
  }
}

export default async function StudyLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, initial] = await Promise.all([cookies(), readQueue()]);
  const defaultOpen = cookieStore.get(STUDY_SIDEBAR_COOKIE)?.value !== "false";

  return (
    <StudyShell
      defaultOpen={defaultOpen}
      initialQueue={initial.queue}
      initialError={initial.error}
    >
      {children}
    </StudyShell>
  );
}
