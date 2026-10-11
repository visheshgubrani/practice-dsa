"use client";

import { LayoutGridIcon, ListTreeIcon, RepeatIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The workbench title bar. Mono for chrome, amber only for the primary action,
 * hairline separators instead of cards.
 *
 * The workspace sits outside the study shell on purpose — it is a full-width
 * editor — so it carries the same three destinations as icons.
 */
export function AppHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 border-b border-border bg-panel-2 px-2",
        className,
      )}
    >
      <Link
        href="/"
        aria-label="Back to the dashboard"
        title="Dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <LayoutGridIcon />
      </Link>
      <Link
        href="/problems"
        aria-label="Back to the problem list"
        title="Problem list"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <ListTreeIcon />
      </Link>
      <Link
        href="/reviews"
        aria-label="Reviews"
        title="Reviews"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <RepeatIcon />
      </Link>
      <span
        aria-hidden
        className="h-5 w-px shrink-0 bg-border"
        role="presentation"
      />
      {children}
    </header>
  );
}
