import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  formatCount,
  percentSolved,
  type TopicProgress,
} from "@/lib/progress/summary";

/**
 * The roadmap as progress, one row per topic in catalog order. The per-problem
 * lists that used to be here are on `/problems`, filtered to the topic by the
 * link — the dashboard only has to answer "how far along is this group".
 */
export function TopicProgressList({
  topics,
}: {
  topics: readonly TopicProgress[];
}) {
  return (
    <ul className="flex flex-col gap-1">
      {topics.map((topic) => {
        const percent = percentSolved(topic);
        const complete = topic.total > 0 && topic.solved === topic.total;
        const counted = formatCount(topic);

        return (
          <li key={topic.topic}>
            <Link
              href={`/problems?topic=${encodeURIComponent(topic.topic)}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-2.5 hover:bg-panel-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_5rem] sm:gap-y-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-base">
                  {topic.topic}
                </span>
                {complete ? (
                  <CheckIcon
                    aria-hidden
                    className="size-4 shrink-0 text-success"
                  />
                ) : null}
              </span>

              <span className="order-last col-span-2 sm:order-none sm:col-span-1">
                <ProgressBar
                  value={percent}
                  label={`${topic.topic}: ${counted} solved`}
                />
              </span>

              <span className="text-right text-support text-muted-foreground tabular-nums">
                {counted}
                <span className="sr-only"> solved</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
