"use client";

import { useCallback, useEffect, useState } from "react";
import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchSubmission,
  fetchSubmissions,
  type SubmissionDetail,
  type SubmissionSummary,
} from "@/lib/submissions/client";
import { VERDICT_LABEL, verdictTone } from "@/lib/runner/types";
import { cn } from "@/lib/utils";

import { CaseResults } from "./case-results";

const TONE_TEXT = {
  success: "text-success",
  danger: "text-destructive",
  info: "text-info",
} as const;

const PAGE_SIZE = 20;

export function sourcePreview(source: string): string {
  const line =
    source.split("\n").find((entry) => entry.trim().length > 0)?.trim() ?? "";
  if (line.length <= 72) return line;
  return `${line.slice(0, 71)}…`;
}

function HistoryRow({
  item,
  expanded,
  detail,
  loadingDetail,
  onToggle,
  onLoad,
  onRetryDetail,
}: {
  item: SubmissionSummary;
  expanded: boolean;
  detail: SubmissionDetail | null;
  loadingDetail: boolean;
  onToggle: () => void;
  onLoad: () => void;
  onRetryDetail: () => void;
}) {
  const simulated = item.runner === "mock";
  const preview = sourcePreview(item.source);

  return (
    <li className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-0.5 px-0 py-2 text-left hover:bg-muted/40"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11.5px]">
          <span
            className={cn("font-medium", TONE_TEXT[verdictTone(item.verdict)])}
          >
            {VERDICT_LABEL[item.verdict]}
          </span>
          <span className="text-muted-foreground">
            {item.mode === "submit" ? "submit" : "run"}
          </span>
          <span className="text-muted-foreground">
            {item.passedCount}/{item.totalCount}
          </span>
          {simulated ? (
            <Badge
              variant="outline"
              className="border-difficulty-medium/40 bg-difficulty-medium/10 font-mono text-[10px] text-difficulty-medium"
            >
              simulated
            </Badge>
          ) : null}
          {item.isRevision ? (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 font-mono text-[10px] text-primary"
            >
              revise
            </Badge>
          ) : null}
          <span className="ml-auto text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </span>
        </div>
        {preview ? (
          <span className="truncate font-mono text-[11px] text-muted-foreground/80">
            {preview}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="flex flex-col gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLoad}>
              <DownloadIcon data-icon="inline-start" />
              Load into editor
            </Button>
            {item.timeMs != null ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.timeMs} ms
              </span>
            ) : null}
            {item.catalogRevision ? (
              <span
                className="truncate font-mono text-[10px] text-muted-foreground/70"
                title={`Catalog revision ${item.catalogRevision}`}
              >
                catalog {item.catalogRevision}
              </span>
            ) : null}
          </div>
          <pre className="max-h-[220px] overflow-auto rounded-md border border-border bg-panel-2 p-2.5 font-mono text-[12px] leading-[1.55]">
            {item.source}
          </pre>
          {loadingDetail ? (
            <div className="flex items-center gap-2 py-1">
              <Spinner className="text-info" />
              <span className="font-mono text-[11px] text-muted-foreground">
                Loading cases…
              </span>
            </div>
          ) : detail ? (
            <>
              {detail.compileOutput ? (
                <pre className="overflow-x-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-[11.5px] whitespace-pre-wrap text-destructive/90">
                  {detail.compileOutput}
                </pre>
              ) : null}
              <CaseResults cases={detail.cases} />
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11.5px] text-muted-foreground">
                Case details could not be loaded.
              </span>
              <Button variant="outline" size="sm" className="self-start" onClick={onRetryDetail}>
                Retry
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function HistoryPanel({
  slug,
  epoch,
  onLoadSource,
}: {
  slug: string;
  /** Bump after a persisted run so the list refetches. */
  epoch: number;
  onLoadSource: (source: string, language: string) => void;
}) {
  const [items, setItems] = useState<SubmissionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, SubmissionDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(
    async (offset = 0, signal?: AbortSignal) => {
      try {
        const list = await fetchSubmissions(slug, {
          limit: PAGE_SIZE,
          offset,
          signal,
        });
        if (signal?.aborted) return;
        setItems((previous) =>
          offset === 0 ? list.items : [...previous, ...list.items],
        );
        setTotal(list.total);
        setStatus("ready");
        setError(null);
      } catch (caught) {
        if (signal?.aborted) return;
        setStatus("error");
        setError(
          caught instanceof Error ? caught.message : "Could not load history.",
        );
      }
    },
    [slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchSubmissions(slug, {
      limit: PAGE_SIZE,
      offset: 0,
      signal: controller.signal,
    }).then(
      (list) => {
        setItems(list.items);
        setTotal(list.total);
        setStatus("ready");
        setError(null);
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          caught instanceof Error ? caught.message : "Could not load history.",
        );
      },
    );
    return () => controller.abort();
  }, [slug, epoch]);

  const fetchDetail = useCallback((id: string) => {
    setLoadingId(id);
    void fetchSubmission(id).then(
      (detail) => {
        setDetails((previous) => ({ ...previous, [id]: detail }));
        setLoadingId((current) => (current === id ? null : current));
      },
      () => {
        setLoadingId((current) => (current === id ? null : current));
      },
    );
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const opening = selectedId !== id;
      setSelectedId(opening ? id : null);
      if (opening && !details[id]) fetchDetail(id);
    },
    [details, fetchDetail, selectedId],
  );

  if (status === "loading" && items.length === 0) {
    return (
      <div className="flex items-center gap-2.5 py-2">
        <Spinner className="text-info" />
        <span className="font-mono text-xs text-muted-foreground">
          Loading history…
        </span>
      </div>
    );
  }

  if (status === "error" && items.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
        <span className="font-mono text-xs font-medium text-destructive">
          History could not be loaded
        </span>
        <p className="font-mono text-[11.5px] text-muted-foreground">{error}</p>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatus("loading");
              setError(null);
              void load(0);
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyTitle>No history yet</EmptyTitle>
          <EmptyDescription>
            Run and Submit land here, including simulated mock runs. Load one
            into the editor to keep working from that snapshot.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul>
        {items.map((item) => (
          <HistoryRow
            key={item.id}
            item={item}
            expanded={selectedId === item.id}
            detail={details[item.id] ?? null}
            loadingDetail={loadingId === item.id}
            onToggle={() => toggle(item.id)}
            onLoad={() => onLoadSource(item.source, item.language)}
            onRetryDetail={() => fetchDetail(item.id)}
          />
        ))}
      </ul>
      {items.length < total ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => void load(items.length)}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
