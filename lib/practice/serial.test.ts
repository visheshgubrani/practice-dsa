import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSerialQueue } from "@/lib/practice/serial";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("createSerialQueue", () => {
  it("coalesces a burst into a single send before anything is in flight", async () => {
    const sent: number[] = [];
    const queue = createSerialQueue(async (value: number) => {
      sent.push(value);
    });

    await Promise.all([queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)]);
    assert.deepEqual(sent, [3]);
  });

  it("sends the in-flight payload, then only the latest queued one", async () => {
    const sent: number[] = [];
    const first = deferred<void>();
    const started = deferred<void>();

    const queue = createSerialQueue(async (value: number) => {
      sent.push(value);
      if (sent.length === 1) {
        started.resolve();
        await first.promise;
      }
    });

    const run1 = queue.enqueue(1);
    await started.promise;
    const run2 = queue.enqueue(2);
    const run3 = queue.enqueue(3);
    first.resolve();
    await Promise.all([run1, run2, run3]);

    assert.deepEqual(sent, [1, 3]);
  });

  it("merges queued payloads instead of dropping fields", async () => {
    const sent: Array<{ notes: boolean; language: boolean }> = [];
    const first = deferred<void>();
    const started = deferred<void>();

    const queue = createSerialQueue(
      async (value: { notes: boolean; language: boolean }) => {
        sent.push(value);
        if (sent.length === 1) {
          started.resolve();
          await first.promise;
        }
      },
      (pending, next) => ({
        notes: pending.notes || next.notes,
        language: pending.language || next.language,
      }),
    );

    const run1 = queue.enqueue({ notes: true, language: false });
    await started.promise;
    const run2 = queue.enqueue({ notes: false, language: true });
    const run3 = queue.enqueue({ notes: true, language: false });
    first.resolve();
    await Promise.all([run1, run2, run3]);

    assert.deepEqual(sent, [
      { notes: true, language: false },
      { notes: true, language: true },
    ]);
  });
});
