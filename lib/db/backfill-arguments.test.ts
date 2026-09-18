import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBackfillFailures,
  planTestcaseArgumentBackfill,
  type PendingRow,
} from "@/lib/db/backfill-arguments";
import type { ProblemSignature } from "@/lib/problems";

const TWO_SUM: ProblemSignature = {
  name: "twoSum",
  params: [
    { name: "nums", kind: "int[]" },
    { name: "target", kind: "int" },
  ],
  returns: "int[]",
};

const ECHO: ProblemSignature = {
  name: "echo",
  params: [
    { name: "s", kind: "string" },
    { name: "flag", kind: "bool" },
  ],
  returns: "string[]",
};

const MATRIX: ProblemSignature = {
  name: "dims",
  params: [{ name: "grid", kind: "int[][]" }],
  returns: "int",
};

function row(overrides: Partial<PendingRow> & Pick<PendingRow, "id" | "stdin">): PendingRow {
  return {
    slug: "two-sum",
    number: 1,
    position: 0,
    signature: TWO_SUM,
    ...overrides,
  };
}

describe("planTestcaseArgumentBackfill", () => {
  it("converts existing display stdin into stored arguments", () => {
    const plan = planTestcaseArgumentBackfill([
      row({
        id: "visible",
        stdin: "nums = [2,7,11,15]\ntarget = 9",
      }),
      row({
        id: "escaped",
        slug: "echo",
        number: 2,
        stdin: 's = "say \\"hi\\"\\nnext"\nflag = true',
        signature: ECHO,
      }),
      row({
        id: "matrix",
        slug: "matrix",
        number: 3,
        stdin: "grid = [[1,2],[3,4]]",
        signature: MATRIX,
      }),
    ]);

    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.updates, [
      { id: "visible", args: [[2, 7, 11, 15], 9] },
      { id: "escaped", args: ['say "hi"\nnext', true] },
      { id: "matrix", args: [[[1, 2], [3, 4]]] },
    ]);
  });

  it("is a no-op when every row already has arguments (empty pending set)", () => {
    const plan = planTestcaseArgumentBackfill([]);
    assert.deepEqual(plan, { ok: true, updates: [] });
  });

  it("names every invalid row and applies none of the batch", () => {
    const plan = planTestcaseArgumentBackfill([
      row({
        id: "ok",
        stdin: "nums = [2,7]\ntarget = 9",
      }),
      row({
        id: "parse",
        position: 1,
        stdin: "not an argument list",
      }),
      row({
        id: "kind",
        slug: "echo",
        number: 2,
        stdin: "s = [1,true]\nflag = true",
        signature: ECHO,
      }),
    ]);

    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.equal(plan.failures.length, 2);
    assert.match(plan.failures[0] ?? "", /two-sum \(problem 1\) case 2/);
    assert.match(plan.failures[0] ?? "", /not "name = value"/);
    assert.match(plan.failures[0] ?? "", /stdin: "not an argument list"/);
    assert.match(plan.failures[1] ?? "", /echo \(problem 2\) case 1/);
    assert.match(plan.failures[1] ?? "", /s = \[1,true\] is not string/);
    assert.equal(
      "updates" in plan,
      false,
      "a mixed batch must not return partial updates",
    );

    const message = formatBackfillFailures(plan.failures);
    assert.match(message, /Could not backfill problem_testcases\.arguments \(2 rows\)/);
    assert.match(message, /re-run pnpm db:migrate/);
  });
});
