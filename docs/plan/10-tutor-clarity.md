# Follow-up — Tutor clarity: complete answers, plain language, one next action

**Status:** complete

Phase 5 shipped durable chats. [Phase 6](./06-tutor-hints.md) tightened *how* the tutor uses the disclosed context: one relevant issue and a small next step. This follow-up fixes what that contract still got wrong in practice.

The Encode and Decode Strings chat is the evidence. Each reply was inside the word budget (~100–120 words) and no full solution leaked, so length and disclosure were never the problem. Five turns were spent conveying one design, two of them asking the user to write and then amend a comment that was already in the buffer, and the framing stayed abstract ("there is no fixed format", "self-describing", "the only channel").

Worked ahead of Phase 9 by direct request. It does not change that phase's status, and it makes **no** model, API, database, or schema change.

## Work units

### 10.1 Answer the question that was asked, in full

- [x] Replace "identify one issue … do not skip ahead" with a contract that answers the asked question completely: if the answer needs three facts, give all three in one reply. Not skipping ahead means not volunteering the *next* unasked step, not withholding part of the answer to the question asked.
- [x] Keep the "no pairing map, complete loop, or working control flow unless they explicitly ask for the full solution" limit inside that rule.
- [x] When the user asks how one mechanism works, describe it completely and show one tiny concrete example (`["hi","bye"] -> 2#hi3#bye`). Show the format or the intermediate value, not the Python that produces it; write code only when they ask for code or the full solution.
- [x] Replace the stuck rule: when they are lost, drop one level to the smallest concrete scale and shrink the ask to a single move, instead of escalating specificity on the same idea. Never repeat an explanation already given in the thread.

### 10.2 Plain language

- [x] Add a plain-language rule: write as you would to someone typing the next line, use their identifiers and one concrete input, and do not explain a design space, category, or tradeoff when the question was how to do one thing.
- [x] Name the design vocabulary that made the codec chat hard to act on — *self-describing, unambiguous, boundary, channel, schema* — and ban it unless the user used it first.
- [x] Tighten the reply budget from about 150 words to about 120, one idea and at most one bolded phrase. Broader reviews and deeper explanations still opt out.

### 10.3 End every reply with one action

- [x] Require a final line starting with `Next:` naming a single concrete action: a line to write, a value to work out, or one question to answer. Prefer an action that changes code.
- [x] Forbid re-asking: check the attached buffer and the attempt state first, never ask for work the buffer already shows, and treat a comment edit as no action at all unless there is no code.
- [x] Render that line emphasized in the chat pane only (`Markdown highlightNext`); problem statements and notes are untouched.

### 10.4 Computed attempt state

- [x] Add `lib/ai/attempt.ts`: which methods the problem expects (`roundTrip`, `calls`, or the single function), whether each is defined, and whether its body is empty — comments, blank lines, and a bare `pass` are not work.
- [x] Attach that block to the workspace context so the tutor can see where the attempt actually stands, and instruct it to use the block to pick the step without reciting it back.
- [x] Keep it advisory: nothing here reaches judging, and a regex miss costs hint specificity, never a verdict.

### 10.5 A way to ask for the simpler version

- [x] Add the `Explain it simply` quick action: the current step, smallest concrete input, one idea, one `Next:` action, nothing new.
- [x] Point the hint quick action at `one Next: action`.
- [x] Give every scripted demo reply the same closing `Next:` line, and a branch for the simplify question. Demo mode still refuses to claim it read the attempt.

### 10.6 Tests and live review

- [x] `lib/ai/attempt.test.ts`: the transcript buffer, comment-only and `pass`-only bodies, a missing method, a nested helper that must not shadow the method, a call-problem starter, and a blank buffer.
- [x] `lib/ai/prompts.test.ts`: assertions for the full-answer, plain-language, jargon, `Next:`, no-re-ask, attempt-state, and word-budget rules; the workspace-context wiring; the simplify chip; the demo `Next:` line. Existing disclosure, attribution, and leakage assertions preserved.
- [x] Extend `scripts/chat-smoke.mts`: deterministic payload checks for the attempt state and the new rules, then replay the four codec questions live and assert each answer ends with a `Next:` action, stays under 160 words, avoids the banned vocabulary, never re-asks for the buffer's existing comment, and never pastes a working codec.
- [x] Read the four live answers for relevance and clarity, and paste them below. Prompt assertions alone do not establish answer quality.
- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm chat:smoke`.

**Files:** `lib/ai/attempt.ts`, `lib/ai/attempt.test.ts`, `lib/ai/prompts.ts`, `lib/ai/prompts.test.ts`, `components/markdown.tsx`, `components/workspace/ai-chat.tsx`, `scripts/chat-smoke.mts`

## Gate

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm chat:smoke`

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (316), `pnpm build`; `pnpm chat:smoke` — all 85 checks passed live against `deepseek-flash`, including the four codec turns. The first live run failed one check (`no design vocabulary`, the reply said "unambiguously"), so the rule was tightened to name a concrete replacement. Re-ran clean.

The transcript's own questions, replayed with the same buffer. Each answer landed in one turn, in plain words, and closed with one action.

> **"what approach to take here? Im confused where to start with"**
>
> Don't split on a delimiter — the strings can contain your delimiter. Instead prefix each string with **how many characters it has**, then the characters. Your comment already has the shape: `5#hello5#world`.
>
> Consider this illustrative input: `["a#b"]`. Its encoding is `3#a#b`. Decode reads digits until the first `#` → length `3`, then takes the next 3 characters — so the `#` inside `a#b` is payload, not syntax. That's why any 256-ASCII string survives.
>
> One issue in your decode stub: the `if s[i] == "#"` runs before any digits are read, so `length` is still 0 — you need to consume the digits first, then skip the `#`.
>
> `Next:` write the encode body — one line that joins each `len(word)` + `"#"` + `word` into a single string.

> **"I mean how do we encode? like whats the criteria of it?"**
>
> The only criterion is: **from the encoded string alone, decode can recover the exact list** — same number of strings, same characters, including empty ones and ones containing `#`.
>
> That's it. There's no required format. Any scheme works as long as no two different lists produce the same string (or if they do, decode still yields the right list back).
>
> Why plain `"5#hello"`-style works where `",".join` fails: `",".join(["a,b"])` and `",".join(["a","b"])` both give `"a,b"` — decode can't tell them apart. Prefixing the length removes that clash, because the length tells decode exactly how many characters belong to the string.
>
> So the criteria are: every input list → one string, and that string → back to the same list.
>
> `Next:` write the encode body — build and return the joined chunks.

> **"so we can do like, 10#hello#world, something like that? and after the first hash it will be seperators?"**
>
> It's per string, not one global length. Each chunk is `<length of that word>#<that word>`, and they're just concatenated. So `["hello","world"]` encodes to `5#hello5#world`, not `10#hello#world`.
>
> `10#hello#world` would read as "one string of length 10" → `hello#worl`, which is wrong and leaves a stray `d`. The length isn't the total; it's the size of the word right after it.
>
> Decode never searches for a `#` in the middle. It reads digits → a number, skips one `#`, grabs exactly that many characters. The next `#` you see is the separator for the following word.
>
> `Next:` write encode — for each word append `str(len(word)) + "#" + word`, then return the whole concatenation.

> **"Explain it simply" (the new quick action, after the three turns above)**
>
> The step you're on is **encode**: turn the list into one string. That's it right now — ignore decode.
>
> Smallest case: input `["hi"]`. The answer should be `2#hi`. The `2` is the length of `hi`, then `#`, then the word itself.
>
> For each word in `strs`, glue together `len(word)`, `"#"`, and the word, and join all those pieces into one string.
>
> `Next:` write encode's return line so `["hi"]` produces `2#hi`.

Notable in the run: no answer re-asked for the format comment already in the buffer — the first one says "your comment already has the shape", and the simplify turn says "you're on `encode`, and its body is empty" straight from the computed attempt state. No answer pasted a working codec, and none used the banned vocabulary.

## Out of scope

Model, API, database, or schema changes. AI SDK migration. Per-problem hint ladders (catalog edits across every problem). New chat infrastructure. Any change to judging, submissions, progress, or hidden-case disclosure. Phase 9's remaining units.
