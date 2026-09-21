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
  if (disclosed.hidden && disclosed.status !== "accepted") {
    lines.push(
      "This hidden case is revealed because it is the first failure. It is a real judge case, not an illustration.",
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
    "- Be a guide, not a solution printer. Give the smallest useful nudge for the question asked.",
    "- Never paste a complete working solution unless the user explicitly asks for the full solution.",
    "- Prefer concrete reasoning about the user's own code over generic advice.",
    "- Answer in the language shown below; if the user writes in another programming language, respect it.",
    "- Keep replies under about 150 words unless the user asks for depth.",
    "- Wrap any code in fenced blocks with a language tag, and keep snippets short.",
    "- If the user's approach cannot work, say so plainly in one sentence and say why.",
    "- Do not invent constraints. Stay consistent with the statement and constraints below.",
    "- You may invent small illustrative inputs to explain an idea. Always label them as your own examples. Never present invented inputs as official examples, catalog tests, or judge cases.",
    "- You have the app's approach notes, not the reference-solution source. Do not quote a canonical implementation unless the user asks for a full solution.",
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
      "The editor has changed since this result. Tutor against the submission source below when the user is asking about that attempt; use the editor buffer when they are asking about the new draft.",
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

/**
 * The exact prompt payload `/api/chat` sends to the model: bounded stored
 * history plus disclosed submission context. Tests assert against this rather
 * than reconstructing the route.
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
  const prompt = buildTutorPrompt({
    problem: input.problem,
    language: input.language,
    editorCode: input.editorCode,
    submission: input.submission,
    runSummary: input.submission ? null : (input.runSummary ?? null),
    conversationTruncated: history.truncated,
    omittedTurns: history.omitted,
  });
  return {
    instructions: prompt.instructions,
    messages: history.messages,
    truncated: prompt.truncated,
    omittedTurns: history.omitted,
  };
}

export function buildTutorPrompt(input: {
  problem: Problem;
  language: Language;
  editorCode: string;
  submission?: SubmissionDetail | null;
  runSummary?: string | null;
  conversationTruncated?: boolean;
  omittedTurns?: number;
}): { instructions: string; truncated: boolean } {
  const workspace = buildWorkspaceContext({
    language: input.language,
    editorCode: input.editorCode,
    submission: input.submission,
    runSummary: input.runSummary,
  });

  const notes: string[] = [];
  if (workspace.truncated) {
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
    workspace.text,
    notes.length > 0
      ? ["Context budget:", ...notes.map((note) => `- ${note}`)].join("\n")
      : "",
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");

  return {
    instructions,
    truncated: workspace.truncated || Boolean(input.conversationTruncated),
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
    prompt: ({ problem }) =>
      `Give me one hint for "${problem.title}" that moves me forward without revealing the solution.`,
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
      `Review my current ${language.label} code for correctness and edge cases. Point out bugs and name the failing input shape, but don't rewrite it for me.`,
  },
  {
    id: "debug",
    label: "Why is this failing?",
    prompt: () =>
      "Look at the test result attached to this conversation and explain what my code does wrong on that case. Don't give me the fixed code.",
  },
] as const;

/** The scripted tutor used when no DEEPSEEK_API_KEY is configured. */
export function buildDemoAnswer(input: {
  question: string;
  problem: Problem;
  language: Language;
}): string {
  const { question, problem, language } = input;
  const lower = question.toLowerCase();

  if (lower.includes("complexity")) {
    return [
      `For **${problem.title}**, the reference solution runs in \`${problem.notes.timeComplexity}\` time and \`${problem.notes.spaceComplexity}\` space.`,
      "",
      "Why that is the floor: you have to look at every element at least once, so the time cannot drop below linear. The extra space is what buys you that single pass — drop it and you are back to a quadratic scan or a sort.",
      "",
      "This answer is scripted: set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.",
    ].join("\n");
  }

  if (lower.includes("fail") || lower.includes("wrong")) {
    return [
      "The failing case is usually the one where your early exit fires too early or the accumulator is never reset between inputs.",
      "",
      "Trace that one input by hand, writing down the variables after each loop iteration. The first iteration where your trace disagrees with the expected output is the bug — everything after it is noise.",
      "",
      "This answer is scripted: set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.",
    ].join("\n");
  }

  if (lower.includes("review")) {
    return [
      `Three things I check first in a ${language.label} submission:`,
      "",
      "1. The empty and single-element inputs — most index arithmetic breaks there.",
      "2. Whether the loop can terminate without ever touching the last element.",
      "3. Whether the result is built in the order the problem expects.",
      "",
      "Line up your code against those three and the bug usually shows itself.",
      "",
      "This answer is scripted: set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.",
    ].join("\n");
  }

  return [
    `A nudge for **${problem.title}**: ${problem.notes.approach}`,
    "",
    `Start from the brute-force pass in \`O(n²)\`, then ask which piece of information you are recomputing. Caching exactly that piece is what gets you to \`${problem.notes.timeComplexity}\`.`,
    "",
    "This answer is scripted: set `DEEPSEEK_API_KEY` in `.env.local` and restart to talk to the real tutor.",
  ].join("\n");
}
