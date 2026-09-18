"use client";

import { useRef, useState } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { QUICK_ACTIONS } from "@/lib/ai/prompts";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import { cn } from "@/lib/utils";

export function ChatComposer({
  problem,
  language,
  isStreaming,
  onSend,
  onStop,
}: {
  problem: Problem;
  language: Language;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || isStreaming) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-panel-2 p-2.5">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isStreaming}
            onClick={() => submit(action.prompt({ problem, language }))}
            className={cn(
              "rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors",
              "hover:border-primary/40 hover:text-foreground",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      <InputGroup className="items-end bg-background">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(value);
            }
          }}
          rows={2}
          aria-label="Message the tutor"
          placeholder="Ask for a hint, or paste what you tried…"
          className="max-h-40 min-h-[52px] resize-none text-sm"
        />
        <InputGroupAddon
          align="inline-end"
          className="pb-1.5"
          onClick={(event) => {
            // The default addon handler looks for an <input>; ours is a textarea.
            if (!(event.target as HTMLElement).closest("button")) {
              textareaRef.current?.focus();
            }
          }}
        >
          {isStreaming ? (
            <InputGroupButton
              size="icon-sm"
              aria-label="Stop generating"
              onClick={onStop}
            >
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              size="icon-sm"
              aria-label="Send message"
              disabled={value.trim().length === 0}
              onClick={() => submit(value)}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>

      <p className="px-0.5 font-mono text-[10.5px] text-muted-foreground/70">
        Enter sends · Shift+Enter adds a line
      </p>
    </div>
  );
}
