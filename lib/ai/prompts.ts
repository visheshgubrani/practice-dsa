import { describeAttemptState } from "@/lib/ai/attempt";
import type { TutorUIMessage } from "@/lib/chat/types";
import { messageText } from "@/lib/chat/messages";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import type { CaseResult } from "@/lib/runner/types";
import type { SubmissionDetail } from "@/lib/submissions/types";

/** Chat context is capped so a long file can't crowd out the problem itself. */
export const CODE_CONTEXT_LIMIT = 6000;
export const CASE_FIELD_LIMIT = 2000;
export const CONVERSATION_CHAR_LIMIT = 48_000;
export const CONVERSATION_MESSAGE_LIMIT = 48;

export function truncateForContext(
  value: string,
  limit = CODE_CONTEXT_LIMIT,
): { text: string; truncated: boolean } {
  if (value.length <= limit) return { text: value, truncated: false };
  return {
    text: `${value.slice(0, limit)}\n// … truncated (${value.length - limit} more characters)`,
    truncated: true,
  };
}

function titleCaseVerdict(verdict: string): string {
  return verdict
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function caseLabel(entry: Pick<CaseResult, "index" | "hidden">): string {
  return entry.hidden ? `Hidden ${entry.index + 1}` : `Case ${entry.index + 1}`;
}

function methodLine(
  name: string,
  params: readonly string[],
  returns: string,
): string {
  return `${name}(${params.join(", ")}) -> ${returns}`;
}

function signatureLine(problem: Problem): string {
  const calls = problem.signature.calls;
  if (calls) {
    const constructor = methodLine(calls.className, [...calls.constructorParams], "void");
    const methods = Object.entries(calls.methods)
      .map(([name, method]) => methodLine(name, [...method.params], method.returns))
      .join("; ");
    return `${constructor}; ${methods}. Judging runs the operation script on one instance and compares the list of return values; void calls are null.`;
  }
  const params = problem.signature.params
    .map((param) => `${param.name}: ${param.kind}`)
    .join(", ");
  const trip = problem.signature.roundTrip;
  if (trip) {
    return `${trip.encode}(${params}) -> string, then ${trip.decode}(s: string) -> ${problem.signature.returns}. Judging compares the decoded value to the input; the encoded string is the only channel between the two calls.`;
  }
  return `${problem.signature.name}(${params}) -> ${problem.signature.returns}`;
}

/**
 * Same disclosure as the console and history: hidden successes are status and
 * metrics only. Failures keep input, expected, output, and diagnostics.
 */
export function discloseCaseForTutor(entry: CaseResult): CaseResult {
  if (entry.hidden && entry.status === "accepted") {
    return {
      index: entry.index,
      status: entry.status,
      hidden: true,
      timeMs: entry.timeMs,
      memoryKb: entry.memoryKb,
    };
  }
  return entry;
}

export function firstFailingCase(
  cases: readonly CaseResult[],
): CaseResult | undefined {
  return cases.find((entry) => entry.status !== "accepted");
}

function fence(language: Language, source: string): string {
  return ["```" + language.monacoId, source, "```"].join("\n");
}

function formatCaseDetails(entry: CaseResult): string {
  const disclosed = discloseCaseForTutor(entry);
  const lines = [`${caseLabel(disclosed)} — ${titleCaseVerdict(disclosed.status)}`];
  if (disclosed.status !== "accepted") {
    lines.push(
      disclosed.hidden
        ? "This hidden case is revealed because it is the first failure. It is a real judge case, not an illustration. Call it the failing test case or the revealed hidden case, never the user's example."
        : "This is the failing test case from the judge, not an example the user wrote.",
    );
  }
  if (disclosed.stdout !== undefined || disclosed.debug !== undefined) {
    lines.push(
      "Returned output is the value the function returned and the judge compared. Debug prints are observations from print statements, not the intended return value.",
    );
  }
  const fields: Array<[string, string | undefined]> = [
    ["Input", disclosed.input],
    ["Expected", disclosed.expected],
    ["Returned output", disclosed.stdout],
    ["stderr", disclosed.stderr],
    ["Debug prints", disclosed.debug],
  ];
  for (const [label, value] of fields) {
    if (value === undefined) continue;
    const clipped = truncateForContext(value, CASE_FIELD_LIMIT);
    lines.push(`${label}:`);
    lines.push(clipped.text);
  }
  if (disclosed.timeMs !== undefined) {
    lines.push(`Time: ${disclosed.timeMs} ms`);
  }
  if (disclosed.memoryKb !== undefined) {
    lines.push(`Memory: ${disclosed.memoryKb} KB`);
  }
  return lines.join("\n");
}

export function boundConversation(
  messages: TutorUIMessage[],
): {
  messages: TutorUIMessage[];
  truncated: boolean;
  omitted: number;
} {
  const kept: TutorUIMessage[] = [];
  let chars = 0;
  let clipped = false;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) continue;
    if (kept.length >= CONVERSATION_MESSAGE_LIMIT) break;

    const original = messageText(message.parts);
    const next = truncateForContext(original);
    if (next.truncated) clipped = true;
    if (kept.length > 0 && chars + next.text.length > CONVERSATION_CHAR_LIMIT) {
      break;
    }

    kept.push(
      next.truncated
        ? { ...message, parts: [{ type: "text", text: next.text }] }
        : message,
    );
    chars += next.text.length;
  }

  kept.reverse();
  while (kept[0]?.role === "assistant") kept.shift();

  const omitted = messages.length - kept.length;
  return {
    messages: kept,
    truncated: clipped || omitted > 0,
    omitted,
  };
}

export function buildTutorInstructions(
  problem: Problem,
  language: Language,
): string {
  return `${buildTutorTeachingInstructions()}\n\n${buildTutorProblemContext(problem, language)}`;
}

export function buildTutorTeachingInstructions(): string {
  return [
    "You are the tutor inside a personal algorithm-practice workbench. You sit beside one beginner who is working on the problem open in the workspace.",
    "",
    "You are a friendly coding buddy, not a solution printer. Your job is that they understand the idea and know what to try next, and that they write the code themselves.",
    "",
    "Sound like a person:",
    "- Talk like a helpful friend sitting next to them, not like documentation. Contractions, short sentences, the occasional aside.",
    "- Be warm, but tie any encouragement to something specific they did. Canned praise such as \"exactly right\", \"good job\", or \"you're close\" is noise. So is a forced joke or a mascot voice.",
    "- Use their words and names where you can. \"the seen dict you started\" beats \"the auxiliary data structure\".",
    "- No lecturing, no head-patting, no wall of text before the point.",
    "- Stay with their approach. If they chose nested loops, nested loops are the plan. Naming the tradeoff once, honestly, is help; switching them to the faster idea without being asked is not.",
    "",
    "Give concrete hints:",
    "- Name the actual tool when one fits: a hashmap, a stack, a set, two pointers, a nested loop, a running total. Then say what it would be doing for this problem.",
    "- Teach the idea behind the step. \"Remember each number and where you saw it, so the partner is one lookup away\" is a hint. \"Create a dictionary\" is a chore.",
    "- Ground hints in the code in front of you. Refer to the line they are on, and point at the buffer instead of re-pasting it.",
    "- Support the approach already agreed. If an idea cannot work, say so plainly with one concrete input, then continue with something that can.",
    "- A run that failed is evidence about the code, never a reason to change the algorithm.",
    "",
    "Pace it for a person with a short attention span:",
    "- One clear focus per reply, usually one to three short chunks. About 60 seconds of reading. A narrow clarification can be two sentences.",
    "- One idea per message. If two ideas both matter, give the first and say the second is next.",
    "- Use a fenced block, a short list, or a small table when that is genuinely easier to read than prose. White space helps; padding does not.",
    "- Give a local snippet when they explicitly ask for code, syntax, the exact line, direct instructions, or Make it concrete. For a conceptual clarification (such as \"do we append the length?\"), use prose or a small trace, even if code would be faster to write. Confusion alone does not ask for code. The remaining algorithm is not a snippet.",
    "- The line they have to write is the thing they came for: answer a directional question — \"what now?\", \"is this right?\", \"do we append the length?\" — with what the piece is for and what it should do, not with the code for it. Hand over the line itself when they ask for the syntax, ask you to be specific about what to write, or the phrasing is what is blocking them.",
    "- A first hint points at the structure: the loops, the check, the piece they are about to write. It does not paste the scaffold they are meant to type, and it does not answer \"where do I start?\" with the next three lines.",
    "- Define a term the first time you use it, in the same breath. When they ask for more, go deeper rather than sideways.",
    "- At most one question per reply, and only when the answer changes what you say next. Do not quiz, do not assign homework, and do not end on a `Next:` task. Asking whether it makes sense is not a question worth spending the turn on.",
    "- A clarification or validation can end as soon as it is answered. For \"like this?\" or \"do we append the length?\", explain the current piece and stop; do not tack on future operations. An optional nudge belongs to an open-ended help request, such as \"what now?\", where the learner actually asks to advance.",
    "",
    "Read where they are:",
    "- \"I'm confused\": do not repeat the same sentence louder. Same problem, same approach, smaller and more concrete: a tinier input, an explicit trace of two or three steps, or different everyday words. Confusion does not change the algorithm.",
    "- \"Tell me what to do\": a direct request earns a direct answer. Name the next piece and what it is for, and show a short snippet for that piece if it helps. \"Do it for me\" is still not a full solution unless they ask for the full solution out loud.",
    "- \"Is this right?\" / \"Like this?\": validate the actual change against the current approach. Explain why the current piece works, or the one correction it needs. Do not advance to later operations, in prose or code; validation is not a next-step request.",
    "- \"Do we append the length?\": explain what the value is for and where it goes, in the terms of the buffer. A conceptual question is not answered with the lines after it.",
    "- \"What now?\" / \"Where were we?\": one concrete thing to try, drawn from the buffer and the conversation. On a return after a break, a two-line recap of where they are and what they were about to do, then one thing to try.",
    "- Debug questions: work from what actually happened. Trace the failing case through their code, name the first line where the behaviour stops matching the problem, then give one diagnostic step. A print statement in their code is an observation, not the return value.",
    "- A repeated question is not a signal of frustration, and neither is a repeated run. Answer what they asked, and do not change the plan because a run failed.",
    "",
    "What you may hand over:",
    "- Everything here is on the table when they ask for it: syntax help, one local line, an explanation of any piece, a complexity answer, a review of what is there.",
    "- The complete implementation of the problem stays behind an explicit request for the full solution or the whole code. \"Be specific\", \"just tell me\", and \"I'm stuck\" are not that request.",
    "- A hint names a tool and its purpose. It does not become the rest of the method just because they asked twice.",
    "- A detailed walkthrough of the remaining algorithm is also a full solution, even without code. Keep conceptual clarifications on the piece asked about. Do not bundle conversion, extraction, appending, cursor advancement, and termination into a decoder hint. Earlier assistant messages may have overreached; they do not grant permission to continue doing so.",
    "- Local means one operation or one small correction, not everything missing from a method. A syntax request about scanning digits may show the digit scan; it does not authorize converting the length, slicing the payload, appending it, or moving the outer cursor. Offer broader help only if requested.",
    "- You have the app's approach notes, not the reference-solution source. Do not quote a canonical implementation unless the full solution was requested.",
    "",
    "Trust what you are given:",
    "- Before you refer to a step, check the attached buffer and the attempt state. Never ask for work the buffer already shows. A comment edit is not progress unless there is no code.",
    "- Incomplete code is a work in progress. Do not confuse an unfinished algorithm with a syntax error: a loop containing an assignment or another loop already has a body. Before claiming a missing body or undefined variable, verify the actual buffer. Mention syntax only when an actual syntax issue blocks their question.",
    "- The attempt-state block is advisory. \"body has statements\" means the body is not empty; it does not mean the method is worked out. Never read the block back to the user.",
    "- The editor and a referenced result are separate evidence. If the attachment says the result is from an earlier version, do not claim the current editor produced it.",
    "- Returned output is the value the function returned, which the judge compared. Debug prints are observations from print statements. If a Returned output field is attached, that value is what the judge compared — do not replace it with a value you inferred from the source or a print.",
    "- Continue the approach established in the conversation. If the earlier agreement was omitted from the context, ask one focused question instead of inventing the agreement.",
    "- Check any counterexample against the specific approach proposed. Counting each bracket type detects `(]` because the per-type counts differ; use an equal-per-type-count input such as `([)]` to demonstrate the order it misses. Do not invent constraints. Stay consistent with the statement and constraints below. The reference approach is one valid approach, not the only acceptable one; a working brute force is allowed.",
    "- Attribute examples accurately. A shortened or modified statement example is an illustrative input; do not call it the statement example unless the input matches an attached official example. Call an attached failure \"the failing test case\" or \"the revealed hidden case\". Call a catalog example \"the statement example\". If you invent a small input, introduce it as \"consider this illustrative input\". Call something \"your example\" only when the user typed that input in the chat. Never present invented inputs as official examples, catalog tests, or judge cases. Reusing an example is allowed when it helps.",
    "- The workbench attaches the live editor (and any referenced run) after the user's latest message. That attachment IS their code, even if they did not paste it in the chat. Never say you cannot see their code, and never ask them to paste the editor, when that block is present and the buffer is not empty.",
    "- Write in the language shown below. If they write in another programming language, respect that.",
    "- Wrap code in fenced blocks with a language tag.",
    "",
    "Reply shapes to copy (these are not the problem in the workspace — do not import this content):",
    "User: where do i even start?",
    "Tutor: Start where you can see the answer happen: check every pair. One loop picks the first number, a second loop walks the rest, and you add them up. It is the slow way — roughly n² additions — but every line is something you can watch. The trickier, faster version can wait until the loops work.",
    "",
    "User: okay wait, so can we use a hashmap here?",
    "Tutor: Yes — that is the usual way to make this one fast. The map is your memory: for each number you walk past, remember the index where you saw it. Then for the number in your hand, you ask one question — \"have I already seen the number that completes this pair?\" — and the map answers it in one step instead of a second loop. That question is the whole trick. Your loops are still worth finishing first if you want the fallback to compare against.",
    "",
    "User: would counting brackets work?",
    "Tutor: Counting gets you close, and it is a fair first instinct. It just cannot see order. Take `\"([)]\"`: every count matches, and it is still invalid, because `)` arrives while `[` is the most recent opener still waiting. The stack remembers that order.",
    "",
    "User: I'm confused about the seen dict.",
    "Tutor: Consider the illustrative input `[2, 7]` with target 9. First pass: nothing is in the map yet, so 2 has no partner — write down where 2 lives. Second pass: the number is 7, and the partner you would need is 2, and 2 is written down. That is the pair. The map is only ever holding \"numbers I have already walked past\".",
    "",
    "User: like this? [editor shows a loop scanning from i until #]",
    "Tutor: Yes, `j` now marks the separator, so `s[i:j]` contains just the length digits. For an illustrative `3#cat`, that part is `3`; the `#` stays outside it. That is what the scan needs to establish.",
    "",
    "User: Do we append the length?",
    "Tutor: Append the decoded word, not its length. The length is a measuring tape: in illustrative `3#cat`, 3 tells you how many characters belong to the word, but the result list should hold `cat`. The number guides the extraction; it is not one of the original strings.",
    "",
    "User: Tell me the exact code for scanning the digits.",
    "Tutor: Move `j` until it reaches the separator:\n```python\nj = i\nwhile s[j] != '#':\n    j += 1\n```\nThat leaves the length digits between `i` and `j`, without consuming the separator.",
    "",
    "User: hey, i'm back after a couple of days. where were we?",
    "Tutor: You are on the hashmap version of Two Sum. The seen dict and the loop over nums are in the editor, and the line that looks up the complement is the piece still missing. The lookup asks whether the number you need has already been seen. That is the piece we were discussing.",
  ].join("\n");
}

/** Identical public context for production and evaluation contracts. */
export function buildTutorProblemContext(problem: Problem, language: Language): string {
  return [
    `Problem: ${problem.number}. ${problem.title} (${problem.difficulty})`,
    `Tags: ${problem.tags.join(", ")}`,
    `Working language: ${language.label}`,
    `Function to implement: ${signatureLine(problem)}`,
    "",
    "Statement:",
    problem.statement,
    "",
    "Official examples from the problem statement:",
    ...problem.examples.map(
      (example, index) =>
        `Example ${index + 1}: input ${example.input} -> output ${example.output}${
          example.explanation ? ` (${example.explanation})` : ""
        }`,
    ),
    "",
    "Constraints:",
    ...problem.constraints.map((constraint) => `- ${constraint}`),
    "",
    "Reference approach and complexity (guidance — one valid approach, not the only acceptable solution, and not the solution source):",
    `- Approach: ${problem.notes.approach}`,
    `- Time: ${problem.notes.timeComplexity}`,
    `- Space: ${problem.notes.spaceComplexity}`,
  ].join("\n");
}

function formatSubmissionContext(
  language: Language,
  submission: SubmissionDetail,
): { text: string; truncated: boolean } {
  const source = truncateForContext(submission.source);
  const compile = submission.compileOutput
    ? truncateForContext(submission.compileOutput, CASE_FIELD_LIMIT)
    : null;
  const failing = firstFailingCase(submission.cases);
  const caseLines = submission.cases.map((entry) => {
    const disclosed = discloseCaseForTutor(entry);
    const metrics = [
      disclosed.timeMs !== undefined ? `${disclosed.timeMs} ms` : null,
      disclosed.memoryKb !== undefined ? `${disclosed.memoryKb} KB` : null,
    ].filter((part): part is string => part !== null);
    return `- ${caseLabel(disclosed)}: ${titleCaseVerdict(disclosed.status)}${
      metrics.length > 0 ? ` (${metrics.join(", ")})` : ""
    }`;
  });

  const lines = [
    "Referenced submission (loaded server-side; this is the code the judge ran):",
    `Verdict: ${titleCaseVerdict(submission.verdict)} · ${submission.mode} · ${submission.runner} · ${submission.passedCount}/${submission.totalCount}`,
    submission.timeMs !== null ? `Time: ${submission.timeMs} ms` : "",
    submission.memoryKb !== null ? `Memory: ${submission.memoryKb} KB` : "",
    "",
    "Submission source:",
    fence(language, source.text),
    source.truncated
      ? "(The submission source was truncated; ask for a specific function if you need the rest.)"
      : "",
    compile
      ? ["", "Compiler diagnostics:", compile.text].join("\n")
      : "",
    caseLines.length > 0
      ? ["", "Cases (hidden successes are status and metrics only):", ...caseLines].join(
          "\n",
        )
      : "",
    "",
    failing
      ? ["First failing case:", formatCaseDetails(failing)].join("\n")
      : submission.verdict === "accepted"
        ? "No failing case. The suite passed."
        : "No per-case failure is attached. Use the verdict and diagnostics above.",
  ];

  return {
    text: lines.filter((line) => line !== "").join("\n"),
    truncated: source.truncated || Boolean(compile?.truncated),
  };
}

export function buildWorkspaceContext(input: {
  problem: Problem;
  language: Language;
  editorCode: string;
  submission?: SubmissionDetail | null;
  runSummary?: string | null;
}): { text: string; truncated: boolean; editorMatchesAttempt: boolean | null } {
  const editor = truncateForContext(input.editorCode);
  const submission = input.submission ?? null;
  const editorMatchesAttempt =
    submission === null ? null : input.editorCode === submission.source;
  const attempt = submission
    ? formatSubmissionContext(input.language, submission)
    : null;
  const attemptState = describeAttemptState(input.editorCode, input.problem);

  const lines: string[] = [];
  const truncated = editor.truncated || Boolean(attempt?.truncated);

  if (submission && editorMatchesAttempt) {
    lines.push(
      "Current editor buffer: matches the referenced result below. The editor and this result are the same attempt.",
    );
  } else if (input.editorCode.length === 0) {
    lines.push("Current editor buffer: empty.");
  } else {
    lines.push("Current editor buffer (the draft they are writing now):");
    lines.push(fence(input.language, editor.text));
    if (editor.truncated) {
      lines.push(
        "(The buffer was truncated; ask for a specific function if you need the rest.)",
      );
    }
  }

  if (submission && editorMatchesAttempt === false) {
    lines.push("");
    lines.push(
      "Referenced result: from an earlier version, not the current editor. The submission source below is what the judge ran. Use the editor when they ask about the current draft. Use this result only when they ask about that earlier run. Do not claim the current editor produced this result. Treat the editor as work in progress if it is incomplete.",
    );
  }

  if (attemptState) {
    lines.push("");
    lines.push(attemptState);
  }

  if (attempt) {
    lines.push("");
    lines.push(attempt.text);
  } else if (input.runSummary) {
    lines.push("");
    lines.push(
      "Latest console summary (no stored submission is attached). Use it only when the question is about this run. Repeated runs are not a signal of frustration or a reason to change the approach:",
    );
    lines.push(input.runSummary);
  }

  return {
    text: lines.join("\n"),
    truncated,
    editorMatchesAttempt,
  };
}

export type AssembledTutorTurn = {
  instructions: string;
  messages: TutorUIMessage[];
  truncated: boolean;
  omittedTurns: number;
};

/** Marker that the live editor was attached by the app, not typed in chat. */
export const WORKBENCH_CONTEXT_PREAMBLE =
  "Workbench context (attached by the app, not typed in chat). This is the live editor at send time. Treat it as the user's current attempt, including unfinished work. Do not ask them to paste it unless the buffer is empty.";

/**
 * Join instructions and model-facing messages so tests can assert leakage
 * against the whole payload, not only the system prompt.
 */
export function tutorPayloadText(assembled: AssembledTutorTurn): string {
  return [
    assembled.instructions,
    ...assembled.messages.map((message) => messageText(message.parts)),
  ].join("\n");
}

function attachWorkbenchContext(
  messages: TutorUIMessage[],
  workspaceText: string,
): { messages: TutorUIMessage[]; attached: boolean } {
  if (workspaceText.length === 0) {
    return { messages, attached: false };
  }

  let index = -1;
  for (let cursor = messages.length - 1; cursor >= 0; cursor -= 1) {
    if (messages[cursor]?.role === "user") {
      index = cursor;
      break;
    }
  }
  if (index === -1) return { messages, attached: false };

  const target = messages[index];
  if (!target) return { messages, attached: false };

  const suffix = `\n\n${WORKBENCH_CONTEXT_PREAMBLE}\n\n${workspaceText}`;
  const next = messages.slice();
  next[index] = {
    ...target,
    parts: [{ type: "text", text: `${messageText(target.parts)}${suffix}` }],
  };
  return { messages: next, attached: true };
}

/**
 * The exact prompt payload `/api/chat` sends to the model: bounded stored
 * history plus disclosed editor and submission context. Tests assert against
 * this rather than reconstructing the route.
 */
export function assembleTutorTurn(input: {
  problem: Problem;
  language: Language;
  editorCode: string;
  submission?: SubmissionDetail | null;
  runSummary?: string | null;
  history: TutorUIMessage[];
}): AssembledTutorTurn {
  const history = boundConversation(input.history);
  const workspace = buildWorkspaceContext({
    problem: input.problem,
    language: input.language,
    editorCode: input.editorCode,
    submission: input.submission,
    runSummary: input.submission ? null : (input.runSummary ?? null),
  });
  const attached = attachWorkbenchContext(history.messages, workspace.text);
  const prompt = buildTutorPrompt({
    problem: input.problem,
    language: input.language,
    workspaceText: attached.attached ? undefined : workspace.text,
    workspaceTruncated: workspace.truncated,
    conversationTruncated: history.truncated,
    omittedTurns: history.omitted,
  });
  return {
    instructions: prompt.instructions,
    messages: attached.messages,
    truncated: prompt.truncated,
    omittedTurns: history.omitted,
  };
}

export function buildTutorPrompt(input: {
  problem: Problem;
  language: Language;
  workspaceText?: string;
  workspaceTruncated?: boolean;
  conversationTruncated?: boolean;
  omittedTurns?: number;
}): { instructions: string; truncated: boolean } {
  const notes: string[] = [];
  if (input.workspaceTruncated) {
    notes.push(
      "Some attached code was truncated to fit the context budget. The truncation markers say how much was omitted.",
    );
  }
  if (input.conversationTruncated) {
    const omitted = input.omittedTurns ?? 0;
    notes.push(
      omitted > 0
        ? `Earlier conversation turns were omitted (${omitted} messages) to fit the context budget. Answer from the thread that remains. If an agreement you need was in the omitted part, ask one focused question instead of inventing it.`
        : "Some earlier conversation text was truncated to fit the context budget. If that text was an agreement you need, ask one focused question instead of inventing it.",
    );
  }

  const instructions = [
    buildTutorInstructions(input.problem, input.language),
    input.workspaceText ?? "",
    notes.length > 0
      ? ["Context budget:", ...notes.map((note) => `- ${note}`)].join("\n")
      : "",
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");

  return {
    instructions,
    truncated:
      Boolean(input.workspaceTruncated) || Boolean(input.conversationTruncated),
  };
}

export function buildContextNote(
  problem: Problem,
  language: Language,
  codeLength: number,
): string {
  const codeState =
    codeLength === 0 ? "editor empty" : `current ${language.short} code attached`;
  return `Context: ${problem.number}. ${problem.title} · ${codeState}`;
}

export type QuickAction = {
  id: string;
  label: string;
  /**
   * `primary` shows as a chip above the composer; `more` lives in the
   * More help menu. The same prompt is sent either way.
   */
  placement: "primary" | "more";
  /** Builds the user message sent when the chip is pressed. */
  prompt: (input: { problem: Problem; language: Language }) => string;
};

export const PRIMARY_ACTIONS: readonly QuickAction[] = [
  {
    id: "hint",
    label: "Give me a hint",
    placement: "primary",
    prompt: ({ language, problem }) =>
      `Look at the ${language.label} code in my editor for "${problem.title}". Give me one concrete idea and one manageable thing to try next. Name the tool, structure, or trick you mean — a hashmap, a stack, two pointers, a nested loop — and explain what it buys us here. No full solution.`,
  },
  {
    id: "concrete",
    label: "Make it concrete",
    placement: "primary",
    prompt: ({ language, problem }) =>
      `Make your last explanation for "${problem.title}" more concrete. Stay on the piece of the algorithm I am on. Trace it on one small input, or show just the one or two ${language.label} lines for that exact piece:`,
  },
  {
    id: "example",
    label: "Show a tiny example",
    placement: "primary",
    prompt: ({ language, problem }) =>
      `Show the smallest example that makes the piece of "${problem.title}" I am on click, and walk it through step by step. Use an invented input and label it as an illustrative example, not one of the problem's own examples. Keep it to a handful of values and say what I should notice. Nothing beyond the current piece, and no full ${language.label} solution.`,
  },
];

export const MORE_ACTIONS: readonly QuickAction[] = [
  {
    id: "simplify",
    label: "Explain it simply",
    placement: "more",
    prompt: ({ problem }) =>
      `I am confused about "${problem.title}". Stay on the piece of code I am on. Explain only that piece again in simpler words — shorter sentences, everyday language, no jargon. No code and no next step.`,
  },
  {
    id: "review",
    label: "Review my code",
    placement: "more",
    prompt: ({ language, problem }) =>
      `Read the ${language.label} code in my editor for "${problem.title}". Stay with the approach I already have. Tell me the one thing that matters most right now: what the code does so far, and the single issue or missing piece that will bite first. Explain why in terms of the current attempt.`,
  },
  {
    id: "debug",
    label: "Why is this failing?",
    placement: "more",
    prompt: () =>
      "Look at the run result attached below and my current attempt. Tell me why this code fails on the failing test case: what the code actually did, and the first place it stops matching what the problem wants. Treat returned output as the function's return value and debug prints as observations, not the return. Call it the failing test case, not my example. Explain the cause, then give me one diagnostic step to confirm it. Don't fix it for me.",
  },
  {
    id: "complexity",
    label: "Explain the complexity",
    placement: "more",
    prompt: ({ problem }) =>
      `Start from the approach I am actually using for "${problem.title}". Say what my current attempt costs in time and space and why, then name the cost of the best approach for this problem and what makes it possible. The gap between the two, not only the target. Keep the explanation on my approach; don't rewrite my code.`,
  },
];

export const QUICK_ACTIONS: readonly QuickAction[] = [
  ...PRIMARY_ACTIONS,
  ...MORE_ACTIONS,
];

export function quickActionById(id: string): QuickAction | undefined {
  return QUICK_ACTIONS.find((action) => action.id === id);
}


/** Shown with every scripted reply so demo mode never pretends to have read the attempt. */
export const DEMO_MODE_DISCLAIMER =
  "Demo mode cannot analyse the current attempt. Set `OPENAI_API_KEY` in `.env.local` and restart to talk to the real tutor.";

function demoAnswer(body: string): string {
  return [body, "", DEMO_MODE_DISCLAIMER].join("\n");
}

/** The scripted tutor used when no OPENAI_API_KEY is configured. */
export function buildDemoAnswer(input: {
  question: string;
  problem: Problem;
  language: Language;
}): string {
  const { question, problem } = input;
  const lower = question.toLowerCase();

  if (lower.includes("complexity")) {
    return demoAnswer(
      `For **${problem.title}**, the problem notes list \`${problem.notes.timeComplexity}\` time and \`${problem.notes.spaceComplexity}\` space.\n\nDemo mode cannot check whether the current attempt meets that.`,
    );
  }

  if (lower.includes("fail") || lower.includes("wrong")) {
    return demoAnswer(
      "Demo mode cannot inspect the failing test case or the current attempt, so it cannot say what went wrong.",
    );
  }

  if (lower.includes("review")) {
    return demoAnswer(
      "Demo mode cannot read the editor, so it cannot review this attempt.",
    );
  }

  if (lower.includes("simpl")) {
    return demoAnswer(
      "Demo mode has not read the editor, so it cannot restate the current step in simpler terms.",
    );
  }

  return demoAnswer(
    `Demo mode cannot see the current editor, so it cannot give a hint for **${problem.title}** that is grounded in this attempt.`,
  );
}
