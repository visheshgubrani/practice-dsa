import type { Metadata } from "next";

import { ReviewsHub } from "@/components/reviews/reviews-hub";
import { PageBody, PageHeader } from "@/components/shell/page-chrome";

export const metadata: Metadata = {
  title: "Reviews · DSA Software",
};

// Review state is written by ratings, so this renders per request.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        title="Reviews"
        description="Spaced repetition over the problems you enrolled. Due first; a paused review keeps its schedule and stops counting as due."
      />
      <PageBody bare>
        <ReviewsHub />
      </PageBody>
    </main>
  );
}
