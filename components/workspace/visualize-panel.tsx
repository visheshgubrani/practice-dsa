"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  FootprintsIcon,
  Maximize2Icon,
  Minimize2Icon,
  PlayIcon,
  XIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import { cn } from "@/lib/utils";
import { requestTrace } from "@/lib/visualizer/client";
import type { VisualizeResponse } from "@/lib/visualizer/types";

/**
 * The dry run, drawn.
 *
 * A tab rather than a button beside Run, because a step-through is not a run:
 * it is a place you go to look at what the code does, and it wants its own case
 * selector, its own notice when the engine is simulated, and room to breathe.
 *
 * The picture lives in a same-origin iframe (`/vendor/python-tutor/frame.html`)
 * for one reason: Python Tutor ships its own jQuery, d3 and stylesheet, and the
 * frame keeps all of that out of the workbench's DOM. The parent owns the trace
 * — it asked the engine for it — and hands it over by `postMessage`; the frame
 * owns nothing but the drawing and the current step.
 */

const FRAME_SRC = "/vendor/python-tutor/frame.html";

type TraceState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; message: string }
  | { status: "ready"; result: VisualizeResponse };

export type TraceFrameHandle = { requestStep: () => void };

/**
 * One mounted visualizer.
 *
 * A new trace means a new `key` from the parent, so this component's whole
 * lifecycle is "the trace I was mounted with": it waits for the frame to say it
 * is ready, posts the trace once, then only relays steps.
 */
function TraceFrame({
  result,
  from,
  onStep,
  onError,
  handleRef,
  className,
}: {
  result: VisualizeResponse;
  /** The step to open on. Captured at mount; later changes are ignored. */
  from: number;
  onStep?: (step: number) => void;
  onError?: (message: string) => void;
  handleRef?: React.RefObject<TraceFrameHandle | null>;
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const startRef = useRef(from);
  const sentRef = useRef(false);
  const [ready, setReady] = useState(false);

  const post = useCallback((message: unknown) => {
    const frame = iframeRef.current;
    const target = frame?.contentWindow;
    if (!target) return;
    target.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = { requestStep: () => post({ type: "dsa:current-step" }) };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, post]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      // Two frames can exist (inline and popped out); only one is mine.
      if (event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data as
        | { type?: unknown; step?: unknown; message?: unknown }
        | null;
      if (typeof data !== "object" || data === null) return;

      if (data.type === "dsa:ready") {
        setReady(true);
      } else if (data.type === "dsa:step" && typeof data.step === "number") {
        onStep?.(data.step);
      } else if (data.type === "dsa:error" && typeof data.message === "string") {
        onError?.(data.message);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onError, onStep]);

  useEffect(() => {
    if (!ready || sentRef.current) return;
    sentRef.current = true;
    post({
      type: "dsa:trace",
      code: result.code,
      trace: result.trace,
      options: { startingInstruction: startRef.current },
    });
  }, [post, ready, result]);

  return (
    <iframe
      ref={iframeRef}
      src={FRAME_SRC}
      title="Execution trace"
      // Two triggers, one send: `dsa:ready` from the frame's own script, or the
      // load event, which is guaranteed to arrive after that script has run.
      // Either one alone can be missed — a frame that is already loaded posts
      // its ready before this component's listener exists.
      onLoad={() => setReady(true)}
      className={cn("h-full w-full border-0 bg-white", className)}
    />
  );
}

const OUTCOME_LABEL = {
  completed: "ran to the end",
  exception: "ended on an exception",
  syntax_error: "did not compile",
  step_limit: "stopped at the step limit",
} as const;

function StatusLine({ result }: { result: VisualizeResponse }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-panel-2 px-2 py-1 font-mono text-[11px] text-muted-foreground">
      <span>
        {result.steps} step{result.steps === 1 ? "" : "s"}
      </span>
      <span>{OUTCOME_LABEL[result.outcome]}</span>
      {result.engine.timeMs !== undefined ? (
        <span>{result.engine.timeMs} ms in the tracer</span>
      ) : null}
      <span>Python {result.engine.version}</span>
      <span className="ml-auto">visualizing is not submitting</span>
    </div>
  );
}

export type VisualizePanelProps = {
  problem: Problem;
  language: Language;
  /** The editor buffer, exactly as it stands. */
  source: string;
  testcaseIndex: number;
  onTestcaseChange: (index: number) => void;
  /** True when Run and Submit are answered without executing anything. */
  simulated: boolean;
};

export function VisualizePanel({
  problem,
  language,
  source,
  testcaseIndex,
  onTestcaseChange,
  simulated,
}: VisualizePanelProps) {
  const [state, setState] = useState<TraceState>({ status: "idle" });
  const [frameError, setFrameError] = useState<string | null>(null);
  const [poppedOut, setPoppedOut] = useState(false);
  const [step, setStep] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [pendingPopOut, setPendingPopOut] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const frameHandleRef = useRef<TraceFrameHandle | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const visualize = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = requestRef.current + 1;
    requestRef.current = id;

    setState({ status: "running" });
    setFrameError(null);
    setStep(0);
    setPoppedOut(false);

    const outcome = await requestTrace(
      {
        slug: problem.slug,
        language: language.id,
        source,
        testcaseIndex,
      },
      controller.signal,
    );

    // A slower earlier request must never overwrite a newer trace.
    if (id !== requestRef.current) return;
    if (!outcome.ok) {
      if (outcome.aborted) {
        setState({ status: "idle" });
        return;
      }
      setState({ status: "error", message: outcome.error });
      return;
    }

    setEpoch((current) => current + 1);
    setState({ status: "ready", result: outcome.result });
  }, [language.id, problem.slug, source, testcaseIndex]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    requestRef.current += 1;
    setState({ status: "idle" });
  }, []);

  const handleStep = useCallback(
    (next: number) => {
      setStep(next);
      if (pendingPopOut) {
        setPoppedOut(true);
        setPendingPopOut(false);
      }
    },
    [pendingPopOut],
  );

  const popOut = useCallback(() => {
    // Ask the inline frame where it is, so popping out keeps your place.
    frameHandleRef.current?.requestStep();
    setPendingPopOut(true);
    // If the frame never answers (it is not drawn yet), open anyway.
    window.setTimeout(() => {
      setPendingPopOut((pending) => {
        if (pending) setPoppedOut(true);
        return false;
      });
    }, 400);
  }, []);

  useEffect(() => {
    if (!poppedOut) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPoppedOut(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [poppedOut]);

  const result = state.status === "ready" ? state.result : null;
  const drawable = result !== null && result.outcome !== "syntax_error";

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-panel-2 px-2">
        <ToggleGroup
          value={[String(testcaseIndex)]}
          onValueChange={(next) => {
            const value = next[0];
            if (value !== undefined) onTestcaseChange(Number(value));
          }}
          size="sm"
          spacing={1}
        >
          {problem.testcases.map((_, index) => (
            <ToggleGroupItem
              key={index}
              value={String(index)}
              className="px-2 font-mono text-[11px]"
            >
              Case {index + 1}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          one visible case · step through, not submit
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {state.status === "running" ? (
            <Button variant="ghost" size="xs" onClick={cancel}>
              Cancel
            </Button>
          ) : null}
          {result && drawable ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={poppedOut ? "Put the trace back" : "Pop the trace out"}
              onClick={() => {
                if (poppedOut) {
                  setPoppedOut(false);
                  return;
                }
                // Ask the inline frame for its step first, so popping out
                // reopens where you were rather than at step 0.
                popOut();
              }}
            >
              {poppedOut ? <Minimize2Icon /> : <Maximize2Icon />}
            </Button>
          ) : null}
          <Button
            size="xs"
            onClick={() => {
              void visualize();
            }}
            disabled={state.status === "running" || simulated}
          >
            {state.status === "running" ? <Spinner /> : <PlayIcon />}
            {result ? "Trace again" : "Visualize"}
          </Button>
        </div>
      </div>

      {simulated ? (
        <div className="p-3">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>The visualizer needs the real engine</AlertTitle>
            <AlertDescription>
              This app is running the mock runner, which executes nothing. Set{" "}
              <code className="font-mono">PISTON_URL</code> and start the engine
              with <code className="font-mono">pnpm piston:up</code>, then
              visualize again.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {state.status === "idle" && !simulated ? (
          <div className="flex h-full items-center justify-center p-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FootprintsIcon />
                </EmptyMedia>
                <EmptyTitle>Step through a dry run</EmptyTitle>
                <EmptyDescription>
                  Visualize runs case {testcaseIndex + 1} of this problem in the
                  execution sandbox and draws every step: the call stack, the
                  lists and dicts as they change, and the arrows between them.
                  Nothing is submitted and nothing is marked solved.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : null}

        {state.status === "running" ? (
          <div className="flex h-full items-center justify-center gap-2 font-mono text-[12px] text-muted-foreground">
            <Spinner />
            tracing case {testcaseIndex + 1}…
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Could not trace this case</AlertTitle>
              <AlertDescription>
                <p>{state.message}</p>
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2"
                  onClick={() => {
                    void visualize();
                  }}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {result && result.outcome === "syntax_error" ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Syntax error — there is nothing to draw yet</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap font-mono text-[11.5px]">
                  {result.message ?? "The program did not compile."}
                </p>
                <p className="mt-2">
                  The traced program is the editor buffer, so this is the same
                  error Run would report.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {result && result.truncated ? (
          <div className="border-b border-border px-3 py-2">
            <Alert>
              <FootprintsIcon />
              <AlertTitle>Stopped at {result.steps} steps</AlertTitle>
              <AlertDescription>
                {result.message ??
                  "This loop needs more steps than the visualizer draws."}{" "}
                Pick a smaller case, or narrow the loop to the part you want to
                see.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {frameError ? (
          <div className="border-b border-border px-3 py-2">
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>The trace could not be drawn</AlertTitle>
              <AlertDescription>{frameError}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {result && drawable ? (
          <TraceFrame
            key={`${epoch}:inline`}
            result={result}
            from={step}
            onStep={handleStep}
            onError={setFrameError}
            handleRef={frameHandleRef}
            className="h-full"
          />
        ) : null}
      </div>

      {result && drawable ? <StatusLine result={result} /> : null}

      {result && drawable && poppedOut ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-panel-2 px-3">
            <span className="truncate font-mono text-[11px]">
              Dry run · {problem.title} · case {testcaseIndex + 1}
            </span>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Close the dry run"
                onClick={() => setPoppedOut(false)}
              >
                <XIcon />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <TraceFrame
              key={`${epoch}:popout`}
              result={result}
              from={step}
              onStep={handleStep}
              onError={setFrameError}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
