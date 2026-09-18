#!/usr/bin/env node

/**
 * Installs the language runtimes the app can run, and prints the version it got.
 *
 * Piston ships no runtimes in its image: they are downloaded into the
 * `piston_data` volume on demand, which is why `pnpm db:up` alone leaves the
 * engine unable to run anything. Run this once (and again after wiping the
 * volume).
 *
 * Package names are not always language names — the `gcc` package provides
 * `c++`, and the `node` package provides `javascript` — so each entry below
 * states which package supplies which language, and the version the engine will
 * then accept in POST /api/v2/execute.
 *
 * One entry per language in `lib/languages.ts`, which is the set the app can
 * actually judge. Installing a runtime nothing can call would only take disk.
 *
 * Runtimes are read once, when the API starts, so installing one is not visible
 * to `GET /api/v2/runtimes` until the container restarts. This script installs
 * through the container's own CLI (`cli/index.js ppman`), which is what the
 * Piston docs recommend, and then prints the exact restart command.
 *
 * Usage: pnpm piston:runtimes
 */

import { execFileSync } from "node:child_process";

const PORT = process.env.PISTON_PORT ?? "2001";
const BASE = process.env.PISTON_URL ?? `http://127.0.0.1:${PORT}`;
const CONTAINER = process.env.PISTON_CONTAINER ?? "dsa-software-dev-piston-1";

/**
 * One entry per language the app offers (`lib/languages.ts`), plus the package
 * that supplies it. `version` is a SemVer selector: the newest match wins.
 */
const WANTED = [
  // `python` is both the package name and the language name, which is the
  // exception rather than the rule.
  { language: "python", pkg: "python", version: "3.12.0" },
];
async function listRuntimes() {
  const response = await fetch(`${BASE}/api/v2/runtimes`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GET /runtimes failed (${response.status})`);
  return response.json();
}

function describe(error) {
  if (!(error instanceof Error)) return String(error);
  if (error.cause instanceof Error) return `${error.message} (${error.cause.message})`;
  return error.message;
}

/**
 * Installs through the container's CLI rather than `POST /api/v2/packages`.
 * Both write the same files, but the CLI is interactive-safe and streams the
 * download progress of the larger packages (python is ~200 MB) to this process
 * instead of holding a request open.
 */
function install(pkg, version) {
  // `cli/index.js` is not executable in the image, so it is run through node.
  const output = execFileSync(
    "docker",
    ["exec", CONTAINER, "node", "cli/index.js", "ppman", "install", `${pkg}=${version}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15 * 60_000 },
  );
  return output.trim();
}

async function main() {
  console.log(`Piston at ${BASE} (container ${CONTAINER})`);

  let installed;
  try {
    installed = await listRuntimes();
  } catch (error) {
    throw new Error(
      `${describe(error)}\n` +
        `Is the engine running? Start it with: pnpm db:up`,
    );
  }

  const have = new Map(installed.map((entry) => [entry.language, entry.version]));
  let changed = false;

  for (const wanted of WANTED) {
    if (have.has(wanted.language)) {
      console.log(`  ok        ${wanted.language} ${have.get(wanted.language)}`);
      continue;
    }

    console.log(`  install   ${wanted.language} ${wanted.version} (package ${wanted.pkg})`);
    try {
      install(wanted.pkg, wanted.version);
    } catch (error) {
      throw new Error(
        `Could not install ${wanted.pkg}=${wanted.version} (${wanted.language}): ` +
          `${describe(error)}`,
      );
    }
    changed = true;
  }

  if (!changed) {
    console.log("\nEvery language is installed. Nothing to do.");
    return;
  }

  // The API reads the packages directory once at start-up, so the language is
  // still absent from /runtimes until the process is restarted.
  console.log(
    `\nInstalled. Restart the engine so it re-reads its packages:\n` +
      `  docker compose -f docker-compose.dev.yml restart piston\n` +
      `Then verify with: pnpm piston:check`,
  );
}

main().catch((error) => {
  console.error(`\n${describe(error)}`);
  process.exitCode = 1;
});
