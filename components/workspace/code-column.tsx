"use client";

import type { RefObject } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

/** Height of the console's always-visible strip, in pixels. */
export const CONSOLE_STRIP_PX = 34;
/** Console height when expanded, as a percentage of the right column. */
export const CONSOLE_EXPANDED_SIZE = "38";

/**
 * The right column: editor on top, console below, one draggable divider.
 *
 * The console panel's minimum is the strip height rather than zero, so the
 * verdict strip is never hidden — "minimize" resizes the panel down to that
 * strip instead of collapsing it away.
 */
export function CodeColumn({
  editor,
  console: consolePane,
  consolePanelRef,
  onConsoleResize,
}: {
  editor: React.ReactNode;
  console: React.ReactNode;
  consolePanelRef: RefObject<PanelImperativeHandle | null>;
  onConsoleResize?: (inPixels: number) => void;
}) {
  return (
    <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
      <ResizablePanel defaultSize="62" minSize="20" className="min-h-0">
        {editor}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={CONSOLE_EXPANDED_SIZE}
        minSize={`${CONSOLE_STRIP_PX}px`}
        panelRef={consolePanelRef}
        className="min-h-0"
        onResize={(size) => onConsoleResize?.(size.inPixels)}
      >
        {consolePane}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
