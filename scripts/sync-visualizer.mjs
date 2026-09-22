#!/usr/bin/env node
/**
 * Copies the vendored Python Tutor browser assets from `vendor/python-tutor`
 * into `public/vendor/python-tutor`, where the Visualize tab's iframe loads
 * them.
 *
 * The same shape as `scripts/sync-monaco.mjs`: a copy with a stamp, so
 * re-vendoring is one edit to `vendor/python-tutor/VERSION` and the assets move
 * on the next `pnpm dev` / `pnpm build`. Nothing here downloads anything — the
 * vendored files are committed, so the app stays offline-capable.
 *
 * The two tracer `.py` files are deliberately *not* copied: the API sends them
 * to Piston straight out of `vendor/python-tutor`, which keeps the committed
 * source of truth in one place and keeps the tracer off the HTTP surface.
 */
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "vendor", "python-tutor");
const targetDir = path.join(root, "public", "vendor", "python-tutor");
const stampFile = path.join(targetDir, ".version");

const FILES = ["pytutor-embed.bundle.js", "pytutor.css", "frame.html"];

/**
 * The stamp covers the version *and* the copied set, so adding or removing a
 * file re-copies even when the vendored version has not moved.
 */
async function stamp(version) {
  const hash = createHash("sha256").update(version);
  for (const file of FILES) {
    const info = await stat(path.join(sourceDir, file));
    hash.update("\u0000").update(file).update("\u0000").update(String(info.size));
  }
  return `${version.split("@")[0]}@${hash.digest("hex").slice(0, 16)}`;
}

async function main() {
  const version = (await readFile(path.join(sourceDir, "VERSION"), "utf8")).trim();
  if (!version) {
    throw new Error(`${sourceDir}/VERSION is empty.`);
  }

  let expected;
  try {
    expected = await stamp(version);
  } catch (error) {
    throw new Error(
      `A vendored file is missing from ${path.relative(root, sourceDir)}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
  }

  try {
    if ((await readFile(stampFile, "utf8")).trim() === expected) {
      console.log(`[visualizer] public/vendor/python-tutor already at ${expected}`);
      return;
    }
  } catch {
    // No stamp yet: copy below.
  }

  console.log(
    `[visualizer] copying ${path.relative(root, sourceDir)} -> ${path.relative(root, targetDir)}`,
  );
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  for (const file of FILES) {
    await cp(path.join(sourceDir, file), path.join(targetDir, file));
  }
  await writeFile(stampFile, `${expected}\n`, "utf8");
  console.log(`[visualizer] done (${expected})`);
}

await main();
