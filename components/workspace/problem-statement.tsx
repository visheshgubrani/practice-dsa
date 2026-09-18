"use client";

import { Markdown } from "@/components/markdown";
import type { Problem } from "@/lib/problems";

export function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="max-w-[68ch]">
        <Markdown>{problem.statement}</Markdown>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs text-muted-foreground">Examples</h2>
        <div className="flex flex-col gap-2.5">
          {problem.examples.map((example, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-border bg-panel-2 p-3"
            >
              <p className="font-mono text-[11px] text-muted-foreground">
                Example {index + 1}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-mono text-[12.5px]">
                <dt className="text-muted-foreground">Input:</dt>
                <dd className="text-foreground/90">{example.input}</dd>
                <dt className="text-muted-foreground">Output:</dt>
                <dd className="text-foreground/90">{example.output}</dd>
                {example.explanation ? (
                  <>
                    <dt className="text-muted-foreground">Explanation:</dt>
                    <dd className="text-muted-foreground">
                      {example.explanation}
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs text-muted-foreground">Constraints</h2>
        <ul className="flex flex-col gap-1.5">
          {problem.constraints.map((constraint) => (
            <li
              key={constraint}
              className="flex gap-2 font-mono text-[12.5px] text-foreground/90"
            >
              <span aria-hidden className="text-muted-foreground/60">
                ·
              </span>
              <Markdown className="flex-1">{constraint}</Markdown>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
