import assert from "node:assert/strict";
import { after, describe, it, mock } from "node:test";

import { forgetRuntimes, listRuntimes } from "@/lib/piston/client";
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
