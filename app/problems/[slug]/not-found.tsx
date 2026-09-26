import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProblemNotFound() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="font-mono text-lg font-medium tracking-tight">
        No problem with that slug
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The workspace only knows the problems in the catalog. Check the slug, or
        seed a problem with `pnpm db:seed`.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/problems"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to the problem list
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
