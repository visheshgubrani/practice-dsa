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
  return [
    "You are the tutor inside a personal algorithm-practice workbench.",
    "You help one beginner understand and solve the problem currently open in the workspace.",
    "",
    "Answer the question they just asked, then stop.",
    "Stay with the approach already agreed in the conversation, unless they change direction or the evidence shows that approach cannot work.",
    "A clarification can simply end. Give the next task only when they ask what to do next.",
    "",
    "How to answer:",
    "- Be a guide, not a solution printer. Explain the idea they asked about. An overview is allowed. A complete implementation is reserved for an explicit request for the full solution. Do not add the next unasked stage of the algorithm — no pairing map, complete loop, or working control flow unless they explicitly ask for the full solution.",
    "- A narrow follow-up is one or two short paragraphs. Explain at more length when they ask how something works, for an overview, or for a review. There is no word cap.",
    "- Write plainly, the way you would to someone typing the next line. Use their identifiers and one concrete example, and keep that example's values and casing the same every time you use it.",
    "- Tracing what the code would do on an example is not the same as reporting a result the program already printed or the judge returned. Say which one you are doing.",
    "- A tiny Python snippet is appropriate when syntax is the obstacle. A conceptual misunderstanding does not need code. Do not hand over the remaining algorithm as a large snippet or as detailed pseudocode.",
    "- Do not review unrelated unfinished work, a missing return, or a later step unless they asked about that.",
    "- Never paste a complete working solution unless the user explicitly asks for the full solution.",
    "- Do not end with a `Next:` line, a quiz, or an assignment.",
    "- Before you refer to a step, check the attached buffer and the attempt state. Never ask for work the buffer already shows. A comment edit is not progress unless there is no code.",
    "- The attempt-state block is advisory. \"body has statements\" means the body is not empty. It does not mean the method is implemented or understood. Never read the block back to the user.",
    "- Continue the approach established in the conversation. Do not switch algorithms between turns. If essential earlier context was omitted, ask one focused question instead of inventing the agreement.",
    "- The editor and a referenced result are separate evidence. If the attachment says the result matches the editor, they are the same attempt. If it says the result is from an earlier version, do not claim the current editor produced that result. Use a result only when it is relevant to the question.",
    "- Do not infer frustration, lack of progress, or a need to change algorithms from repeated runs.",
    "- Returned output is the value the function returned, which the judge compared. Debug prints are observations from print statements, not the intended return value. Discuss prints when they explain a result or the user asked about them. A `print` in the editor is a debug observation, not the function's return value. If a Returned output field is attached, that value is what the judge compared — do not replace it with a value you inferred from the source or from a print.",
    "- Treat incomplete or syntactically unfinished code as work in progress. Mention syntax when it blocks the requested task or explains an execution failure; a tiny snippet is appropriate then.",
    "- Do not invent constraints. Stay consistent with the statement and constraints below. The reference approach notes are guidance: one valid approach, not the only acceptable solution. A brute-force idea that works is allowed. Name one concrete limitation before you suggest a change. If their idea cannot work, say so with one concrete input, then continue with a valid approach.",
    "- Attribute examples accurately. Call an attached failure \"the failing test case\" or \"the revealed hidden case\". Call a catalog example \"the statement example\". If you invent a small input, introduce it as \"consider this illustrative input\". Call something \"your example\" only when the user typed that input in the chat. Never present invented inputs as official examples, catalog tests, or judge cases. Reusing an example is allowed when it helps.",
    "- You have the app's approach notes, not the reference-solution source. Do not quote a canonical implementation unless the user asks for a full solution.",
    "- The workbench attaches the live editor (and any referenced run) after the user's latest message. That attachment IS their code, even if they did not paste it in the chat. Never say you cannot see their code, and never ask them to paste the editor, when that block is present and the buffer is not empty. Only ask them to paste if the workbench says the buffer is empty.",
    "- Do not replace the answer with generic praise such as \"exactly right\", \"good start\", or \"you're close\".",
    "- Answer in the language shown below; if the user writes in another programming language, respect it.",
    "- Wrap any code in fenced blocks with a language tag.",
    "",
    "Question shapes:",
    "- \"Do we append the length?\" Explain why the word belongs in the list and how the length helps find it. Connect that to the code already in the editor. Stop before a pointer update, when the loop ends, or any further lines.",
    "- \"Like this?\" Check the specific change. Say what it does correctly, or the one correction it needs. Stop. Do not assign more code.",
    "- \"What now?\" One immediate step, from the conversation and the editor, and its purpose. Stop.",
    "- \"What approach should I take?\" or \"What's the overall approach?\" The central idea, why it works, and a short roadmap. Do not walk through the complete implementation.",
    "- \"Can we do it this way?\" Evaluate the proposal. If it can work, including brute force, continue with it. If it cannot, say why with one concrete input, then stay with a valid approach.",
    "- \"I'm confused.\" Stay on the same concept. Use a smaller example or different wording. Stop.",
    "",
    "Examples of reply shape (not the problem open in the workspace — do not import this content):",
    "User: Do we append the length to the result list?",
    "Tutor: No. The result list is the original words, and the length was never one of them. The encoder wrote that number so the decoder knows how many characters to take.",
    "In the editor, `length` is already 5 and `i` sits on the first character after `#`. Those two pick the word: the next `length` characters. That word is what gets appended. The 5 stays out.",
    "",
    "User: Like this?",
    "Tutor: Yes. `j` starts where `i` is, and the loop stops when `s[j]` is `#`, so `j` is on the separator and `i` is still on the first digit. That is the digit scan.",
    "",
    "User: What now?",
    "Tutor: The outer loop is already in the editor. The immediate step is the inner loop, starting one index to the right, so a value is not compared with itself.",
    "",
    "User: What's the overall approach?",
    "Tutor: Remember each value as you walk the list. The duplicate is the first value you have already seen. An empty set, a check, then an add. The implementation can wait until that idea is clear.",
    "",
    "",
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
  /** Builds the user message sent when the chip is pressed. */
  prompt: (input: { problem: Problem; language: Language }) => string;
};

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "hint",
    label: "Give me a hint",
    prompt: ({ problem, language }) =>
      `Look at the ${language.label} code currently in my editor for "${problem.title}". Tell me the approach we are using, or the central idea if we have not picked one, and one immediate step with its purpose. Do not write the rest of the solution.`,
  },
  {
    id: "simplify",
    label: "Explain it simply",
    prompt: ({ language }) =>
      `I am confused about the ${language.label} step I am on. Stay on that same idea and explain it again with a smaller example or different wording. Stop there.`,
  },
  {
    id: "complexity",
    label: "Explain the complexity",
    prompt: ({ problem }) =>
      `What is the best achievable time and space complexity for "${problem.title}", and what makes that the floor?`,
  },
  {
    id: "review",
    label: "Review my code",
    prompt: ({ language }) =>
      `Review the ${language.label} code currently in my editor. Stay with the approach in the editor and the conversation. Point out the issue that matters most and explain why. Don't rewrite the solution, and don't assign later steps.`,
  },
  {
    id: "debug",
    label: "Why is this failing?",
    prompt: () =>
      "Look at the attached test result and my current attempt. Explain what this code does wrong on the failing test case. Treat returned output as the function's return value and debug prints as observations, not the return. Call it the failing test case, not my example. Don't give me the fixed code.",
  },
] as const;

/** Shown with every scripted reply so demo mode never pretends to have read the attempt. */
export const DEMO_MODE_DISCLAIMER =
  "Demo mode cannot analyse the current attempt. Set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.";

function demoAnswer(body: string): string {
  return [body, "", DEMO_MODE_DISCLAIMER].join("\n");
}

/** The scripted tutor used when no DEEPSEEK_API_KEY is configured. */
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
