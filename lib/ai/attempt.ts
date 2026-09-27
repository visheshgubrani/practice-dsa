import type { Problem } from "@/lib/problems";

/**
 * A computed read of the editor buffer, attached to the tutor prompt.
 *
 * The buffer itself is already sent verbatim. This block exists because the
 * tutor kept proposing steps the buffer already showed (asking for the chunk
 * format comment that was already written, then asking to amend it). A stated
 * fact is cheaper for the model to follow than re-reading incomplete code, and
 * it is deterministic, so tests can hold it.
 *
 * Advisory only: nothing here reaches judging, and a miss costs specificity in
 * a hint, never a verdict.
 */

export type AttemptMethodState = {
  name: string;
  present: boolean;
  /** True when the body is missing, blank, comment-only, or a bare `pass`. */
  emptyBody: boolean;
};

export const ATTEMPT_STATE_HEADER =
  "Attempt state (computed by the app from the buffer — advisory. \"defined; body has statements\" only means the body is not empty; it does not mean the method is implemented or understood. Use it to avoid re-asking for code already in the buffer. Never read this block back):";

/** The methods this problem expects the buffer to define, in prompt order. */
export function expectedMethods(problem: Problem): string[] {
  const names: string[] = [];
  const calls = problem.signature.calls;
  const trip = problem.signature.roundTrip;

  if (calls) {
    names.push("__init__", ...Object.keys(calls.methods));
  } else if (trip) {
    names.push(trip.encode, trip.decode);
  } else {
    names.push(problem.signature.name);
  }

  return names.filter((name, index) => names.indexOf(name) === index);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Leading-whitespace width, with tabs counted as four columns. */
function indentWidth(line: string): number {
  const leading = line.slice(0, line.length - line.trimStart().length);
  return leading.replace(/\t/g, "    ").length;
}

/**
 * The shallowest `def <name>(` in the buffer. A nested helper (`def dfs`) sits
 * deeper, so it is never mistaken for the method the problem asks for.
 */
function findDef(
  lines: readonly string[],
  name: string,
): { indent: number; line: number } | null {
  const pattern = new RegExp(`^([ \\t]*)def[ \\t]+${escapeRegExp(name)}[ \\t]*\\(`);
  let best: { indent: number; line: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const match = pattern.exec(lines[index] ?? "");
    if (!match) continue;
    const indent = indentWidth(match[1] ?? "");
    if (best === null || indent < best.indent) best = { indent, line: index };
  }

  return best;
}

/** Comments and a bare `pass` are not work; anything else in the body is. */
function bodyHasStatements(
  lines: readonly string[],
  def: { indent: number; line: number },
): boolean {
  for (let index = def.line + 1; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    if (raw.trim().length === 0) continue;
    if (indentWidth(raw) <= def.indent) break;
    const trimmed = raw.trim();
    if (trimmed.startsWith("#") || trimmed === "pass") continue;
    return true;
  }
  return false;
}

export function attemptState(
  source: string,
  problem: Problem,
): AttemptMethodState[] {
  const lines = source.split("\n");
  return expectedMethods(problem).map((name) => {
    const def = findDef(lines, name);
    if (def === null) return { name, present: false, emptyBody: true };
    return { name, present: true, emptyBody: !bodyHasStatements(lines, def) };
  });
}

/**
 * The prompt block, or `null` when there is nothing to report: a blank buffer,
 * or one that defines none of the methods this problem asks for.
 */
export function describeAttemptState(
  source: string,
  problem: Problem,
): string | null {
  if (source.trim().length === 0) return null;

  const state = attemptState(source, problem);
  if (state.every((entry) => !entry.present)) return null;

  return [
    ATTEMPT_STATE_HEADER,
    ...state.map((entry) => {
      if (!entry.present) return `- ${entry.name}: not defined in the buffer`;
      return entry.emptyBody
        ? `- ${entry.name}: defined; body is empty`
        : `- ${entry.name}: defined; body has statements`;
    }),
  ].join("\n");
}
