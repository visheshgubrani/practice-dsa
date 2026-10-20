/**
 * Re-arm a callback at the next local midnight.
 *
 * The coach's "today" is the browser's calendar day. A dashboard left open
 * overnight must not keep showing yesterday's plan, so the hook uses this
 * rather than relying on focus. `setHours(24)` follows the browser's local
 * clock, including a DST transition.
 */
export function scheduleLocalMidnight(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const arm = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const remaining = next.getTime() - now.getTime() + 1_000;
    const delay = Math.max(0, Math.min(remaining, 2_147_483_647));
    timer = setTimeout(() => {
      arm();
      onChange();
    }, delay);
  };

  arm();
  return () => clearTimeout(timer);
}
