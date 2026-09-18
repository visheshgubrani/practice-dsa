"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a CSS media query in React. The server snapshot is always `false`, so
 * the first paint uses the compact layout and the client upgrades right after
 * hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Matches the `lg` breakpoint of the workbench layout. */
export function useIsWideLayout(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
