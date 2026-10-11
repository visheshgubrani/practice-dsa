"use client"

import { useRef, useState } from "react"
import { ArrowUpIcon, ChevronDownIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { moreActionStates, primaryActionStates } from "@/lib/chat/actions"
import type { Language } from "@/lib/languages"
import type { Problem } from "@/lib/problems"
import { cn } from "@/lib/utils"

/**
 * The chat's action row: three one-press hints and a More help menu. Every
 * action sends an ordinary chat message through the same transport as typing.
 *
 * "Make it concrete" only makes sense once the tutor has said something, so it
 * waits for the first finished reply. Everything is disabled while an answer is
 * still streaming.
 */
export function ChatComposer({
  problem,
  language,
  isStreaming,
  hasTutorReply,
  onSend,
  onStop,
}: {
  problem: Problem
  language: Language
  isStreaming: boolean
  /** True once a tutor reply has finished, so "Make it concrete" has something to sharpen. */
  hasTutorReply: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function submit(text: string) {
    const trimmed = text.trim()
    if (trimmed.length === 0 || isStreaming) return
    onSend(trimmed)
    setValue("")
  }

  function runAction(action: { prompt: (input: { problem: Problem; language: Language }) => string }) {
    submit(action.prompt({ problem, language }))
  }

  const chips = primaryActionStates({ isStreaming, hasTutorReply })
  const moreActions = moreActionStates({ isStreaming })

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-panel-2 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map(({ action, disabled }) => (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size="xs"
            disabled={disabled}
            title={
              disabled && !isStreaming
                ? "Ask for a hint first — this sharpens the tutor's last explanation."
                : action.label
            }
            onClick={() => runAction(action)}
            className={cn("font-mono text-[11px] text-muted-foreground")}
          >
            {action.label}
          </Button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isStreaming}
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="font-mono text-[11px] text-muted-foreground"
              />
            }
          >
            More help
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-52">
            {/* A group label reads its group's id from context, so it needs the group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-mono text-[10.5px]">
                More help
              </DropdownMenuLabel>
              {moreActions.map(({ action, disabled }) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={disabled}
                  onClick={() => runAction(action)}
                  className="font-mono text-[11.5px]"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <InputGroup className="items-end bg-background">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit(value)
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
              textareaRef.current?.focus()
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
  )
}
