import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/lib/problems";
import {
  DIFFICULTIES,
  formatCount,
  percentSolved,
  type ProgressSummary,
} from "@/lib/progress/summary";

/**
 * One surface for the whole catalog standing: the overall count and the three
 * difficulty breakdowns. It replaces the four separate stat cards, which said
 * the same thing four times at the same weight.
 */
export function ProgressSummaryCard({
  summary,
}: {
  summary: ProgressSummary;
}) {
  const percent = percentSolved(summary.overall);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-section font-medium">Solved</h2>
        </CardTitle>
        <CardDescription className="text-support">
          Only a verified Piston Submit counts as solved.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl leading-none font-semibold text-success tabular-nums">
              {summary.overall.solved}
            </span>
            <span className="text-base text-muted-foreground">
              of <span className="tabular-nums">{summary.overall.total}</span>{" "}
              solved
            </span>
            <span className="ml-auto text-support text-muted-foreground tabular-nums">
              {percent}% · {summary.overall.attempted} attempted
            </span>
          </div>
          <ProgressBar
            value={percent}
            label={`Overall: ${formatCount(summary.overall)} solved`}
          />
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTIES.map((difficulty) => {
            const counted = summary.byDifficulty[difficulty];
            const label = DIFFICULTY_LABEL[difficulty];
            return (
              <div key={difficulty} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-base text-muted-foreground">{label}</dt>
                  <dd className="text-support tabular-nums">
                    {formatCount(counted)}
                  </dd>
                </div>
                <ProgressBar
                  value={percentSolved(counted)}
                  tone={difficulty}
                  label={`${label}: ${formatCount(counted)} solved`}
                />
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
