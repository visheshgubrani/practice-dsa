import {
  buildTutorTeachingInstructions,
  type AssembledTutorTurn,
} from "./prompts";
import { PREVIOUS_TUTOR_INSTRUCTIONS } from "./previous-prompts";
import type { Problem } from "@/lib/problems";

/** Known factual regressions; these are correctness checks, not style scores. */
export function tutorFactFailure(problem: Problem, editor: string, user: string, text: string): string | null {
  if (problem.slug === "valid-parentheses" && /count[^.\n]{0,50}(?:each|type)/i.test(user)) {
    const badCounterexample = text.split(/(?<=[.!?])\s+/).some((sentence) =>
      sentence.includes("(]") && /counts?[^.\n]{0,40}(?:look balanced|are balanced|match|equal)/i.test(sentence),
    );
    if (badCounterexample) return "used unequal per-type counts as an equal-count counterexample";
  }
  if (problem.slug === "encode-and-decode-strings" &&
      /while s\[j\] != ["']#["']:\s*\n\s+j \+= 1/.test(editor) &&
      /loop[^.!?\n]{0,40}(?:needs|missing|has no)[^.!?\n]{0,20}(?:a )?body/i.test(text)) {
    return "invented a missing body for a loop that already has one";
  }
  for (const match of text.matchAll(/(?:statement|official) example\s+`(\[[^`\n]+\])`/gi)) {
    const input = match[1]!.replace(/\s+/g, "");
    if (!problem.examples.some((example) => example.input.replace(/\s+/g, "").includes(input))) {
      return "attributed a modified input to an official example";
    }
  }
  return null;
}

/** Evaluation only: replace teaching rules, retaining public context and limits. */
export function previousContractTurn(turn: AssembledTutorTurn): AssembledTutorTurn {
  const teaching = buildTutorTeachingInstructions();
  if (!turn.instructions.startsWith(teaching)) throw new Error("Unexpected tutor contract");
  return {
    ...turn,
    instructions: PREVIOUS_TUTOR_INSTRUCTIONS + turn.instructions.slice(teaching.length),
  };
}

/** Scenario-specific disclosure checks complement, rather than score, hand review. */
export function decoderBoundaryFailure(
  turnId: string,
  text: string,
  editor = "",
): string | null {
  const conversion = /(?:length|size|n)\s*=\s*int\(/i.test(text);
  const extraction = /(?:s|encoded)\s*\[[^\]\n]+:[^\]\n]+\]/i.test(text);
  const append = /\.append\(/i.test(text);
  const withoutExistingAssignments = text.replace(/`([^`\n]+)`/g, (quote, code: string) =>
    /\w+\s*=/.test(code) && editor.replace(/\s+/g, "").includes(code.replace(/\s+/g, "")) ? "[existing editor line]" : quote,
  );
  const advancePattern = /\bi\s*(?:\+=|=\s*(?:end|start|j\s*\+|i\s*\+))|\b(?:advance|move|jump|update|shift|set)\b[^.\n]{0,40}\b(?:`?i`?|cursor|pointer)\b|\b(?:`?i`?|cursor|pointer)\b[^.\n]{0,25}\b(?:forward|past|advance|move|jump)\b/i;
  const advance = withoutExistingAssignments.split(/(?<=[.!?])\s+|\n+/).some((sentence) => {
    // Reporting what the current buffer already did is evidence, not a new step.
    const reportsExistingMove = /\bi\s*=\s*j\s*\+\s*1\b/.test(editor) &&
      /\b(?:your|the|current) (?:code|editor)\b[^.]{0,40}\balready\b/i.test(sentence) &&
      /\b(?:moved|advanced|shifted)\b[^.]{0,30}\bi\b[^.]{0,30}(?:#|separator)/i.test(sentence) &&
      !/\b(?:now|next|then|should|must|need|will)\b/i.test(sentence);
    return !reportsExistingMove && advancePattern.test(sentence);
  });
  if (turnId === "like-this" && (conversion || append || advance)) {
    return "digit-scan clarification supplied later decoder operations";
  }
  if (turnId === "append-length" && advance) {
    return "append clarification supplied cursor advancement";
  }
  if (turnId === "append-length" && /```/.test(text)) {
    return "conceptual append clarification supplied code";
  }
  if (turnId === "what-now" && [conversion, extraction, append, advance].filter(Boolean).length >= 3) {
    return "hint supplied the remaining decoder implementation";
  }
  return null;
}
