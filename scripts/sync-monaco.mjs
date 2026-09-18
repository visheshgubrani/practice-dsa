#!/usr/bin/env node
/**
 * Copies Monaco's AMD build out of the installed `monaco-editor` package into
 * `public/monaco/vs`, where the editor's loader fetches it at runtime.
 *
 * Why a copy instead of a bundler plugin: Next 16 uses Turbopack by default and
 * monaco-editor-webpack-plugin is webpack-only. Serving the prebuilt AMD bundle
 * keeps the editor offline-capable and pinned to the installed version, with no
 * bundler configuration at all.
 *
 * Runs from `pnpm dev` and `pnpm build`, and skips the copy when the version
 * stamp already matches.
 *
 * Note: `monaco-editor`'s exports map does not expose its own package.json, so
 * the package is located through node_modules rather than require.resolve.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(root, "node_modules", "monaco-editor");
const source = path.join(packageDir, "min", "vs");
const target = path.join(root, "public", "monaco", "vs");
const stampFile = path.join(root, "public", "monaco", ".version");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readStamp() {
  try {
    return (await readFile(stampFile, "utf8")).trim();
  } catch {
    return null;
  }
}

async function main() {
  let version;
  try {
    ({ version } = await readJson(path.join(packageDir, "package.json")));
  } catch {
    throw new Error(
      `monaco-editor not found at ${packageDir} — run your package manager's install first.`,
    );
  }

  if ((await readStamp()) === version) {
    console.log(`[monaco] public/monaco/vs already at ${version}`);
    return;
  }

  console.log(`[monaco] copying node_modules/monaco-editor/min/vs -> public/monaco/vs`);
  await rm(path.join(root, "public", "monaco"), { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  await writeFile(stampFile, `${version}\n`, "utf8");
  console.log(`[monaco] done (monaco-editor ${version})`);
}

main().catch((error) => {
  console.error("[monaco] sync failed:", error.message);
  process.exit(1);
});
