"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { scheduleLocalMidnight } from "@/lib/coach/boundary";
import { fetchCoachPlan } from "@/lib/coach/client";
import type { CoachMinutes, CoachPlan } from "@/lib/coach/types";
import { utcOffsetMinutesFor } from "@/lib/practice/days";
import { scheduleReviewBoundary } from "@/lib/reviews/boundary";
import { REVIEW_QUEUE_CHANGED_EVENT } from "@/lib/reviews/client";

/**
 * One client loader for today's plan.
 *
 * The day is the browser's, so the first read happens after the time-budget
 * preference hydrates and every request carries the current UTC offset. The
 * hook keeps the last plan on a same-budget refresh failure, but clears it when
 * the budget changes: a 15-minute plan must never be shown under a 30-minute
 * label. Stale requests are aborted and latest-wins.
 */

export type CoachPlanStatus = "loading" | "ready" | "error";

export type CoachPlanState = {
  plan: CoachPlan | null;
  live: boolean;
  status: CoachPlanStatus;
  error: string | null;
  refreshing: boolean;
  refresh: (silent?: boolean) => Promise<CoachPlan | null>;
};

export function useCoachPlan(input: {
  minutes: CoachMinutes;
  enabled: boolean;
  nextDueAt?: string | null;
}): CoachPlanState {
  const { minutes, enabled, nextDueAt = null } = input;
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<CoachPlanStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const planRef = useRef<CoachPlan | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(
    (silent = false): Promise<CoachPlan | null> => {
      if (!enabled) return Promise.resolve(null);

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const request = requestRef.current + 1;
      requestRef.current = request;

      // A budget change invalidates the old plan; a same-budget refresh keeps
      // it visible while the new read is in flight.
      if (planRef.current !== null && planRef.current.minutes !== minutes) {
        planRef.current = null;
        setPlan(null);
        setLive(false);
        setStatus("loading");
      }
      if (!silent) setRefreshing(true);
      setError(null);

      return fetchCoachPlan({
        minutes,
        utcOffsetMinutes: utcOffsetMinutesFor(),
        signal: controller.signal,
      })
        .then((response) => {
          if (request !== requestRef.current) return null;
          planRef.current = response.plan;
          setPlan(response.plan);
          setLive(response.live);
          setStatus("ready");
          setError(null);
          return response.plan;
        })
        .catch((cause: unknown) => {
          if (request !== requestRef.current || controller.signal.aborted) {
            return null;
          }
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load today's plan.",
          );
          setStatus((current) => (current === "ready" ? "ready" : "error"));
          return null;
        })
        .finally(() => {
          if (request !== requestRef.current) return;
          controllerRef.current = null;
          setRefreshing(false);
        });
    },
    [enabled, minutes],
  );

  // Initial load and budget changes. The small delay collapses quick taps on
  // the budget control into one request.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      void refresh(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [enabled, minutes, refresh]);

  // Focus, visibility, back-forward cache, and a review write anywhere.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const onPageShow = () => void refresh(true);

    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  // A review becoming due changes today's plan without a user action.
  useEffect(() => {
    if (!enabled || !nextDueAt) return;
    return scheduleReviewBoundary(nextDueAt, () => void refresh(true));
  }, [enabled, nextDueAt, refresh]);

  // Yesterday's plan must not survive into today.
  useEffect(() => {
    if (!enabled) return;
    return scheduleLocalMidnight(() => void refresh(true));
  }, [enabled, refresh]);

  // Abort the in-flight read on unmount so its failure cannot touch state.
  useEffect(
    () => () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  return { plan, live, status, error, refreshing, refresh };
}
