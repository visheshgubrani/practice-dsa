import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reopen a solved problem for another pass.
 *
 * It is a link, not a mutation: nothing about the stored solve changes when you
 * press it. The workspace it opens starts from the code you were accepted with,
 * and the Submit there records a revision — history grows, `solvedAt` does not
 * move, and the draft you had is left alone.
 *
 * `label` renders the text form used in the header; without it the control is
 * an icon button, which is what the problem rows and the catalog table use.
 */
export function ReviseButton({
  slug,
  label,
  title,
  variant = "ghost",
  className,
}: {
  slug: string;
  /** Text to show beside the icon. Omit for the icon-only form. */
  label?: string;
  /** Overrides the tooltip and the accessible name. */
  title?: string;
  variant?: "ghost" | "outline";
  className?: string;
}) {
  const name = title ?? `Revise ${slug}`;

  return (
    <Link
      href={`/problems/${slug}?revise=1`}
      aria-label={name}
      title={label ? undefined : name}
      className={cn(
        buttonVariants({ variant, size: label ? "sm" : "icon-xs" }),
        label ? "font-mono text-xs" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <RotateCcwIcon data-icon={label ? "inline-start" : undefined} />
      {label}
    </Link>
  );
}
