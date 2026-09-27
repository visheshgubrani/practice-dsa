# Follow-up — Tutor replies stop at the question

**Status:** not complete — the Encode/Decode transcript still fails the stop-at-the-question review

Phase 11 made replies consistent and still ended every one with a `Next:` task. On Encode and Decode Strings that turned a clarification into the rest of `decode`: pointer updates, loop termination, and two more lines to write. The keyword score from that pass (40/42, 95.2%) did not catch it.

Worked ahead of Phase 9 by direct request. It does not change that phase's status. No model switch, provider, or new chat infrastructure. Existing conversations and practice data stay intact. No chat request, database schema, judging, or source-wrapping changes.

## Work units

### 12.1 Response contract

- [x] Remove the mandatory `Next:` ending from the system prompt, quick actions, tests, and the active project instructions. A clarification can end.
- [x] Separate answering a question from advancing the implementation. "Do we append the length?" explains why the word belongs in the list and how the length finds it, then stops. "Like this?" checks that change and stops. "What now?" is one immediate step. An overview stays conceptual.
- [x] Narrow follow-ups default to one or two short paragraphs. Longer explanations are allowed when asked. No word cap.
- [x] A tiny snippet is for a Python syntax snag. A conceptual misunderstanding does not get code.
- [x] Unrelated unfinished work, a missing return, and later steps wait until they are the question.
- [x] One example keeps its values and casing. Tracing code is distinct from a result the program or the judge already produced.
- [x] The prompt is rewritten in place, with the short clarification as a style example, plus a verification, a next step, and an overview. Editor/result separation, selective debug context, the conversation window, and hidden-case protections stay.

### 12.2 Regression transcript

- [x] Replay the Encode/Decode exchange: "what now?", "like this?", and "do we append the length?", including the editor that ends at `i = j + 1`.
- [x] Ask each question on its own with the supplied history, then again as one connected conversation. Three runs on `deepseek-flash`.
- [x] Save the replies. Review them by hand. Keyword matches are not a teaching-quality score.
- [x] The append-length reply fails if it also teaches advancing `i`, outer-loop termination, or assigns more than one change.
- [x] Disclosure and context-assembly checks stay automated. Hard failures still fail the smoke run: an unsolicited full solution, a hidden-data leak, or a stale-result claim.

### 12.3 Checks

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and live `pnpm chat:smoke`.
- [x] If the core transcript still fails, record the replies for a later model comparison. Do not add another layer of prompt rules, and do not mark this follow-up complete.

**Files:** `lib/ai/prompts.ts`, `lib/ai/prompts.test.ts`, `scripts/chat-smoke.mts`, `docs/plan/00-scope.md`, `docs/plan/README.md`, `AGENTS.md`

## Gate

- [ ] The Encode/Decode transcript answers each question and stops, and `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm chat:smoke` pass.

The checks passed. The transcript did not. This follow-up stays open.

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (319), and `pnpm build` passed. Live `pnpm chat:smoke` against `deepseek-flash` passed the disclosure checks and recorded **0 hard failures**. Full replies are in `docs/plan/evals/tutor-consistency-conversation.json`. The keyword log was 58/60 clean. That number is not a teaching score: it missed casing errors and replies that walked ahead without the phrases the checker looks for.

The editor that ends at `i = j + 1` is the buffer from the chat. The two earlier buffers are reconstructed from what that tutor said was on screen: `decode` still testing `s[i] == "#"`, then the digit scan with `j` and nothing after it.

Each question was asked three times with the supplied history, then three times as one conversation whose earlier replies were the model's own. Review of those 18 replies:

| Turn | Independent | Connected |
| --- | --- | --- |
| What now? | Run 1 stops at the digit scan. Run 2 says `["Hello","World"]` encodes to `"5#hello5#world"` and presents an empty list as the behaviour you hit. Run 3 states the whole chunk recipe, then names the loop condition. | Run 1 stops at `i < len(s)`. Run 2 adds the length scan and previews taking characters. Run 3 writes the `length * 10 + digit` scan. |
| Like this? | Run 2 checks the scan and stops. Runs 1 and 3 go on to `int(s[i:j])` as the missing piece. | Runs 1 and 2 check the scan and stop. Run 3 adds `int(s[i:j])`. |
| Append the length? | **Runs 1 and 2 fail.** Both explain the word, then teach `i = i + length`. Run 2 also ends with `Next:` and tells you to append the slice and return the list. Run 3 stops after the slice. | All three stop after the slice. Run 3 still mixes `hello` with `["Hello","World"]` in one reply. |

The supplied-history path is the one that matches the thread you were in. On that path the length question still grew into the next pointer move in two of three runs. The connected path, where those old replies were not in the history, held the line on that question.

No further prompt rules. These fixtures are the set for a later model comparison. Phase 9 is unchanged.

## Out of scope

A different model, a provider or model picker, new chat infrastructure, and any change to judging, submissions, progress, or hidden-case disclosure. Phase 9's remaining units. The chat pane still emphasizes a `Next:` line when a reply happens to include one; the contract no longer asks for that line.
