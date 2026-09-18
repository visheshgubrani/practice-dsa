import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Workbench prose: Geist Sans for reading, Geist Mono for anything that is
 * literally code, hairline rules instead of boxes, measure capped by the caller.
 */
const components: Components = {
  p: ({ node: _node, className, ...props }) => (
    <p
      className={cn("text-sm leading-[1.7] text-foreground/90", className)}
      {...props}
    />
  ),
  strong: ({ node: _node, className, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
  em: ({ node: _node, className, ...props }) => (
    <em className={cn("italic", className)} {...props} />
  ),
  a: ({ node: _node, className, ...props }) => (
    <a
      className={cn(
        "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={cn("flex list-disc flex-col gap-1.5 pl-5 text-sm leading-[1.7]", className)}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol
      className={cn(
        "flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-[1.7]",
        className,
      )}
      {...props}
    />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li className={cn("pl-0.5", className)} {...props} />
  ),
  h1: ({ node: _node, className, ...props }) => (
    <h1
      className={cn("font-mono text-sm font-medium tracking-tight text-foreground", className)}
      {...props}
    />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2
      className={cn("font-mono text-sm font-medium tracking-tight text-foreground", className)}
      {...props}
    />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3
      className={cn("font-mono text-xs font-medium tracking-tight text-muted-foreground", className)}
      {...props}
    />
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr className={cn("border-border", className)} {...props} />
  ),
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote
      className={cn(
        "border-l-2 border-border pl-4 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ node: _node, className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-md border border-border bg-panel-2 p-3 font-mono text-[12.5px] leading-[1.6]",
        className,
      )}
      {...props}
    />
  ),
  code: ({ node: _node, className, children, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");

    if (isBlock) {
      return (
        <code className={cn("font-mono text-[12.5px]", className)} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className={cn(
          "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.82em] text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ node: _node, className, ...props }) => (
    <div className="overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  ),
  th: ({ node: _node, className, ...props }) => (
    <th
      className={cn(
        "border-b border-border px-2 py-1 text-left font-mono text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }) => (
    <td
      className={cn("border-b border-border/60 px-2 py-1 align-top", className)}
      {...props}
    />
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
