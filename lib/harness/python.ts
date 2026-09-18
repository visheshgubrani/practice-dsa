import type { ProblemSignature } from "@/lib/problems";

/**
 * Turns the editor's buffer into a complete, runnable Python program.
 *
 * The editor holds a bare function — LeetCode's shape, where the user writes
 * `class Solution: def twoSum(...)` and the site supplies the rest. Piston can
 * only run programs, so something has to write that rest. This module is it: a
 * prelude, the user's source verbatim, then a harness that reads a JSON
 * argument array from stdin, calls the signature's method directly, and prints
 * the result as JSON. User `print()` is captured during the call and emitted
 * above that JSON line, so debug text cannot corrupt comparison.
 *
 * Two consequences worth stating plainly:
 *
 *   - The user's source is never rewritten, only surrounded. Every line number a
 *     traceback names is the editor's own, because nothing is inserted between
 *     the editor's lines except the prelude above them.
 *   - Nothing here is per-problem. Every problem supplies the same thing — a
 *     `ProblemSignature` — and the harness is generated from it, so a new problem
 *     needs no new plumbing.
 */

export type Program = {
  /** The file Piston executes. */
  source: string;
  /**
   * The base name to submit, with no extension: Piston appends the one its
   * runtime wants, and passing "main.py" produces a file called `main.py.py`
   * whose tracebacks name the wrong file.
   */
  fileName: string;
};

/**
 * What the starter templates expect to exist.
 *
 * LeetCode injects these; a terminal does not. Without them the untouched
 * starter for `two-sum` fails on `List[int]` rather than on the missing
 * implementation, which is a confusing first error.
 */
export const PYTHON_PRELUDE = [
  "# ---- runner prelude (added by the app; your code is below, unchanged) ----",
  "import sys, json, math, bisect, heapq, itertools, functools, collections, re, string",
  "from typing import *",
  "from collections import defaultdict, Counter, deque, OrderedDict",
  "",
].join("\n");

/**
 * The harness's own scaffolding.
 *
 * `_runner_fail` is what reports a broken *testcase* — one the seed script
 * should have rejected before it ever reached the database. It exits non-zero so
 * the case becomes a runtime error rather than a silent wrong answer, and its
 * `runner:` prefix is what makes clear the fault is the app's, not the
 * solution's.
 */
const HARNESS_HEADER = [
  "# ---- runner harness (added by the app) ----",
  "import io",
  "def _runner_fail(message):",
  '    sys.stderr.write(f"runner: {message}\\n")',
  "    raise SystemExit(2)",
  "",
  "def _runner_emit(debug, encoded):",
  "    if debug:",
  '        sys.stdout.write(debug if debug.endswith("\\n") else debug + "\\n")',
  "    sys.stdout.write(encoded)",
  "",
  "",
].join("\n");

export function buildPythonProgram(
  source: string,
  signature: ProblemSignature,
): Program {
  const arity = signature.params.length;
  const call = `Solution().${signature.name}(*_args)`;

  const lines: string[] = [];

  lines.push("def _runner_main():");
  lines.push("    try:");
  lines.push("        _args = json.loads(sys.stdin.read())");
  lines.push("    except json.JSONDecodeError as _error:");
  lines.push('        _runner_fail(f"stdin is not JSON: {_error}")');
  lines.push("    if not isinstance(_args, list):");
  lines.push(
    '        _runner_fail(f"stdin is not a JSON array: {type(_args).__name__}")',
  );
  lines.push(`    if len(_args) != ${arity}:`);
  lines.push(
    `        _runner_fail(f"expected ${arity} arguments, got {len(_args)}")`,
  );
  lines.push("");
  lines.push("    _debug_buf = io.StringIO()");
  lines.push("    _old_stdout = sys.stdout");
  lines.push("    sys.stdout = _debug_buf");
  lines.push("    try:");
  lines.push("        try:");
  if (signature.returns === "void") {
    lines.push(`            ${call}`);
    lines.push("            _encoded = 'null\\n'");
  } else {
    lines.push(`            _result = ${call}`);
    lines.push(
      '            _encoded = json.dumps(_result, separators=(",", ":")) + "\\n"',
    );
  }
  lines.push("        finally:");
  lines.push("            sys.stdout = _old_stdout");
  lines.push("        _runner_emit(_debug_buf.getvalue(), _encoded)");
  lines.push("    except SystemExit:");
  lines.push("        raise");
  lines.push(
    "    except BaseException as _error:  # the console shows this as the verdict",
  );
  lines.push("        _debug = _debug_buf.getvalue()");
  lines.push("        if _debug:");
  lines.push(
    '            sys.stderr.write(_debug if _debug.endswith("\\n") else _debug + "\\n")',
  );
  lines.push('        sys.stderr.write(f"{type(_error).__name__}: {_error}\\n")');
  lines.push("        raise SystemExit(1)");
  lines.push("");
  lines.push("");
  lines.push('if __name__ == "__main__":');
  lines.push("    _runner_main()");
  lines.push("");

  // The prelude, then the user's source untouched, then the harness.
  //
  // The blank line before the harness is load-bearing, not cosmetic: an editor
  // buffer that ends in an indented blank line — which is exactly what the
  // starter templates do, since they invite the body to be filled in — would
  // otherwise attach the harness's first line to the user's last block and
  // produce an `IndentationError` in code the user never wrote.
  const program =
    PYTHON_PRELUDE +
    source +
    (source.endsWith("\n") ? "" : "\n") +
    "\n" +
    HARNESS_HEADER +
    lines.join("\n");

  return { source: program, fileName: "main" };
}
