"use client";

import { useEffect, useRef, useState } from "react";

import { readCachedNote, writeCachedNote } from "@/lib/coach/cache";
import { requestCoachNote } from "@/lib/coach/client";
import { coachNoteRequestForPlan } from "@/lib/coach/plan";
import type { CoachPlan } from "@/lib/coach/types";

/**
 * The plan note, with the LLM as an optional upgrade.
 *
 * The deterministic fallback is shown immediately. An LLM note is requested
 * only for an active plan with a configured key, once per plan fingerprint per
 * session, after a short settle delay. A failure leaves the fallback in place;
 * it is never an alert.
 */

export type CoachNoteSource = "fallback" | "llm";

export type CoachNoteState = {
  note: string | null;
  source: CoachNoteSource;
};

const SETTLE_MS = 1_000;

export function useCoachNote(input: {
  plan: CoachPlan | null;
  live: boolean;
}): CoachNoteState {
  const { plan, live } = input;
  const [note, setNote] = useState<string | null>(plan?.fallbackNote ?? null);
  const [source, setSource] = useState<CoachNoteSource>("fallback");
  const attemptedRef = useRef(new Set<string>());
  const planRef = useRef<CoachPlan | null>(plan);

  // Keep the latest plan available to the effect without re-running it for an
  // equal plan object, and without assigning a ref during render.
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // Depend on the facts that identify the note, not the plan object: a focus
  // refresh returns an equal plan with a new identity, and it must not abort
  // the note request that is already in flight.
  const fingerprint = plan?.fingerprint ?? null;
  const fallbackNote = plan?.fallbackNote ?? null;
  const planState = plan?.state ?? null;

  useEffect(() => {
    const current = planRef.current;

    if (!current) {
      setNote(null);
      setSource("fallback");
      return;
    }

    // The fallback is complete on its own and is always the first paint.
    setNote(current.fallbackNote);
    setSource("fallback");

    if (current.state !== "active" || !live) return;

    const cached = readCachedNote(current.fingerprint);
    if (cached !== null) {
      setNote(cached);
      setSource("llm");
      return;
    }
    if (attemptedRef.current.has(current.fingerprint)) return;

    attemptedRef.current.add(current.fingerprint);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void requestCoachNote(coachNoteRequestForPlan(current), {
        signal: controller.signal,
      })
        .then((response) => {
          if (controller.signal.aborted) return;
          if (response.fingerprint !== current.fingerprint) return;
          setNote(response.note);
          setSource("llm");
          writeCachedNote(current.fingerprint, response.note);
        })
        .catch(() => {
          // The fallback is already displayed; a note failure is not an error
          // state for the plan.
        });
    }, SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fingerprint, fallbackNote, planState, live]);

  return { note, source };
}
