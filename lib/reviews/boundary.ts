/** Browser timers cap delays at about 25 days; FSRS intervals can be years. */
export function scheduleReviewBoundary(
  dueAt: string,
  onDue: () => void,
): () => void {
  const target = Date.parse(dueAt) + 50;
  if (!Number.isFinite(target)) return () => {};
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const remaining = target - Date.now();
    timer = setTimeout(() => {
      if (Date.now() >= target) onDue();
      else arm();
    }, Math.max(0, Math.min(remaining, 2_147_483_647)));
  };
  arm();
  return () => clearTimeout(timer);
}
