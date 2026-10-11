"use client";

import {
  ReviewQueueContext,
  useReviewQueueLoader,
} from "@/lib/hooks/use-review-queue";
import type { ReviewQueue } from "@/lib/reviews/types";

export function ReviewQueueProvider({
  initialQueue,
  initialError,
  children,
}: {
  initialQueue: ReviewQueue | null;
  initialError: string | null;
  children: React.ReactNode;
}) {
  const state = useReviewQueueLoader(initialQueue, initialError);
  return (
    <ReviewQueueContext.Provider value={state}>
      {children}
    </ReviewQueueContext.Provider>
  );
}
