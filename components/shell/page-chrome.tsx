import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * The head of every study page: the sidebar control, one page title, and the
 * page's own actions. Navigation lives in the sidebar, so nothing here repeats
 * it.
 *
 * It stays a server component so pages can pass server-rendered actions; the
 * sidebar trigger is the only client piece.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  /** One supporting line — what the page shows, not what to do. */
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** A page-specific controls row, below the title line. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border bg-panel-2/50",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:px-8">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-page font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="text-support text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-4 md:px-8">
          {children}
        </div>
      ) : null}
    </header>
  );
}

/**
 * The scrolling body of a study page. One left-aligned content column, never
 * wider than 1200px, with the shared desktop/mobile padding.
 *
 * `bare` hands the whole area to a child that manages its own scrolling and
 * measure — the problem list, whose filter bar stays put while rows scroll.
 */
export function PageBody({
  children,
  className,
  bare = false,
}: {
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 pb-16 md:px-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
