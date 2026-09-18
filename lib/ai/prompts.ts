import type { Language } from "@/lib/languages";
import type { Problem } from "@/lib/problems";

/** Chat context is capped so a long file can't crowd out the problem itself. */
export const CODE_CONTEXT_LIMIT = 6000;

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
    "- Never invent constraints, examples, or test cases that are not in the problem below.",
    "",
    `Problem: ${problem.number}. ${problem.title} (${problem.difficulty})`,
    `Tags: ${problem.tags.join(", ")}`,
    `Working language: ${language.label}`,
    "",
    "Statement:",
    problem.statement,
    "",
    "Examples:",
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
    "Reference approach and complexity (the app's own notes — stay consistent with these):",
    `- Approach: ${problem.notes.approach}`,
    `- Time: ${problem.notes.timeComplexity}`,
    `- Space: ${problem.notes.spaceComplexity}`,
  ].join("\n");
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
