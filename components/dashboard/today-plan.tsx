"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  FootprintsIcon,
  MinusIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { ReviewQueueSummary } from "@/components/reviews/review-queue-summary";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  COACH_MINUTES_KEY,
  isCoachMinutesValue,
} from "@/lib/coach/cache";
import { coachItemHref } from "@/lib/coach/plan";
import {
  COACH_MINUTE_OPTIONS,
  DEFAULT_COACH_MINUTES,
  isCoachMinutes,
  type CoachMinutes,
  type CoachPlan,
  type CoachPlanItem,
} from "@/lib/coach/types";
import { useCoachNote } from "@/lib/hooks/use-coach-note";
import { useCoachPlan } from "@/lib/hooks/use-coach-plan";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { useReviewQueue } from "@/lib/hooks/use-review-queue";
import { describeDay, todayKey } from "@/lib/practice/days";
import { reviewDueLabel } from "@/lib/reviews/date";
import { cn } from "@/lib/utils";

/**
 * The dashboard's one decision surface: what to do in this session, what is
 * deliberately left out, and a single first action. The deterministic plan
 * owns the facts; the note is optional phrasing. See docs/plan/17-daily-coach.md.
 */

const KIND_LABEL: Record<CoachPlanItem["kind"], string> = {
  review: "Review",
  continue: "Continue",
  new: "New",
};

function primaryLabel(item: CoachPlanItem): string {
  switch (item.kind) {
    case "review":
      return `Start review: ${item.title}`;
    case "continue":
      return `Continue: ${item.title}`;
    case "new":
    default:
      return `Start: ${item.title}`;
  }
}

function TimeBudget({
  minutes,
  onChange,
  refreshing,
}: {
  minutes: CoachMinutes;
  onChange: (minutes: CoachMinutes) => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-support text-muted-foreground">Time today</span>
      <ToggleGroup
        aria-label="Time available today"
        value={[String(minutes)]}
        onValueChange={(next) => {
          const value = Number(next[0]);
          if (isCoachMinutesValue(value)) onChange(value);
        }}
        size="lg"
        spacing={1}
        variant="outline"
      >
        {COACH_MINUTE_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={String(option)}
            className="px-3 text-base tabular-nums"
          >
            {option} min
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {refreshing ? <Spinner aria-label="Refreshing today's plan" /> : null}
    </div>
  );
}

function PlanHeader({
  day,
  minutes,
  onChange,
  refreshing,
}: {
  day: string | null;
  minutes: CoachMinutes;
  onChange: (minutes: CoachMinutes) => void;
  refreshing: boolean;
}) {
  return (
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle>
            <h2
              id="today-plan-title"
              className="text-section font-semibold text-foreground"
            >
              Today
            </h2>
          </CardTitle>
          <CardDescription className="text-support">
            {day === null ? "Today's plan" : describeDay(day)}
          </CardDescription>
        </div>
        <TimeBudget
          minutes={minutes}
          onChange={onChange}
          refreshing={refreshing}
        />
      </div>
    </CardHeader>
  );
}

function CoachNoteBlock({
  note,
  source,
}: {
  note: string | null;
  source: "fallback" | "llm";
}) {
  if (note === null) return null;
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-panel-2/50 p-3">
      <SparklesIcon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          source === "llm" ? "text-primary" : "text-muted-foreground",
        )}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-support font-medium text-muted-foreground">
          {source === "llm" ? "Coach note" : "Plan note"}
        </p>
        <p className="min-h-12 max-w-2xl text-base text-pretty text-foreground">
          {note}
        </p>
      </div>
    </div>
  );
}

function MinimumLine({ minimum }: { minimum: string | null }) {
  if (minimum === null) return null;
  return (
    <p className="flex max-w-xl items-start gap-2 text-support text-muted-foreground">
      <FootprintsIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {minimum}
    </p>
  );
}

function DeferBlock({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <h3 className="text-support font-medium text-foreground">Not today</h3>
      <ul className="mt-1.5 flex flex-col gap-1">
        {lines.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-support text-muted-foreground"
          >
            <MinusIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanItemRow({
  item,
  first,
}: {
  item: CoachPlanItem;
  first: boolean;
}) {
  const href = coachItemHref(item);
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge
            variant={first ? "outline" : "secondary"}
            className={cn(
              "h-auto px-2 py-0.5 text-support",
              first && "border-primary/30 text-primary",
            )}
          >
            {KIND_LABEL[item.kind]}
          </Badge>
          <Link
            href={href}
            className="min-w-0 text-base font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <span className="text-muted-foreground tabular-nums">
              {item.number}.
            </span>{" "}
            {item.title}
          </Link>
          <DifficultyBadge difficulty={item.difficulty} />
          {first ? (
            <span className="text-support text-primary">Start here</span>
          ) : null}
        </div>
        <p className="text-support text-muted-foreground">{item.reason}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-support text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          <ClockIcon aria-hidden className="size-4" />
          {item.minutes} min
        </span>
        <Link
          href={href}
          aria-label={`Open ${item.title}`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </div>
    </li>
  );
}

function PlanFooter() {
  return (
    <CardFooter className="flex flex-wrap items-center justify-between gap-3">
      <ReviewQueueSummary />
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0 text-support"
        render={<Link href="/problems" />}
      >
        Problem list
      </Button>
    </CardFooter>
  );
}

function StaleRefresh({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-support text-muted-foreground"
      title={error}
    >
      <RefreshCwIcon aria-hidden className="size-4" />
      {"Couldn't refresh the plan. Showing the last one."}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0 text-support"
        onClick={onRetry}
      >
        Retry
      </Button>
    </p>
  );
}

function ActiveContent({
  plan,
  note,
  noteSource,
}: {
  plan: CoachPlan;
  note: string | null;
  noteSource: "fallback" | "llm";
}) {
  const first = plan.items[0];
  if (!first) return null;
  return (
    <CardContent className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="max-w-2xl text-section font-medium text-pretty text-foreground">
          {plan.headline}
        </p>
        <p className="max-w-2xl text-base text-pretty text-muted-foreground">
          {plan.summary}
        </p>
        {plan.progressLine ? (
          <p className="text-support text-muted-foreground tabular-nums">
            {plan.progressLine}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="max-w-full text-base"
          render={<Link href={coachItemHref(first)} />}
        >
          <span className="truncate">{primaryLabel(first)}</span>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <MinimumLine minimum={plan.minimum} />
      </div>

      <ol className="flex flex-col divide-y divide-border border-t border-border">
        {plan.items.map((item, index) => (
          <PlanItemRow key={`${item.kind}:${item.slug}`} item={item} first={index === 0} />
        ))}
      </ol>

      <CoachNoteBlock note={note} source={noteSource} />
      <DeferBlock lines={plan.defer} />
    </CardContent>
  );
}

function DoneContent({
  plan,
  note,
  noteSource,
}: {
  plan: CoachPlan;
  note: string | null;
  noteSource: "fallback" | "llm";
}) {
  return (
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">
          <CheckIcon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-section font-medium text-foreground">
            {plan.headline}
          </p>
          <p className="max-w-2xl text-base text-pretty text-muted-foreground">
            {plan.summary}
          </p>
          {plan.progressLine ? (
            <p className="text-support text-muted-foreground tabular-nums">
              {plan.progressLine}
            </p>
          ) : null}
        </div>
      </div>
      <CoachNoteBlock note={note} source={noteSource} />
      <DeferBlock lines={plan.defer} />
    </CardContent>
  );
}

function EmptyContentBlock({
  plan,
  minutes,
  onMinutes,
}: {
  plan: CoachPlan;
  minutes: CoachMinutes;
  onMinutes: (minutes: CoachMinutes) => void;
}) {
  return (
    <CardContent>
      <Empty className="border-0 p-0">
        <EmptyHeader className="max-w-xl">
          <EmptyMedia variant="icon">
            <CalendarDaysIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="text-section font-semibold text-foreground">
            {plan.headline}
          </EmptyTitle>
          <EmptyDescription className="text-base">
            {plan.summary}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-xl">
          {plan.nextReviewAt ? (
            <p className="text-support text-muted-foreground">
              Next review: {reviewDueLabel(plan.nextReviewAt)}
            </p>
          ) : null}
          {plan.counts.pausedCount > 0 ? (
            <p className="text-support text-muted-foreground tabular-nums">
              {plan.counts.pausedCount} paused review
              {plan.counts.pausedCount === 1 ? "" : "s"} in All reviews.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {plan.emptyReason === "no-fit" && minutes === 15 ? (
              <Button
                type="button"
                size="lg"
                className="text-base"
                onClick={() => onMinutes(30)}
              >
                Try 30 minutes
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="lg"
              className="text-base"
              render={<Link href="/problems" />}
            >
              Problem list
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base"
              render={<Link href="/reviews" />}
            >
              All reviews
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </CardContent>
  );
}

function LoadingCard() {
  return (
    <Card
      aria-busy="true"
      aria-label="Loading today's plan"
      className="ring-primary/20"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-56" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-7 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </CardContent>
      <PlanFooter />
    </Card>
  );
}

function ErrorCard({
  error,
  minutes,
  onMinutes,
  onRetry,
  refreshing,
}: {
  error: string | null;
  minutes: CoachMinutes;
  onMinutes: (minutes: CoachMinutes) => void;
  onRetry: () => void;
  refreshing: boolean;
}) {
  return (
    <Card className="ring-primary/20">
      <PlanHeader
        day={todayKey()}
        minutes={minutes}
        onChange={onMinutes}
        refreshing={refreshing}
      />
      <CardContent className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertTitle>{"Today's plan couldn't load"}</AlertTitle>
          <AlertDescription>
            {error ?? "The plan could not be read. Retry, or open your reviews."}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="lg"
            className="text-base"
            disabled={refreshing}
            onClick={onRetry}
          >
            {refreshing ? <Spinner data-icon="inline-start" /> : null}
            Retry
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base"
            render={<Link href="/reviews" />}
          >
            All reviews
          </Button>
        </div>
      </CardContent>
      <PlanFooter />
    </Card>
  );
}

export function TodayPlanCard() {
  const minutesState = usePersistedState<unknown>(
    COACH_MINUTES_KEY,
    DEFAULT_COACH_MINUTES,
  );
  const minutes: CoachMinutes = isCoachMinutes(minutesState.value)
    ? minutesState.value
    : DEFAULT_COACH_MINUTES;
  const { queue } = useReviewQueue();
  const planState = useCoachPlan({
    minutes,
    enabled: minutesState.hydrated,
    nextDueAt: queue?.nextDueAt ?? null,
  });
  const noteState = useCoachNote({
    plan: planState.plan,
    live: planState.live,
  });

  const changeMinutes = (next: CoachMinutes) => {
    minutesState.setValue(next);
  };

  if (!minutesState.hydrated) {
    return (
      <section aria-label="Today's plan">
        <LoadingCard />
      </section>
    );
  }

  if (!planState.plan) {
    if (planState.status === "error") {
      return (
        <section aria-labelledby="today-plan-title">
          <ErrorCard
            error={planState.error}
            minutes={minutes}
            onMinutes={changeMinutes}
            onRetry={() => void planState.refresh()}
            refreshing={planState.refreshing}
          />
        </section>
      );
    }
    return (
      <section aria-label="Today's plan">
        <LoadingCard />
      </section>
    );
  }

  const plan = planState.plan;
  return (
    <section aria-labelledby="today-plan-title">
      <Card className="ring-primary/20">
        <PlanHeader
          day={plan.day}
          minutes={minutes}
          onChange={changeMinutes}
          refreshing={planState.refreshing}
        />
        {planState.error ? (
          <div className="px-(--card-spacing)">
            <StaleRefresh
              error={planState.error}
              onRetry={() => void planState.refresh()}
            />
          </div>
        ) : null}
        {plan.state === "active" ? (
          <ActiveContent
            plan={plan}
            note={noteState.note}
            noteSource={noteState.source}
          />
        ) : plan.state === "done" ? (
          <DoneContent
            plan={plan}
            note={noteState.note}
            noteSource={noteState.source}
          />
        ) : (
          <EmptyContentBlock
            plan={plan}
            minutes={minutes}
            onMinutes={changeMinutes}
          />
        )}
        <PlanFooter />
      </Card>
    </section>
  );
}
