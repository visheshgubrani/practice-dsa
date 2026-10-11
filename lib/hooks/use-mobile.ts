"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";

/**
 * Below `md` (768px) the study navigation is a closed-by-default drawer rather
 * than the collapsible rail. It reads the project's SSR-safe media-query hook:
 * the server snapshot is `false`, so the first paint is the desktop rail and the
 * client upgrades to the drawer right after hydration.
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
