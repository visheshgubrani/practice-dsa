/**
 * One in-flight write at a time; later calls replace the queued payload so a
 * burst of keystrokes becomes a single request after the current one finishes.
 */
export function createSerialQueue<T>(
  send: (value: T) => Promise<void>,
  merge?: (pending: T, next: T) => T,
) {
  let pending: T | null = null;
  let running = false;
  let chain: Promise<void> = Promise.resolve();

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (pending !== null) {
        const value = pending;
        pending = null;
        await send(value);
      }
    } finally {
      running = false;
    }
  }

  return {
    enqueue(value: T): Promise<void> {
      pending =
        pending !== null && merge ? merge(pending, value) : value;
      chain = chain.then(drain, drain);
      return chain;
    },
  };
}
