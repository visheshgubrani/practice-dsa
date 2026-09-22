import assert from "node:assert/strict";
import { after, describe, it, mock } from "node:test";

import {
  cacheKey,
  clearCache,
  execute,
  forgetRuntimes,
  listRuntimes,
} from "@/lib/piston/client";
import { RunnerError } from "@/lib/runner/errors";

describe("listRuntimes", () => {
  after(() => {
    mock.restoreAll();
    forgetRuntimes();
  });

  it("throws when the execution engine is unavailable", async () => {
    forgetRuntimes();
    mock.method(
      globalThis,
      "fetch",
      async () => {
        throw new TypeError("fetch failed");
      },
    );

    await assert.rejects(
      () => listRuntimes(),
      (error: unknown) => {
        assert.ok(error instanceof RunnerError);
        assert.match(error.message, /not reachable/);
        return true;
      },
    );
  });
});

const REQUEST = {
  language: "python",
  source: "print(1)",
  fileName: "main",
  stdin: "[]",
  runMs: 2000,
  compileMs: 20_000,
  memoryBytes: 256 * 1024 * 1024,
} as const;

const OPTIONS = {
  timeoutMs: 5000,
  concurrency: 4,
  queueLimit: 64,
} as const;

const RUN_TIMES = [{ language: "python", version: "3.12.0", aliases: ["py"] }];
const EXECUTED = {
  language: "python",
  version: "3.12.0",
  run: { stdout: "TRACE []\n", code: 0 },
};

/** Answers the runtime list and the execute call, capturing the job bodies. */
function mockEngine(bodies: unknown[]): void {
  forgetRuntimes();
  clearCache();
  mock.method(globalThis, "fetch", async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const payload = url.includes("/api/v2/runtimes") ? RUN_TIMES : EXECUTED;
    if (!url.includes("/api/v2/runtimes") && init?.body) {
      bodies.push(JSON.parse(String(init.body)));
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("execute with extra files", () => {
  after(() => {
    mock.restoreAll();
    clearCache();
    forgetRuntimes();
  });

  it("sends the entry file first, then each extra file", async () => {
    const bodies: Array<{ files: Array<{ name: string }> }> = [];
    mockEngine(bodies);

    await execute(
      {
        ...REQUEST,
        extraFiles: [
          { name: "pg_logger.py", content: "# logger" },
          { name: "pg_encoder.py", content: "# encoder" },
        ],
      },
      OPTIONS,
    );

    assert.deepEqual(
      bodies[0]?.files.map((file) => file.name),
      ["main", "pg_logger.py", "pg_encoder.py"],
    );
  });

  it("keys the cache on the extra files, so two jobs cannot collide", () => {
    const base = cacheKey(REQUEST);
    const withTracer = cacheKey({
      ...REQUEST,
      extraFiles: [{ name: "pg_logger.py", content: "# logger" }],
    });
    const withOtherTracer = cacheKey({
      ...REQUEST,
      extraFiles: [{ name: "pg_logger.py", content: "# different" }],
    });

    assert.notEqual(base, withTracer);
    assert.notEqual(withTracer, withOtherTracer);
  });

  it("repeats a job only when the cache is asked for", async () => {
    const bodies: unknown[] = [];
    mockEngine(bodies);

    await execute(REQUEST, OPTIONS);
    await execute(REQUEST, OPTIONS);
    assert.equal(bodies.length, 1, "a repeat should be served from the cache");

    await execute(REQUEST, { ...OPTIONS, cache: false });
    assert.equal(bodies.length, 2, "cache: false should reach the engine");
  });
});
