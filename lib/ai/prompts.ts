import type { TutorUIMessage } from "@/lib/chat/types";
import { messageText } from "@/lib/chat/messages";
import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";
import type { CaseResult } from "@/lib/runner/types";
import type { SubmissionDetail } from "@/lib/submissions/types";

/** Chat context is capped so a long file can't crowd out the problem itself. */
export const CODE_CONTEXT_LIMIT = 6000;
export const CASE_FIELD_LIMIT = 2000;
export const CONVERSATION_CHAR_LIMIT = 16_000;
export const CONVERSATION_MESSAGE_LIMIT = 16;

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

function signatureLine(problem: Problem): string {
  const params = problem.signature.params
    .map((param) => `${param.name}: ${param.kind}`)
    .join(", ");
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
  const fields: Array<[string, string | undefined]> = [
    ["Input", disclosed.input],
    ["Expected", disclosed.expected],
    ["Output", disclosed.stdout],
    ["stderr", disclosed.stderr],
    ["debug", disclosed.debug],
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

  const omitted = messages.length - kept.length;
  kept.reverse();
  while (kept[0]?.role === "assistant") kept.shift();

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
    "You help one developer understand and solve the problem currently open in the workspace.",
    "",
    "How to answer:",
    "- Be a guide, not a solution printer. Identify one relevant issue or unfinished step in the attached code, explain why it matters for the question asked, and suggest a small next action. Do not skip ahead to later parts of the algorithm.",
    "- Never paste a complete working solution unless the user explicitly asks for the full solution.",
    "- Ground the reply in the attached editor. If a referenced submission is attached and the editor has changed, tutor against the submission when they ask about that result, and against the editor when they ask about the new draft.",
    "- Treat incomplete or syntactically unfinished code as work in progress. Mention syntax only when it blocks the requested task or explains an actual execution failure.",
    "- If earlier turns show they are still stuck on the same point, make the next hint more specific: point at a concrete place in the attached code and the question they should ask next. Do not repeat prior advice. Name the next missing idea, not the rest of the algorithm — no pairing map, complete loop, or working control flow unless they explicitly ask for the full solution.",
    "- Do not use generic praise or unsupported reassurance such as \"exactly right\", \"good start\", or \"you're close\".",
    "- Answer in the language shown below; if the user writes in another programming language, respect it.",
    "- Keep replies under about 150 words unless the user asks for a broader review or more depth.",
    "- Wrap any code in fenced blocks with a language tag, and keep snippets short.",
    "- If the user's approach cannot work, say so plainly in one sentence and say why.",
    "- Do not invent constraints. Stay consistent with the statement and constraints below.",
    "- Attribute examples accurately. Call an attached failure \"the failing test case\" or \"the revealed hidden case\". Call a catalog example \"the statement example\". If you invent a small input, introduce it as \"consider this illustrative input\". Call something \"your example\" only when the user typed that input in the chat. Never present invented inputs as official examples, catalog tests, or judge cases.",
    "- Use an example only when it clarifies the current issue. Do not retrace the same case once it has already been used in this thread.",
    "- You have the app's approach notes, not the reference-solution source. Do not quote a canonical implementation unless the user asks for a full solution.",
    "- The workbench attaches the live editor (and any referenced run) after the user's latest message. That attachment IS their code, even if they did not paste it in the chat. Never say you cannot see their code, and never ask them to paste the editor, when that block is present and the buffer is not empty. Only ask them to paste if the workbench says the buffer is empty.",
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
    "Reference approach and complexity (the app's own notes — stay consistent with these; this is not the solution source):",
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

  const lines: string[] = [];
  const truncated = editor.truncated || Boolean(attempt?.truncated);

  if (submission && editorMatchesAttempt) {
    lines.push(
      "Current editor buffer: identical to the submission source below.",
    );
  } else if (input.editorCode.length === 0) {
    lines.push("Current editor buffer: empty.");
  } else {
    lines.push("The user's current editor buffer:");
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
      "The editor has changed since this result. Tutor against the submission source below when the user is asking about that attempt; use the editor buffer when they are asking about the new draft. Treat the editor as work in progress if it is incomplete.",
    );
  }

  if (attempt) {
    lines.push("");
    lines.push(attempt.text);
  } else if (input.runSummary) {
    lines.push("");
    lines.push("Most recent console summary (no stored submission is attached):");
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
        ? `Earlier conversation turns were omitted (${omitted} messages) to fit the context budget. Answer from the recent thread.`
        : "Some earlier conversation text was truncated to fit the context budget.",
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
      `Look at the ${language.label} code currently in my editor for "${problem.title}". Give me one focused hint: name the issue or unfinished step that matters most, say why, and suggest a small next action. Do not reveal the rest of the solution.`,
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
      `Review the ${language.label} code currently in my editor. You can go into more detail than a hint. Identify issues or unfinished steps, explain why they matter, and suggest small next actions. Don't rewrite the solution for me.`,
  },
  {
    id: "debug",
    label: "Why is this failing?",
    prompt: () =>
      "Look at the attached test result and my current attempt. Explain what this code does wrong on the failing test case. Call it the failing test case, not my example. Don't give me the fixed code.",
  },
] as const;

/** Shown with every scripted reply so demo mode never pretends to have read the attempt. */
export const DEMO_MODE_DISCLAIMER =
  "Demo mode cannot analyse the current attempt. Set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.";

/** The scripted tutor used when no DEEPSEEK_API_KEY is configured. */
export function buildDemoAnswer(input: {
  question: string;
  problem: Problem;
  language: Language;
}): string {
  const { question, problem } = input;
  const lower = question.toLowerCase();

  if (lower.includes("complexity")) {
    return [
      `For **${problem.title}**, the problem notes list \`${problem.notes.timeComplexity}\` time and \`${problem.notes.spaceComplexity}\` space.`,
      "",
      "Demo mode cannot check whether the current attempt meets that.",
      "",
      DEMO_MODE_DISCLAIMER,
    ].join("\n");
  }

  if (lower.includes("fail") || lower.includes("wrong")) {
    return [
      "Demo mode cannot inspect the failing test case or the current attempt, so it cannot say what went wrong.",
      "",
      DEMO_MODE_DISCLAIMER,
    ].join("\n");
  }

  if (lower.includes("review")) {
    return [
      "Demo mode cannot read the editor, so it cannot review this attempt.",
      "",
      DEMO_MODE_DISCLAIMER,
    ].join("\n");
  }

  return [
    `Demo mode cannot see the current editor, so it cannot give a hint for **${problem.title}** that is grounded in this attempt.`,
    "",
    DEMO_MODE_DISCLAIMER,
  ].join("\n");
}
