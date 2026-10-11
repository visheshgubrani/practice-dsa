"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, ListTreeIcon, RepeatIcon } from "lucide-react";

import { ReviewQueueProvider } from "@/components/reviews/review-queue-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useReviewQueue } from "@/lib/hooks/use-review-queue";
import type { ReviewQueue } from "@/lib/reviews/types";

/** 248px expanded, 64px compact. */
const SIDEBAR_WIDTHS = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": "4rem",
} as React.CSSProperties;

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/problems", label: "Problems", icon: ListTreeIcon },
  { href: "/reviews", label: "Reviews", icon: RepeatIcon },
] as const;

function StudySidebar() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { queue, status } = useReviewQueue();

  // One navigation definition, two presentations: on a phone the drawer closes
  // as soon as the route it opened changes.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const dueCount = status === "ready" ? (queue?.dueCount ?? 0) : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="DSA Software"
              render={<Link href="/" aria-label="DSA Software dashboard" />}
            >
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/12 font-mono text-sm font-semibold text-primary"
              >
                d.
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base leading-none font-semibold">
                  DSA Software
                </span>
                <span className="truncate text-support leading-none text-muted-foreground">
                  practice workbench
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                const badge =
                  item.href === "/reviews" && dueCount !== null && dueCount > 0
                    ? dueCount
                    : null;
                const tooltip =
                  badge === null
                    ? item.label
                    : `${item.label} · ${badge} due`;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={tooltip}
                      aria-label={tooltip}
                      aria-current={active ? "page" : undefined}
                      className="h-10 gap-2.5 text-base data-active:bg-primary/10 data-active:text-primary"
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {badge === null ? null : (
                      <SidebarMenuBadge className="bg-primary/12 text-primary tabular-nums">
                        {badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

/**
 * The shared shell for the three study pages: one navigation definition, the
 * content column beside it, and the review queue read once on the server so the
 * badge and the pages start from the same data.
 */
export function StudyShell({
  defaultOpen,
  initialQueue,
  initialError,
  children,
}: {
  defaultOpen: boolean;
  initialQueue: ReviewQueue | null;
  initialError: string | null;
  children: React.ReactNode;
}) {
  return (
    <ReviewQueueProvider initialQueue={initialQueue} initialError={initialError}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={SIDEBAR_WIDTHS}
        className="h-svh min-h-0 overflow-hidden"
      >
        <StudySidebar />
        <div className="flex h-svh min-h-0 w-full flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarProvider>
    </ReviewQueueProvider>
  );
}
