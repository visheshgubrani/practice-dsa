#!/usr/bin/env node
/**
 * Compact diagnostic summary of two recorded tutor evaluations.
 *
 * This is an analysis aid for hand review, not a teaching-quality score. It
 * prints, per conversation turn, the sizes and the few structural facts a
 * reviewer wants side by side (did it paste a whole method, did it name a tool,
 * how long was it) plus every recorded miss.
 *
 * Usage: tsx scripts/eval-compare.mts <baseline.json> <revised.json>
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

type Turn = {
  id: string;
  user: string;
  text: string;
  latencyMs: number;
  grade: { satisfactory: boolean; hardFails: string[]; misses: string[] };
};

type Run = { id: string; purpose: string; run: number; turns: Turn[] };

type EvalFile = {
  model: string;
  problemContextSha256: Record<string, string>;
  label: string;
  generatedAt: string;
  keywordLog: { clean: number; total: number };
  hardFails: number;
  runs: Run[];
};

function load(file: string): EvalFile {
  return JSON.parse(
    readFileSync(path.resolve(process.cwd(), file), "utf8"),
  ) as EvalFile;
}

function facts(text: string): string {
  const fences = text.match(/```/g)?.length ?? 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  const named = [
    /hash ?map|dict|dictionary/i.test(text) ? "map" : null,
    /stack/i.test(text) ? "stack" : null,
    /enumerate/i.test(text) ? "enumerate" : null,
    /complement/i.test(text) ? "complement" : null,
  ].filter(Boolean);
  const question = /\?\s*$/.test(text.trim()) ? "q" : "-";
  return [
    `${String(words).padStart(3)}w`,
    `${String(text.length).padStart(4)}c`,
    fences > 0 ? `${fences / 2}code` : "nocode",
    question,
    named.length > 0 ? named.join("+") : "tool-",
  ].join(" ");
}

function bySpec(file: EvalFile): Map<string, Map<number, Turn[]>> {
  const specs = new Map<string, Map<number, Turn[]>>();
  for (const run of file.runs) {
    const runs = specs.get(run.id) ?? new Map<number, Turn[]>();
    runs.set(run.run, run.turns);
    specs.set(run.id, runs);
  }
  return specs;
}

function main(): void {
  const [baselinePath, revisedPath] = process.argv.slice(2);
  if (!baselinePath || !revisedPath) {
    throw new Error("usage: tsx scripts/eval-compare.mts <a.json> <b.json>");
  }
  const baseline = load(baselinePath);
  const revised = load(revisedPath);
  assert.ok(baseline.problemContextSha256 && revised.problemContextSha256, "Context parity was not recorded; rerun both contracts before comparing.");
  assert.deepEqual(baseline.problemContextSha256, revised.problemContextSha256, "Comparison requires identical public problem context.");
  assert.equal(baseline.model, revised.model, "Comparison requires the same configured model.");
  console.log("Verified: identical model and public problem context.");

  console.log(
    `${baseline.label}: keyword ${baseline.keywordLog.clean}/${baseline.keywordLog.total}, hard fails ${baseline.hardFails}`,
  );
  console.log(
    `${revised.label}: keyword ${revised.keywordLog.clean}/${revised.keywordLog.total}, hard fails ${revised.hardFails}`,
  );

  const before = bySpec(baseline);
  const after = bySpec(revised);

  for (const [spec, runs] of after) {
    console.log(`\n=== ${spec}`);
    const turnIds = [...new Set([...runs.values()].flat().map((t) => t.id))];
    for (const turnId of turnIds) {
      console.log(`  -- ${turnId}`);
      for (let run = 1; run <= 3; run += 1) {
        const beforeTurn = before.get(spec)?.get(run)?.find((t) => t.id === turnId);
        const afterTurn = runs.get(run)?.find((t) => t.id === turnId);
        if (beforeTurn) {
          console.log(`     was ${facts(beforeTurn.text)}  ${beforeTurn.grade.misses.join("; ") || "clean"}`);
        }
        if (afterTurn) {
          console.log(`     now ${facts(afterTurn.text)}  ${afterTurn.grade.misses.join("; ") || "clean"}`);
        }
      }
    }
  }
}

main();
